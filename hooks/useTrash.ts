'use client';

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { fileKeys } from '@/hooks/queries/useFiles';
import { showError } from '@/lib/toast';
import type { FileRecord } from '@/lib/types';

const TRASH_DAYS = 30;

export const trashKeys = {
  all: ['trash'] as const,
  list: () => [...trashKeys.all, 'list'] as const,
};

export interface TrashedItem {
  id: string;
  deletedAt: string;
  daysRemaining: number;
}

function getDaysRemaining(deletedAt: string): number {
  const elapsed = Date.now() - new Date(deletedAt).getTime();
  const days = Math.ceil((TRASH_DAYS * 24 * 60 * 60 * 1000 - elapsed) / (24 * 60 * 60 * 1000));
  return Math.max(0, days);
}

export function useTrash() {
  const queryClient = useQueryClient();

  const { data: trashedFiles = [] } = useQuery<FileRecord[]>({
    queryKey: trashKeys.list(),
    queryFn: () => api.trash.list(),
  });

  const trashedIds = useMemo(() => new Set(trashedFiles.map((f) => f.id)), [trashedFiles]);

  const trashedItems: TrashedItem[] = useMemo(
    () =>
      trashedFiles.map((f) => ({
        id: f.id,
        deletedAt: f.deletedAt!,
        daysRemaining: getDaysRemaining(f.deletedAt!),
      })),
    [trashedFiles],
  );

  const trashCount = trashedFiles.length;

  const expiredIds = useMemo(
    () => trashedItems.filter((item) => item.daysRemaining <= 0).map((item) => item.id),
    [trashedItems],
  );

  // Move files to trash
  const trashMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => api.files.trash(id)));
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: trashKeys.list() });
      await queryClient.cancelQueries({ queryKey: fileKeys.all });
      const previousTrash = queryClient.getQueryData<FileRecord[]>(trashKeys.list());
      const previousFiles = queryClient.getQueryData<FileRecord[]>(fileKeys.list());

      // Optimistic: add to trash list, mark in files list
      if (previousFiles) {
        const now = new Date().toISOString();
        const movedFiles = previousFiles.filter((f) => ids.includes(f.id)).map((f) => ({ ...f, deletedAt: now }));
        queryClient.setQueryData<FileRecord[]>(trashKeys.list(), (old = []) => [...old, ...movedFiles]);
      }

      return { previousTrash, previousFiles };
    },
    onError: (_err, _ids, context) => {
      if (context?.previousTrash) queryClient.setQueryData(trashKeys.list(), context.previousTrash);
      if (context?.previousFiles) queryClient.setQueryData(fileKeys.list(), context.previousFiles);
      showError('Error al mover a la papelera');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: trashKeys.list() });
      queryClient.invalidateQueries({ queryKey: fileKeys.all });
    },
  });

  // Restore files from trash
  const restoreMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => api.files.restore(id)));
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: trashKeys.list() });
      const previous = queryClient.getQueryData<FileRecord[]>(trashKeys.list());
      queryClient.setQueryData<FileRecord[]>(trashKeys.list(), (old = []) =>
        old.filter((f) => !ids.includes(f.id)),
      );
      return { previous };
    },
    onError: (_err, _ids, context) => {
      if (context?.previous) queryClient.setQueryData(trashKeys.list(), context.previous);
      showError('Error al restaurar archivos');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: trashKeys.list() });
      queryClient.invalidateQueries({ queryKey: fileKeys.all });
    },
  });

  // Empty trash (permanent delete all)
  const emptyTrashMutation = useMutation({
    mutationFn: () => api.files.emptyTrash(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: trashKeys.list() });
      const previous = queryClient.getQueryData<FileRecord[]>(trashKeys.list());
      queryClient.setQueryData<FileRecord[]>(trashKeys.list(), []);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(trashKeys.list(), context.previous);
      showError('Error al vaciar la papelera');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: trashKeys.list() });
      queryClient.invalidateQueries({ queryKey: fileKeys.all });
    },
  });

  const trashFiles = useCallback((ids: string[]) => trashMutation.mutate(ids), [trashMutation]);
  const restoreFiles = useCallback((ids: string[]) => restoreMutation.mutate(ids), [restoreMutation]);

  const isTrashed = useCallback((id: string): boolean => trashedIds.has(id), [trashedIds]);

  return {
    trashedFiles,
    trashedIds,
    trashedItems,
    trashCount,
    expiredIds,
    isTrashed,
    trashFiles,
    restoreFiles,
    emptyTrashMutation,
  };
}
