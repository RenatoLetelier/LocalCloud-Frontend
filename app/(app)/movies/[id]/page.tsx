'use client';

export const runtime = 'edge';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, Film, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useMovie } from '@/hooks/queries/useMovies';
import { usePlaybackProgress } from '@/hooks/usePlaybackProgress';
import dynamic from 'next/dynamic';

const VideoPlayer = dynamic(
  () => import('@/components/movies/VideoPlayer').then((m) => m.VideoPlayer),
  { ssr: false },
);
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

export default function MovieDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const movieId = params.id;

  const { data: movie, isLoading, error, refetch } = useMovie(movieId);
  const { savedTime, saveProgress, saveProgressThrottled } = usePlaybackProgress(movieId);

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

  // Save progress on unmount
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
