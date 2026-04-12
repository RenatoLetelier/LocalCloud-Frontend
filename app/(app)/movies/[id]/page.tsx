'use client';

export const runtime = 'edge';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Film, Loader2 } from 'lucide-react';
import { useMovie } from '@/hooks/queries/useMovies';
import { usePlaybackProgress } from '@/hooks/usePlaybackProgress';
import { VideoPlayer } from '@/components/movies/VideoPlayer';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { srtToVtt, createVttBlobUrl } from '@/lib/subtitles';

export default function MovieDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const movieId = params.id;

  const { data: movie, isLoading, error, refetch } = useMovie(movieId);
  const { savedTime, saveProgress, SAVE_INTERVAL } = usePlaybackProgress(movieId);

  const lastSaveRef = useRef(0);

  // Build stream URL with auth token
  const streamUrl = movie ? `${api.libraryMedia.streamUrl(movie.piPath)}&token=${getToken()}` : '';

  // Handle time updates — save progress every SAVE_INTERVAL ms
  const handleTimeUpdate = useCallback(
    (currentTime: number, duration: number) => {
      const now = Date.now();
      if (now - lastSaveRef.current >= SAVE_INTERVAL) {
        saveProgress(currentTime, duration);
        lastSaveRef.current = now;
      }
    },
    [saveProgress, SAVE_INTERVAL],
  );

  // Save progress on unmount
  const latestTimeRef = useRef<{ currentTime: number; duration: number } | null>(null);
  const handleTimeUpdateFull = useCallback(
    (currentTime: number, duration: number) => {
      latestTimeRef.current = { currentTime, duration };
      handleTimeUpdate(currentTime, duration);
    },
    [handleTimeUpdate],
  );

  useEffect(() => {
    return () => {
      if (latestTimeRef.current) {
        saveProgress(latestTimeRef.current.currentTime, latestTimeRef.current.duration);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnded = useCallback(() => {
    // On movie end, clear progress (will be >95% so usePlaybackProgress auto-removes)
    if (latestTimeRef.current) {
      saveProgress(latestTimeRef.current.duration, latestTimeRef.current.duration);
    }
  }, [saveProgress]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorMessage message={error.message} onRetry={() => refetch()} />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="flex flex-col items-center gap-3 py-32 text-gray-400 dark:text-gray-600">
        <Film className="w-14 h-14" />
        <p className="text-sm">Película no encontrada.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.push('/movies')}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a películas
      </button>

      {/* Video Player */}
      <VideoPlayer
        src={streamUrl}
        title={movie.title}
        startTime={savedTime}
        onTimeUpdate={handleTimeUpdateFull}
        onEnded={handleEnded}
      />

      {/* Movie info */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
          {movie.title}
        </h1>
        {movie.category && (
          <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{movie.category}</p>
        )}
        {movie.sizeBytes && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {(movie.sizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB
          </p>
        )}
      </div>
    </div>
  );
}
