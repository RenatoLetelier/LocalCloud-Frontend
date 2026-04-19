'use client';

import { useCallback, useRef, useState } from 'react';
import { CheckCircle, FileImage, FileVideo, Upload, X, XCircle } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useQueryClient } from '@tanstack/react-query';
import { fileKeys } from '@/hooks/queries/useFiles';
import { showError, showSuccess } from '@/lib/toast';
import { Modal } from '@/components/ui/Modal';
import { getToken } from '@/lib/auth';
import { MAX_PHOTO_SIZE, MAX_VIDEO_SIZE, UPLOAD_CONCURRENCY } from '@/lib/constants';

type Status = 'pending' | 'uploading' | 'done' | 'error';

interface FileItem {
  file: File;
  kind: 'photo' | 'video';
  status: Status;
  progress: number; // 0-100
  error?: string;
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

interface Props {
  open: boolean;
  onClose: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Upload a file with real progress tracking via XMLHttpRequest.
 */
function uploadWithProgress(
  url: string,
  formData: FormData,
  token: string | null,
  onProgress: (pct: number) => void,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else {
        try {
          const body = JSON.parse(xhr.responseText);
          reject(new Error(body.error ?? `Error ${xhr.status}`));
        } catch {
          reject(new Error(`Error ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('No se pudo conectar al servidor'));
    xhr.onabort = () => reject(new Error('Upload cancelado'));

    signal.addEventListener('abort', () => xhr.abort());

    xhr.open('POST', url);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}

export function UploadModal({ open, onClose }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [items, setItems] = useState<FileItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  function classifyFile(file: File): 'photo' | 'video' | null {
    if (file.type.startsWith('image/')) return 'photo';
    if (file.type.startsWith('video/')) return 'video';
    return null;
  }

  function addFiles(incoming: FileList | File[]) {
    const files = Array.from(incoming);
    const valid: FileItem[] = [];
    let rejected = 0;

    for (const file of files) {
      const kind = classifyFile(file);
      if (!kind) { rejected++; continue; }

      const maxSize = kind === 'photo' ? MAX_PHOTO_SIZE : MAX_VIDEO_SIZE;
      if (file.size > maxSize) {
        showError(`"${file.name}" excede el límite de ${formatSize(maxSize)}`);
        rejected++;
        continue;
      }

      valid.push({ file, kind, status: 'pending', progress: 0 });
    }

    if (rejected > 0 && valid.length === 0) {
      showError('Ningún archivo válido seleccionado');
    }

    setItems((prev) => [...prev, ...valid]);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, []);

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function patchItem(index: number, patch: Partial<FileItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function handleUpload() {
    if (!user) return;

    setUploading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    let successCount = 0;

    const pendingIndices = items
      .map((item, i) => (item.status === 'pending' ? i : -1))
      .filter((i) => i !== -1);

    const token = getToken();
    const url = `${BASE}/api/files/upload/${user.id}`;

    async function uploadOne(i: number) {
      if (controller.signal.aborted) return;
      patchItem(i, { status: 'uploading', progress: 0 });
      try {
        const fd = new FormData();
        fd.append('file', items[i].file);
        await uploadWithProgress(
          url,
          fd,
          token,
          (pct) => patchItem(i, { progress: pct }),
          controller.signal,
        );
        patchItem(i, { status: 'done', progress: 100 });
        successCount++;
      } catch (err) {
        if (controller.signal.aborted) return;
        patchItem(i, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Error al subir',
        });
      }
    }

    for (let offset = 0; offset < pendingIndices.length; offset += UPLOAD_CONCURRENCY) {
      if (controller.signal.aborted) break;
      const batch = pendingIndices.slice(offset, offset + UPLOAD_CONCURRENCY);
      await Promise.all(batch.map(uploadOne));
    }

    setUploading(false);
    abortRef.current = null;

    if (successCount > 0) {
      queryClient.invalidateQueries({ queryKey: fileKeys.all });
      showSuccess(`${successCount} archivo${successCount > 1 ? 's' : ''} subido${successCount > 1 ? 's' : ''} correctamente`);
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
  }

  function handleClose() {
    if (uploading) return;
    setItems([]);
    onClose();
  }

  const pendingCount = items.filter((i) => i.status === 'pending').length;
  const allDone = items.length > 0 && items.every((i) => i.status === 'done');
  const photoCount = items.filter((i) => i.kind === 'photo' && i.status === 'pending').length;
  const videoCount = items.filter((i) => i.kind === 'video' && i.status === 'pending').length;

  const buttonLabel = uploading
    ? 'Subiendo…'
    : `Subir ${pendingCount} archivo${pendingCount !== 1 ? 's' : ''}`;

  return (
    <Modal open={open} onClose={handleClose} title="Subir Archivos">
      <div className="p-5 flex flex-col gap-4">

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            flex flex-col items-center gap-3 p-8 rounded-xl border-2 border-dashed
            cursor-pointer select-none transition-colors
            ${dragging
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
              : 'border-gray-300 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }
          `}
        >
          <Upload className="w-8 h-8 text-gray-400" />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Arrastra fotos o videos aquí o{' '}
              <span className="text-indigo-500 hover:text-indigo-600">busca archivos</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Fotos: JPG, PNG, WEBP, HEIC (máx. {formatSize(MAX_PHOTO_SIZE)})
            </p>
            <p className="text-xs text-gray-400">
              Videos: MP4, MOV, WEBM (máx. {formatSize(MAX_VIDEO_SIZE)})
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </div>

        {/* Summary badges */}
        {items.length > 0 && !uploading && !allDone && (
          <div className="flex gap-2">
            {photoCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                <FileImage className="w-3 h-3" /> {photoCount} foto{photoCount !== 1 ? 's' : ''}
              </span>
            )}
            {videoCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                <FileVideo className="w-3 h-3" /> {videoCount} video{videoCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {/* File list */}
        {items.length > 0 && (
          <ul className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-0.5">
            {items.map((item, i) => (
              <li
                key={i}
                className="flex flex-col gap-1 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800"
              >
                <div className="flex items-center gap-3">
                  {item.kind === 'video' ? (
                    <FileVideo className="w-4 h-4 text-purple-400 shrink-0" />
                  ) : (
                    <FileImage className="w-4 h-4 text-indigo-400 shrink-0" />
                  )}

                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1">
                    {item.file.name}
                  </span>

                  <span className="text-xs text-gray-400 shrink-0">
                    {formatSize(item.file.size)}
                  </span>

                  {item.status === 'pending' && (
                    <button
                      onClick={() => removeItem(i)}
                      className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                      aria-label="Quitar"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {item.status === 'uploading' && (
                    <span className="text-xs text-indigo-400 tabular-nums shrink-0">
                      {item.progress}%
                    </span>
                  )}
                  {item.status === 'done' && (
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  )}
                  {item.status === 'error' && (
                    <span title={item.error}>
                      <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                {item.status === 'uploading' && (
                  <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          {uploading ? (
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              Cancelar
            </button>
          ) : (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {allDone ? 'Cerrar' : 'Cancelar'}
            </button>
          )}

          {!allDone && (
            <button
              onClick={handleUpload}
              disabled={pendingCount === 0 || uploading || !user}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Upload className="w-4 h-4" />
              {buttonLabel}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
