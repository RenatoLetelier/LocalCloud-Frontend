'use client';

import { useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthImage } from '@/hooks/useAuthImage';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getToken } from '@/lib/auth';
import type { FileRecord } from '@/lib/types';

interface Props {
  files: FileRecord[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

/**
 * Loads the full-resolution photo via the stream endpoint.
 * Uses file.userId so admins can view other users' photos correctly.
 */
function LightboxImage({ file }: { file: FileRecord }) {
  const url = api.pi.streamUrl(file.userId, file.piPath);
  const { src, loading } = useAuthImage(url);

  return (
    <div className="absolute inset-0 flex items-center justify-center p-6">
      {loading && <LoadingSpinner size="lg" />}
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={file.name}
          className="w-full h-full object-contain select-none"
          draggable={false}
        />
      )}
    </div>
  );
}

/**
 * Renders a video player with authenticated source.
 */
function LightboxVideo({ file }: { file: FileRecord }) {
  const url = api.pi.streamUrl(file.userId, file.piPath);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const controller = new AbortController();
    const token = getToken();

    (async () => {
      try {
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        });
        if (!res.ok) return;
        const blob = await res.blob();
        if (!controller.signal.aborted) {
          video.src = URL.createObjectURL(blob);
        }
      } catch {
        // Aborted or network error
      }
    })();

    return () => {
      controller.abort();
      if (video.src.startsWith('blob:')) URL.revokeObjectURL(video.src);
    };
  }, [url]);

  return (
    <div className="absolute inset-0 flex items-center justify-center p-6">
      <video
        ref={videoRef}
        controls
        autoPlay
        className="max-w-full max-h-full rounded-lg"
      />
    </div>
  );
}

/**
 * Prefetch an adjacent file's stream URL into browser cache.
 */
function usePrefetch(file: FileRecord | undefined) {
  useEffect(() => {
    if (!file) return;
    const url = api.pi.streamUrl(file.userId, file.piPath);
    const token = getToken();
    const controller = new AbortController();

    fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
    }).catch(() => {});

    return () => controller.abort();
  }, [file]);
}

export function Lightbox({ files, index, onClose, onNavigate }: Props) {
  const file = files[index];
  const hasPrev = index > 0;
  const hasNext = index < files.length - 1;

  // Prefetch adjacent images
  usePrefetch(hasNext ? files[index + 1] : undefined);
  usePrefetch(hasPrev ? files[index - 1] : undefined);

  const prev = useCallback(() => { if (hasPrev) onNavigate(index - 1); }, [hasPrev, index, onNavigate]);
  const next = useCallback(() => { if (hasNext) onNavigate(index + 1); }, [hasNext, index, onNavigate]);

  // Block body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape')     onClose();
      if (e.key === 'ArrowLeft')  prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, prev, next]);

  if (!file) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <span className="text-sm text-gray-500 tabular-nums">
          {index + 1} / {files.length}
        </span>
        <span className="text-sm font-medium text-gray-300 truncate max-w-xs px-2">
          {file.name}
        </span>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Media area ── */}
      <div className="relative flex-1 min-h-0">
        {file.type === 'video' ? (
          <LightboxVideo key={file.id} file={file} />
        ) : (
          <LightboxImage key={file.id} file={file} />
        )}

        {hasPrev && (
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors z-10"
            aria-label="Previous"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {hasNext && (
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors z-10"
            aria-label="Next"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* ── Bottom bar ── */}
      <div className="px-4 py-3 text-center shrink-0">
        <p className="text-xs text-gray-600">
          {new Date(file.createdAt).toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric',
          })}
          {file.sizeBytes && (
            <span className="ml-3">{(file.sizeBytes / 1024 / 1024).toFixed(1)} MB</span>
          )}
        </p>
      </div>
    </div>
  );
}
