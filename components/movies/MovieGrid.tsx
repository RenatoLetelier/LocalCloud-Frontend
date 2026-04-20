'use client';

import { useMemo, useState } from 'react';
import { Film } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMovies } from '@/hooks/queries/useMovies';
import { useDebounce } from '@/hooks/useDebounce';
import { MOVIE_CATEGORIES } from '@/lib/constants';
import { MovieCard } from './MovieCard';
import { MovieGridSkeleton } from './MovieGridSkeleton';
import { MovieToolbar } from './MovieToolbar';
import { MovieUploadModal } from './MovieUploadModal';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import type { LibraryMovie } from '@/lib/types';

// ─── Category label helper ────────────────────────────────────────────────────

function categoryLabel(value: string): string {
  return MOVIE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MovieGrid() {
  const router = useRouter();
  const { data: movies = [], isLoading, error, refetch } = useMovies();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Unique categories from actual library movies
  const categories = useMemo(() => {
    const catSet = new Set<string>();
    movies.forEach((m) => { if (m.category) catSet.add(m.category); });
    return Array.from(catSet)
      .map((value) => ({ label: categoryLabel(value), value }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [movies]);

  const isFiltering = !!(debouncedSearch || selectedCategory);

  // Flat filtered list — used when a search/filter is active
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

  // Grouped by category — used in Netflix browse mode
  const grouped = useMemo<{ label: string; value: string; movies: LibraryMovie[] }[]>(() => {
    if (isFiltering) return [];
    const map = new Map<string, LibraryMovie[]>();
    movies.forEach((m) => {
      const key = m.category ?? '';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });
    // Sort rows: categories with a known label first, then uncategorised last
    return Array.from(map.entries())
      .map(([value, list]) => ({ label: categoryLabel(value) || 'Sin categoría', value, movies: list }))
      .sort((a, b) => {
        if (!a.value) return 1;
        if (!b.value) return -1;
        return a.label.localeCompare(b.label);
      });
  }, [movies, isFiltering]);

  function handleMovieClick(movie: LibraryMovie) {
    router.push(`/movies/${movie.id}`);
  }

  if (isLoading) return <MovieGridSkeleton />;
  if (error) return <ErrorMessage message={error.message} onRetry={() => refetch()} />;

  return (
    <div className="flex flex-col min-h-full bg-gray-950">

      {/* Toolbar */}
      <MovieToolbar
        count={isFiltering ? filtered.length : movies.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        onUpload={() => setUploadOpen(true)}
      />

      {/* ── Empty library ── */}
      {movies.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-32 text-gray-600">
          <Film className="w-14 h-14" />
          <p className="text-sm">No hay películas en la biblioteca.</p>
          <button
            onClick={() => setUploadOpen(true)}
            className="mt-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Subir primera película
          </button>
        </div>
      )}

      {/* ── Filtered grid ── */}
      {isFiltering && movies.length > 0 && (
        filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-gray-600">
            <Film className="w-10 h-10" />
            <p className="text-sm">No se encontraron películas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 px-6 py-4">
            {filtered.map((movie) => (
              <MovieCard key={movie.id} movie={movie} onClick={handleMovieClick} />
            ))}
          </div>
        )
      )}

      {/* ── Netflix browse rows ── */}
      {!isFiltering && grouped.length > 0 && (
        <div className="flex flex-col gap-8 pb-12 pt-2">
          {grouped.map((row) => (
            <MovieRow
              key={row.value || '__uncategorised__'}
              label={row.label}
              movies={row.movies}
              onMovieClick={handleMovieClick}
            />
          ))}
        </div>
      )}

      {/* Upload modal */}
      <MovieUploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

interface RowProps {
  label: string;
  movies: LibraryMovie[];
  onMovieClick: (movie: LibraryMovie) => void;
}

function MovieRow({ label, movies, onMovieClick }: RowProps) {
  return (
    <section>
      <h2 className="px-6 mb-3 text-base font-semibold text-gray-100 capitalize tracking-wide">
        {label}
      </h2>
      <div className="flex gap-3 overflow-x-auto px-6 pb-3 pt-3 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {movies.map((movie) => (
          <div key={movie.id} className="shrink-0 w-36 sm:w-40 md:w-44">
            <MovieCard movie={movie} onClick={onMovieClick} />
          </div>
        ))}
      </div>
    </section>
  );
}
