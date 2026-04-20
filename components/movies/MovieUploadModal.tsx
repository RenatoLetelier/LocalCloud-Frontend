'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle, Film, ImagePlus, Loader2, Upload, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { movieKeys } from '@/hooks/queries/useMovies';
import { useMovieUpload, type MovieUploadPhase } from '@/hooks/mutations/useMovieUpload';
import { showError, showSuccess } from '@/lib/toast';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { MAX_MOVIE_SIZE, MOVIE_CATEGORIES } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

const PHASE_LABELS: Record<MovieUploadPhase, string> = {
  idle: '',
  uploading: 'Subiendo película...',
  processing: 'Procesando video...',
  done: 'Película lista',
  error: 'Error',
};

export function MovieUploadModal({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const { state, upload, cancel, reset } = useMovieUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [dragging, setDragging] = useState(false);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [uploadingPoster, setUploadingPoster] = useState(false);

  const isActive = state.phase !== 'idle';

  // Elapsed time counter during processing
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (state.phase !== 'processing') { setElapsed(0); return; }
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [state.phase]);

  // Auto-upload poster when job is done and movieId is available
  useEffect(() => {
    if (state.phase !== 'done' || !state.movieId || !posterFile) return;
    let cancelled = false;

    async function uploadPoster() {
      setUploadingPoster(true);
      try {
        const fd = new FormData();
        fd.append('poster', posterFile!);
        await api.library.uploadPoster(state.movieId!, fd);
        if (!cancelled) queryClient.invalidateQueries({ queryKey: movieKeys.all });
      } catch {
        // Poster upload is non-critical — movie was already created
      } finally {
        if (!cancelled) setUploadingPoster(false);
      }
    }
    uploadPoster();
    return () => { cancelled = true; };
  }, [state.phase, state.movieId]); // eslint-disable-line react-hooks/exhaustive-deps

  function formatElapsed(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  }

  function handleFileSelect(f: File) {
    if (!f.type.startsWith('video/')) { showError('Solo se permiten archivos de video'); return; }
    if (f.size > MAX_MOVIE_SIZE) { showError(`El archivo excede el límite de ${formatSize(MAX_MOVIE_SIZE)}`); return; }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[_.-]/g, ' '));
  }

  function handlePosterSelect(f: File) {
    if (!f.type.startsWith('image/')) { showError('Solo se permiten imágenes para el poster'); return; }
    setPosterFile(f);
    const url = URL.createObjectURL(f);
    setPosterPreview(url);
  }

  function clearPoster() {
    if (posterPreview) URL.revokeObjectURL(posterPreview);
    setPosterFile(null);
    setPosterPreview(null);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  }, [title]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUpload() {
    if (!file || !title.trim() || !category) return;
    await upload(file, { title: title.trim(), category });
  }

  // Watch for done state to invalidate queries
  if (state.phase === 'done' && state.movieId) {
    queryClient.invalidateQueries({ queryKey: movieKeys.all });
  }

  function handleClose() {
    if (state.phase === 'uploading' || state.phase === 'processing') return;
    setFile(null);
    setTitle('');
    setCategory('');
    clearPoster();
    reset();
    onClose();
  }

  function handleDone() {
    queryClient.invalidateQueries({ queryKey: movieKeys.all });
    showSuccess('Película subida correctamente');
    handleClose();
  }

  const progress = state.phase === 'uploading'
    ? state.uploadProgress
    : state.phase === 'processing'
      ? state.processProgress
      : 0;

  return (
    <Modal open={open} onClose={handleClose} title="Subir Película" className="max-w-lg">
      <div className="p-5 flex flex-col gap-4">

        {/* ── Idle: File selection + form ──────────────────────────────── */}
        {!isActive && (
          <>
            {/* Drop zone / File info */}
            {!file ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={cn(
                  'flex flex-col items-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer select-none transition-colors',
                  dragging
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
                    : 'border-gray-300 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-gray-50 dark:hover:bg-gray-800/50',
                )}
              >
                <Film className="w-8 h-8 text-gray-400" />
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Arrastra tu película aquí o{' '}
                    <span className="text-indigo-500">busca archivos</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    MP4, MKV, AVI, MOV — máx. {formatSize(MAX_MOVIE_SIZE)}
                  </p>
                </div>
                <input ref={inputRef} type="file" accept="video/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <Film className="w-5 h-5 text-purple-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{file.name}</p>
                  <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
                </div>
                <button onClick={() => setFile(null)} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                  Cambiar
                </button>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Título</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Nombre de la película..."
                className={cn('w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-gray-800',
                  'border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent')} />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Categoría</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className={cn('w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-gray-800',
                  'border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                  !category && 'text-gray-400')}>
                <option value="">Selecciona una categoría...</option>
                {MOVIE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Poster (optional) */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Poster <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              {posterPreview ? (
                <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={posterPreview} alt="Poster" className="w-12 h-16 object-cover rounded-md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{posterFile?.name}</p>
                    <p className="text-xs text-gray-400">{posterFile ? formatSize(posterFile.size) : ''}</p>
                  </div>
                  <button onClick={clearPoster} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button onClick={() => posterInputRef.current?.click()}
                  className={cn('flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg border border-dashed transition-colors',
                    'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400',
                    'hover:border-indigo-400 dark:hover:border-indigo-600 hover:text-indigo-500')}>
                  <ImagePlus className="w-4 h-4" />
                  Seleccionar imagen para el poster
                </button>
              )}
              <input ref={posterInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePosterSelect(f); e.target.value = ''; }} />
            </div>
          </>
        )}

        {/* ── Active: Progress ────────────────────────────────────────── */}
        {isActive && (
          <div className="flex flex-col items-center gap-4 py-4">
            {state.phase === 'uploading' && <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />}
            {state.phase === 'processing' && <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />}
            {state.phase === 'done' && (
              uploadingPoster
                ? <Loader2 className="w-10 h-10 text-green-500 animate-spin" />
                : <CheckCircle className="w-10 h-10 text-green-500" />
            )}
            {state.phase === 'error' && <XCircle className="w-10 h-10 text-red-500" />}

            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {state.phase === 'done' && uploadingPoster ? 'Subiendo poster...' : PHASE_LABELS[state.phase]}
            </p>

            {(state.phase === 'uploading' || state.phase === 'processing') && (
              <div className="w-full">
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all duration-500',
                    state.phase === 'uploading' ? 'bg-indigo-500' : 'bg-purple-500')}
                    style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-gray-400 text-center mt-1.5 tabular-nums">
                  {progress}%
                  {state.phase === 'processing' && (
                    <span className="ml-2">
                      {state.jobStatus && <span className="capitalize">({state.jobStatus})</span>}
                      {elapsed > 0 && <span className="ml-1 text-gray-500">— {formatElapsed(elapsed)}</span>}
                    </span>
                  )}
                </p>
              </div>
            )}

            {state.phase === 'processing' && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 w-full">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Puedes cerrar esta ventana. El procesamiento continúa en segundo plano.
                </p>
              </div>
            )}

            {state.phase === 'error' && state.error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 w-full">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-400">{state.error}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Actions ─────────────────────────────────────────────────── */}
        <div className="flex justify-end gap-2 pt-1">
          {state.phase === 'idle' && (
            <>
              <button onClick={handleClose}
                className="px-4 py-2 text-sm rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                Cancelar
              </button>
              <button onClick={handleUpload} disabled={!file || !title.trim() || !category}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <Upload className="w-4 h-4" />
                Subir película
              </button>
            </>
          )}

          {state.phase === 'uploading' && (
            <button onClick={cancel}
              className="px-4 py-2 text-sm rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
              Cancelar
            </button>
          )}

          {state.phase === 'processing' && (
            <button onClick={handleClose}
              className="px-4 py-2 text-sm rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              Cerrar (sigue procesando)
            </button>
          )}

          {state.phase === 'done' && !uploadingPoster && (
            <button onClick={handleDone}
              className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors">
              Listo
            </button>
          )}

          {state.phase === 'error' && (
            <>
              <button onClick={handleClose}
                className="px-4 py-2 text-sm rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                Cerrar
              </button>
              <button onClick={() => { reset(); }}
                className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
                Reintentar
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
