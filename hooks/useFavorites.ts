'use client';

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { FileRecord } from '@/lib/types';
import { fileKeys } from '@/hooks/queries/useFiles';

export const favoriteKeys = {
  all: ['favorites'] as const,
  list: () => [...favoriteKeys.all, 'list'] as const,
};

export function useFavorites() {
  const queryClient = useQueryClient();

  // API now returns FileRecord[] — we derive a Set<string> of IDs for fast lookup
  const { data: favoriteRecords = [] } = useQuery<FileRecord[]>({
    queryKey: favoriteKeys.list(),
    queryFn: () => api.favorites.list(),
  });

  const favoriteIds = new Set(favoriteRecords.map((f) => f.id));

  const favoriteMutation = useMutation({
    mutationFn: (id: string) => api.files.favorite(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: favoriteKeys.list() });
      const previous = queryClient.getQueryData<FileRecord[]>(favoriteKeys.list());

      // Try to find the FileRecord from any files query in cache
      const allFilesQueries = queryClient.getQueriesData<FileRecord[]>({ queryKey: fileKeys.all });
      let fileRecord: FileRecord | undefined;
      for (const [, data] of allFilesQueries) {
        if (data) {
          fileRecord = data.find((f) => f.id === id);
          if (fileRecord) break;
        }
      }

      if (fileRecord) {
        queryClient.setQueryData<FileRecord[]>(favoriteKeys.list(), (old = []) => [
          ...old,
          { ...fileRecord!, isFavorite: true },
        ]);
      }

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(favoriteKeys.list(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: favoriteKeys.list() });
    },
  });

  const unfavoriteMutation = useMutation({
    mutationFn: (id: string) => api.files.unfavorite(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: favoriteKeys.list() });
      const previous = queryClient.getQueryData<FileRecord[]>(favoriteKeys.list());
      queryClient.setQueryData<FileRecord[]>(favoriteKeys.list(), (old = []) =>
        old.filter((f) => f.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(favoriteKeys.list(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: favoriteKeys.list() });
    },
  });

  const toggle = useCallback(
    (id: string) => {
      if (favoriteIds.has(id)) {
        unfavoriteMutation.mutate(id);
      } else {
        favoriteMutation.mutate(id);
      }
    },
    [favoriteIds, favoriteMutation, unfavoriteMutation],
  );

  const isFavorite = useCallback((id: string) => favoriteIds.has(id), [favoriteIds]);

  return { favoriteIds, toggle, isFavorite };
}
