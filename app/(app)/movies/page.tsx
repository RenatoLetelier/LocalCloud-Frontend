export const runtime = 'edge';

import { MovieGrid } from '@/components/movies/MovieGrid';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export default function MoviesPage() {
  return (
    <ErrorBoundary>
      <MovieGrid />
    </ErrorBoundary>
  );
}
