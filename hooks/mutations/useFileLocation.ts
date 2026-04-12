'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { fileKeys } from '@/hooks/queries/useFiles';
import { showSuccess, showError } from '@/lib/toast';
import type { FileRecord } from '@/lib/types';

export function useUpdateFileLocation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ fileId, latitude, longitude }: { fileId: string; latitude: number; longitude: number }) =>
      api.files.updateLocation(fileId, latitude, longitude),
    onMutate: async ({ fileId, latitude, longitude }) => {
      await qc.cancelQueries({ queryKey: fileKeys.all });
      const previous = qc.getQueryData<FileRecord[]>(fileKeys.list());

      // Optimistic update
      if (previous) {
        qc.setQueryData<FileRecord[]>(fileKeys.list(), (old) =>
          old?.map((f) => (f.id === fileId ? { ...f, latitude, longitude } : f)),
        );
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(fileKeys.list(), context.previous);
      }
      showError('Error al guardar ubicación');
    },
    onSuccess: () => {
      showSuccess('Ubicación guardada');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: fileKeys.all });
    },
  });
}

export function useRemoveFileLocation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (fileId: string) => api.files.removeLocation(fileId),
    onMutate: async (fileId) => {
      await qc.cancelQueries({ queryKey: fileKeys.all });
      const previous = qc.getQueryData<FileRecord[]>(fileKeys.list());

      if (previous) {
        qc.setQueryData<FileRecord[]>(fileKeys.list(), (old) =>
          old?.map((f) => (f.id === fileId ? { ...f, latitude: null, longitude: null } : f)),
        );
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(fileKeys.list(), context.previous);
      }
      showError('Error al quitar ubicación');
    },
    onSuccess: () => {
      showSuccess('Ubicación eliminada');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: fileKeys.all });
    },
  });
}
