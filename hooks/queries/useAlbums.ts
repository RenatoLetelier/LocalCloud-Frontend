'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Album } from '@/lib/types';

export const albumKeys = {
  all: ['albums'] as const,
  list: () => [...albumKeys.all, 'list'] as const,
  detail: (id: string) => [...albumKeys.all, 'detail', id] as const,
};

export function useAlbums() {
  return useQuery<Album[]>({
    queryKey: albumKeys.list(),
    queryFn: () => api.albums.list(),
  });
}

export function useAlbum(id: string) {
  return useQuery<Album>({
    queryKey: albumKeys.detail(id),
    queryFn: () => api.albums.get(id),
    enabled: !!id,
  });
}
