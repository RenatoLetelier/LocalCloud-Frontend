'use client';

import { memo } from 'react';
import { Film, Play } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthImage } from '@/hooks/useAuthImage';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { LibraryMovie } from '@/lib/types';

interface Props {
  movie: LibraryMovie;
  onClick?: (movie: LibraryMovie) => void;
}

export const MovieCard = memo(function MovieCard({ movie, onClick }: Props) {
  const thumbUrl = movie.thumbPath ? api.libraryMedia.thumbUrl(movie.thumbPath) : null;
  const { src, loading } = useAuthImage(thumbUrl);

  return (
    <button
      onClick={() => onClick?.(movie)}
      className="
        group relative flex flex-col rounded-xl overflow-hidden
        bg-gray-100 dark:bg-gray-800
        ring-1 ring-gray-200 dark:ring-gray-700
        hover:ring-indigo-500 dark:hover:ring-indigo-400
        hover:shadow-xl transition-all duration-200
        text-left
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
      "
    >
      {/* Poster area (3:4 aspect ratio) */}
      <div className="relative w-full" style={{ paddingTop: '150%' }}>
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700">
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
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          )}
          {!src && !loading && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-600">
              <Film className="w-12 h-12" />
            </div>
          )}

          {/* Play overlay on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate leading-tight">
          {movie.title}
        </p>
        {movie.category && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 capitalize">
            {movie.category}
          </p>
        )}
      </div>
    </button>
  );
});
