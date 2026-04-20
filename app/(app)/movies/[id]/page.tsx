'use client';

export const runtime = 'edge';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Film, Loader2, Trash2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMovie, movieKeys } from '@/hooks/queries/useMovies';
import { usePlaybackProgress } from '@/hooks/usePlaybackProgress';
import { useAuth } from '@/providers/AuthProvider';
import dynamic from 'next/dynamic';

const VideoPlayer = dynamic(
  () => import('@/components/movies/VideoPlayer').then((m) => m.VideoPlayer),
  { ssr: false },
);
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { showError, showSuccess } from '@/lib/toast';

export default function MovieDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const movieId = params.id;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: movie, isLoading, error, refetch } = useMovie(movieId);
  const { savedTime, saveProgress, saveProgressThrottled } = usePlaybackProgress(movieId);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch subtitles for this movie
  const { data: subtitleData = [] } = useQuery({
    queryKey: ['subtitles', movieId],
    queryFn: () => api.subtitles.list(movieId),
    enabled: !!movieId,
    staleTime: 5 * 60 * 1000,
  });

  // Build stream URL with auth token (video element can't set Authorization header)
  const streamUrl = movie
    ? `${api.libraryMedia.streamUrl(movie.piPath)}&token=${getToken()}`
    : '';

  // Build subtitle track list — <track> also can't set Authorization header
  const subtitles = useMemo(() => {
    const token = getToken();
    return subtitleData.map((sub) => ({
      label: sub.label,
      lang: sub.lang,
      src: `${api.libraryMedia.streamUrl(sub.piPath)}&token=${token}`,
    }));
  }, [subtitleData]);

  // Track latest time for save-on-unmount
  const latestTimeRef = useRef<{ currentTime: number; duration: number } | null>(null);

  const handleTimeUpdate = useCallback(
    (currentTime: number, duration: number) => {
      latestTimeRef.current = { currentTime, duration };
      saveProgressThrottled(currentTime, duration);
    },
    [saveProgressThrottled],
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
    if (latestTimeRef.current) {
      saveProgress(latestTimeRef.current.duration, latestTimeRef.current.duration);
    }
  }, [saveProgress]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.library.deleteMovie(movieId);
      queryClient.invalidateQueries({ queryKey: movieKeys.all });
      showSuccess('Película eliminada');
      router.replace('/movies');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error al eliminar');
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

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
        subtitles={subtitles}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />

      {/* Movie info + admin actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
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

        {/* Admin-only delete */}
        {user?.role === 'admin' && (
          <div className="shrink-0">
            {confirmDelete ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50">
                <span className="text-sm text-red-600 dark:text-red-400">¿Eliminar película?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3 py-1 text-xs font-semibold rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="px-3 py-1 text-xs rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-800/50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
