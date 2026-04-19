'use client';

import { useCallback, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import {
  CHUNK_SIZE,
  CHUNK_CONCURRENCY,
  CHUNK_INTER_DELAY,
  CHUNK_RETRY_ATTEMPTS,
  CHUNK_RETRY_BASE_DELAY,
  JOB_POLL_INTERVAL,
} from '@/lib/constants';
import type { UploadJob, UploadJobStatus } from '@/lib/types';

export type MovieUploadPhase = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

export interface MovieUploadState {
  phase: MovieUploadPhase;
  /** Upload progress 0-100 (during 'uploading' phase) */
  uploadProgress: number;
  /** Processing progress 0-100 (during 'processing' phase) */
  processProgress: number;
  /** Status label from the job */
  jobStatus: UploadJobStatus | null;
  /** Final movie ID when done */
  movieId: string | null;
  /** Error message */
  error: string | null;
}

const INITIAL_STATE: MovieUploadState = {
  phase: 'idle',
  uploadProgress: 0,
  processProgress: 0,
  jobStatus: null,
  movieId: null,
  error: null,
};

const BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

/** Error thrown when server responds with a specific HTTP status */
class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Upload a single chunk via XHR.
 * Throws HttpError with the response status on non-2xx.
 */
function uploadChunkXHR(
  uploadId: string,
  index: number,
  chunk: Blob,
  token: string | null,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new HttpError(xhr.status, `Chunk ${index} failed: HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.onabort = () => reject(new Error('Aborted'));

    signal.addEventListener('abort', () => xhr.abort());

    const fd = new FormData();
    fd.append('chunk', chunk);

    xhr.open('POST', `${BASE}/api/library/upload/${uploadId}/chunk/${index}`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(fd);
  });
}

/**
 * Upload a chunk with automatic retry and exponential backoff.
 * Retries on 429 (rate limit) and network errors.
 * Does NOT retry on other 4xx errors (bad request, auth, etc.).
 */
async function uploadChunkWithRetry(
  uploadId: string,
  index: number,
  chunk: Blob,
  token: string | null,
  signal: AbortSignal,
): Promise<void> {
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 0; attempt <= CHUNK_RETRY_ATTEMPTS; attempt++) {
    if (signal.aborted) throw new Error('Aborted');

    try {
      await uploadChunkXHR(uploadId, index, chunk, token, signal);
      return; // success
    } catch (err) {
      if (signal.aborted) throw new Error('Aborted');

      lastError = err as Error;
      const isRateLimit = err instanceof HttpError && err.status === 429;
      const isNetworkError = !(err instanceof HttpError);
      const isServerError = err instanceof HttpError && err.status >= 500;

      // Only retry on 429, network errors, or 5xx
      if (!isRateLimit && !isNetworkError && !isServerError) throw err;

      if (attempt < CHUNK_RETRY_ATTEMPTS) {
        const delay = CHUNK_RETRY_BASE_DELAY * Math.pow(2, attempt); // 2s, 4s, 8s
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError;
}

export function useMovieUpload() {
  const [state, setState] = useState<MovieUploadState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);
  const pollingRef = useRef(false);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    pollingRef.current = false;
    setState(INITIAL_STATE);
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    pollingRef.current = false;
    setState((s) => ({ ...s, phase: 'idle', error: 'Cancelado por el usuario' }));
  }, []);

  const upload = useCallback(async (
    file: File,
    metadata: { title: string; category: string },
  ) => {
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // ── Phase 1: Chunked upload ─────────────────────────────────────
      setState({ ...INITIAL_STATE, phase: 'uploading' });

      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const token = getToken();

      const { uploadId } = await api.library.initUpload({
        filename: file.name,
        title: metadata.title,
        category: metadata.category,
        totalChunks,
        totalSize: file.size,
      });

      if (controller.signal.aborted) return;

      // Send chunks sequentially (CHUNK_CONCURRENCY = 1) to avoid rate limiting.
      // Group into batches in case concurrency is raised in the future.
      let completedChunks = 0;

      for (let offset = 0; offset < totalChunks; offset += CHUNK_CONCURRENCY) {
        if (controller.signal.aborted) return;

        const batch: Promise<void>[] = [];
        for (let i = offset; i < Math.min(offset + CHUNK_CONCURRENCY, totalChunks); i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);
          batch.push(
            uploadChunkWithRetry(uploadId, i, chunk, token, controller.signal),
          );
        }

        await Promise.all(batch);
        completedChunks += batch.length;

        setState((s) => ({
          ...s,
          uploadProgress: Math.round((completedChunks / totalChunks) * 100),
        }));

        // Small pause between batches to avoid rate limiting
        if (completedChunks < totalChunks) {
          await new Promise((r) => setTimeout(r, CHUNK_INTER_DELAY));
        }
      }

      if (controller.signal.aborted) return;

      // ── Phase 2: Signal completion, start processing ────────────────
      setState((s) => ({
        ...s,
        phase: 'processing',
        uploadProgress: 100,
        processProgress: 0,
        jobStatus: 'queued',
      }));

      const { jobId } = await api.library.completeUpload(uploadId);

      if (controller.signal.aborted) return;

      // ── Phase 3: Poll for processing status ─────────────────────────
      pollingRef.current = true;

      while (pollingRef.current) {
        if (controller.signal.aborted) return;

        await new Promise((r) => setTimeout(r, JOB_POLL_INTERVAL));

        if (controller.signal.aborted) return;

        let job: UploadJob;
        try {
          job = await api.jobs.getStatus(jobId);
        } catch {
          continue; // network hiccup during polling — retry next tick
        }

        setState((s) => ({
          ...s,
          processProgress: job.progress,
          jobStatus: job.status,
        }));

        if (job.status === 'done') {
          pollingRef.current = false;
          setState((s) => ({
            ...s,
            phase: 'done',
            processProgress: 100,
            movieId: job.movieId ?? null,
          }));
          return;
        }

        if (job.status === 'error') {
          pollingRef.current = false;
          const rawError = job.error;
          const errorMsg =
            !rawError || rawError === '<none>' || rawError.trim() === ''
              ? 'El procesamiento falló en el servidor. Revisa los logs del Raspberry Pi.'
              : rawError;
          setState((s) => ({ ...s, phase: 'error', error: errorMsg }));
          return;
        }
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setState((s) => ({
        ...s,
        phase: 'error',
        error: err instanceof Error ? err.message : 'Error inesperado',
      }));
    }
  }, []);

  return { state, upload, cancel, reset };
}
