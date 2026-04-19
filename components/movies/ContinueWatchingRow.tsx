'use client';

import { Play } from 'lucide-react';
import Link from 'next/link';
import { useAllPlaybackProgress } from '@/hooks/usePlaybackProgress';
import type { PlaybackEntry } from '@/lib/types';
import { useMovies } from '@/hooks/queries/useMovies';
import { api } from '@/lib/api';
import { useAuthImage } from '@/hooks/useAuthImage';
import type { LibraryMovie } from '@/lib/types';

export function ContinueWatchingRow() {
  const entries = useAllPlaybackProgress();
  const { data: movies = [] } = useMovies();

  if (entries.length === 0 || movies.length === 0) return null;

  // Match entries with movie data
  const matched = entries
    .map((entry) => ({
      entry,
      movie: movies.find((m) => m.id === entry.movieId),
    }))
    .filter((m): m is { entry: PlaybackEntry; movie: LibraryMovie } => !!m.movie)
    .slice(0, 10); // Max 10

  if (matched.length === 0) return null;

  return (
    <div className="px-6 pt-6">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        Continuar viendo
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {matched.map(({ entry, movie }) => (
          <ContinueCard key={movie.id} movie={movie} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function ContinueCard({ movie, entry }: { movie: LibraryMovie; entry: PlaybackEntry }) {
  const thumbUrl = movie.thumbPath ? api.libraryMedia.thumbUrl(movie.thumbPath) : null;
  const { src } = useAuthImage(thumbUrl);

  const progressPct = entry.duration > 0 ? (entry.currentTime / entry.duration) * 100 : 0;

  return (
    <Link
      href={`/movies/${movie.id}`}
      className="group relative flex-shrink-0 w-48 rounded-xl overflow-hidden bg-gray-800 hover:ring-2 hover:ring-indigo-500 transition-all"
    >
      {/* Thumbnail (16:9) */}
      <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
        <div className="absolute inset-0 bg-gray-700">
          {src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={movie.title} className="w-full h-full object-cover" />
          )}
          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div className="h-full bg-indigo-500 rounded-r-full" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Title */}
      <div className="p-2">
        <p className="text-xs font-medium text-gray-100 truncate">{movie.title}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">
          {formatTimeLeft(entry.duration - entry.currentTime)} restantes
        </p>
      </div>
    </Link>
  );
}

function formatTimeLeft(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}h ${remainMins}m`;
}
