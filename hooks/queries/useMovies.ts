'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { LibraryMovie } from '@/lib/types';

export const movieKeys = {
  all: ['movies'] as const,
  list: () => [...movieKeys.all, 'list'] as const,
  detail: (id: string) => [...movieKeys.all, 'detail', id] as const,
};

export function useMovies() {
  return useQuery<LibraryMovie[]>({
    queryKey: movieKeys.list(),
    queryFn: () => api.library.listMovies(),
  });
}

export function useMovie(id: string) {
  return useQuery<LibraryMovie>({
    queryKey: movieKeys.detail(id),
    queryFn: () => api.library.getMovie(id),
    enabled: !!id,
  });
}
