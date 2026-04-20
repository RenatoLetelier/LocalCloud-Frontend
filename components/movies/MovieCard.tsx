'use client';

import { memo, useRef, useState } from 'react';
import { Film, ImagePlus, Play } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthImage } from '@/hooks/useAuthImage';
import { movieKeys } from '@/hooks/queries/useMovies';
import { useAllPlaybackProgress } from '@/hooks/usePlaybackProgress';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { showError, showSuccess } from '@/lib/toast';
import type { LibraryMovie } from '@/lib/types';

interface Props {
  movie: LibraryMovie;
  onClick?: (movie: LibraryMovie) => void;
}

export const MovieCard = memo(function MovieCard({ movie, onClick }: Props) {
  const queryClient = useQueryClient();
  const { src, loading } = useAuthImage(movie.thumbPath ? api.libraryMedia.thumbUrl(movie.thumbPath) : null);

  // Playback progress — React Query deduplicates the list fetch across all cards
  const allProgress = useAllPlaybackProgress();
  const progressEntry = allProgress.find((e) => e.movieId === movie.id);
  const progressPct = progressEntry && progressEntry.duration > 0
    ? Math.min((progressEntry.currentTime / progressEntry.duration) * 100, 100)
    : null;

  const posterInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPoster, setUploadingPoster] = useState(false);

  async function handlePosterUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showError('Solo se permiten imágenes'); return; }

    setUploadingPoster(true);
    try {
      const fd = new FormData();
      fd.append('poster', file);
      await api.library.uploadPoster(movie.id, fd);
      queryClient.invalidateQueries({ queryKey: movieKeys.all });
      showSuccess('Poster actualizado');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error al subir el poster');
    } finally {
      setUploadingPoster(false);
      e.target.value = '';
    }
  }

  return (
    <div className="group relative flex flex-col rounded-lg overflow-hidden bg-gray-800 hover:ring-2 hover:ring-indigo-500 hover:shadow-2xl hover:brightness-110 transition-all duration-200 cursor-pointer">

      {/* Poster area (2:3 aspect ratio) */}
      <button
        onClick={() => onClick?.(movie)}
        className="relative w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 text-left"
        style={{ paddingTop: '150%' }}
      >
        <div className="absolute inset-0 bg-gray-700">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <LoadingSpinner size="sm" />
            </div>
          )}
          {src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={movie.title}
              className="w-full h-full object-cover"
            />
          )}
          {!src && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500">
              <Film className="w-10 h-10" />
              <span className="text-[10px] font-medium uppercase tracking-wide">Sin poster</span>
            </div>
          )}

          {/* Gradient + play button overlay on hover */}
          <div className="absolute inset-0 flex items-end p-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-t from-black/75 via-black/10 to-transparent">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0">
              <Play className="w-4 h-4 text-gray-900 ml-0.5" fill="currentColor" />
            </div>
          </div>

          {/* Playback progress bar */}
          {progressPct !== null && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
              <div
                className="h-full bg-indigo-500 rounded-r-full transition-none"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </div>
      </button>

      {/* Upload poster button — top-right corner on hover */}
      <button
        onClick={(e) => { e.stopPropagation(); posterInputRef.current?.click(); }}
        disabled={uploadingPoster}
        title="Subir poster"
        className="absolute top-1.5 right-1.5 z-10 p-1.5 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-black/80 transition-all disabled:opacity-50"
      >
        {uploadingPoster
          ? <LoadingSpinner size="sm" />
          : <ImagePlus className="w-3.5 h-3.5" />
        }
      </button>
      <input
        ref={posterInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePosterUpload}
      />

      {/* Info */}
      <div className="px-2.5 py-2">
        <p className="font-medium text-xs text-gray-100 truncate leading-tight">
          {movie.title}
        </p>
        {movie.category && (
          <p className="text-[10px] text-gray-500 mt-0.5 capitalize">
            {movie.category}
          </p>
        )}
      </div>
    </div>
  );
});
