'use client';

import { useMemo, useState } from 'react';
import { Film } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMovies } from '@/hooks/queries/useMovies';
import { useDebounce } from '@/hooks/useDebounce';
import { MovieCard } from './MovieCard';
import { MovieGridSkeleton } from './MovieGridSkeleton';
import { MovieToolbar } from './MovieToolbar';
import { ContinueWatchingRow } from './ContinueWatchingRow';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import type { LibraryMovie } from '@/lib/types';

export function MovieGrid() {
  const router = useRouter();
  const { data: movies = [], isLoading, error, refetch } = useMovies();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    movies.forEach((m) => {
      if (m.category) cats.add(m.category);
    });
    return Array.from(cats).sort();
  }, [movies]);

  // Filter movies by search and category
  const filtered = useMemo(() => {
    let result = movies;

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((m) => m.title.toLowerCase().includes(q));
    }

    if (selectedCategory) {
      result = result.filter((m) => m.category === selectedCategory);
    }

    return result;
  }, [movies, debouncedSearch, selectedCategory]);

  function handleMovieClick(movie: LibraryMovie) {
    router.push(`/movies/${movie.id}`);
  }

  if (isLoading) return <MovieGridSkeleton />;

  if (error) return <ErrorMessage message={error.message} onRetry={() => refetch()} />;

  if (movies.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-32 text-gray-400 dark:text-gray-600">
        <Film className="w-14 h-14" />
        <p className="text-sm">No hay películas en la biblioteca.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Continue Watching */}
      <ContinueWatchingRow />

      {/* Toolbar */}
      <MovieToolbar
        count={filtered.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-gray-400 dark:text-gray-600">
          <Film className="w-10 h-10" />
          <p className="text-sm">No se encontraron películas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-6">
          {filtered.map((movie) => (
            <MovieCard key={movie.id} movie={movie} onClick={handleMovieClick} />
          ))}
        </div>
      )}
    </div>
  );
}
