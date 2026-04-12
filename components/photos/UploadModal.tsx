'use client';

import { useCallback, useRef, useState } from 'react';
import { CheckCircle, FileImage, Upload, X, XCircle, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { useQueryClient } from '@tanstack/react-query';
import { fileKeys } from '@/hooks/queries/useFiles';
import { showError, showSuccess } from '@/lib/toast';
import { Modal } from '@/components/ui/Modal';

type Status = 'pending' | 'uploading' | 'done' | 'error';

interface FileItem {
  file: File;
  status: Status;
  error?: string;
}

// ── Validation constants ────────────────────────────────────────────────────
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif', 'image/avif'];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function UploadModal({ open, onClose }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [items, setItems]       = useState<FileItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(incoming: FileList | File[]) {
    const files = Array.from(incoming);
    const valid: File[] = [];
    let rejected = 0;

    for (const file of files) {
      // Check type
      if (!file.type.startsWith('image/')) {
        rejected++;
        continue;
      }
      // Check size
      if (file.size > MAX_FILE_SIZE) {
        showError(`"${file.name}" excede el límite de ${MAX_FILE_SIZE / 1024 / 1024} MB`);
        rejected++;
        continue;
      }
    }

    // Re-filter for valid files
    for (const file of files) {
      if (file.type.startsWith('image/') && file.size <= MAX_FILE_SIZE) {
        valid.push(file);
      }
    }

    if (rejected > 0 && valid.length === 0) {
      showError('Ningún archivo válido seleccionado');
    }

    setItems((prev) => [...prev, ...valid.map((file) => ({ file, status: 'pending' as Status }))]);
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
    let successCount = 0;

    const pendingIndices = items
      .map((item, i) => (item.status === 'pending' ? i : -1))
      .filter((i) => i !== -1);

    const CONCURRENCY = 3;

    async function uploadOne(i: number) {
      patchItem(i, { status: 'uploading' });
      try {
        const fd = new FormData();
        fd.append('file', items[i].file);
        await api.files.uploadPhoto(user!.id, fd);
        patchItem(i, { status: 'done' });
        successCount++;
      } catch (err) {
        patchItem(i, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Error al subir',
        });
      }
    }

    for (let offset = 0; offset < pendingIndices.length; offset += CONCURRENCY) {
      const batch = pendingIndices.slice(offset, offset + CONCURRENCY);
      await Promise.all(batch.map(uploadOne));
    }

    setUploading(false);

    if (successCount > 0) {
      queryClient.invalidateQueries({ queryKey: fileKeys.all });
      showSuccess(`${successCount} foto${successCount > 1 ? 's' : ''} subida${successCount > 1 ? 's' : ''} correctamente`);
    }
  }

  function handleClose() {
    if (uploading) return;
    setItems([]);
    onClose();
  }

  const pendingCount = items.filter((i) => i.status === 'pending').length;
  const allDone      = items.length > 0 && items.every((i) => i.status === 'done');

  return (
    <Modal open={open} onClose={handleClose} title="Subir Fotos">
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
              Arrastra fotos aquí o{' '}
              <span className="text-indigo-500 hover:text-indigo-600">busca archivos</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              JPG, PNG, WEBP, HEIC — máx. {MAX_FILE_SIZE / 1024 / 1024} MB
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </div>

        {/* File list */}
        {items.length > 0 && (
          <ul className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-0.5">
            {items.map((item, i) => (
              <li
                key={i}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800"
              >
                <FileImage className="w-4 h-4 text-indigo-400 shrink-0" />

                <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1">
                  {item.file.name}
                </span>

                <span className="text-xs text-gray-400 shrink-0">
                  {(item.file.size / 1024 / 1024).toFixed(1)} MB
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
                  <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0" />
                )}
                {item.status === 'done' && (
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                )}
                {item.status === 'error' && (
                  <span title={item.error}>
                    <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={handleClose}
            disabled={uploading}
            className="px-4 py-2 text-sm rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {allDone ? 'Cerrar' : 'Cancelar'}
          </button>

          {!allDone && (
            <button
              onClick={handleUpload}
              disabled={pendingCount === 0 || uploading || !user}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Upload className="w-4 h-4" />
              {uploading
                ? 'Subiendo…'
                : `Subir ${pendingCount} foto${pendingCount !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
