'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { fileKeys } from '@/hooks/queries/useFiles';
import { showSuccess, showError } from '@/lib/toast';
import type { FileRecord } from '@/lib/types';

export function useDeleteFiles() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string[]>({
    mutationFn: async (fileIds) => {
      // Delete sequentially to avoid overwhelming the backend
      for (const id of fileIds) {
        await api.files.delete(id);
      }
    },
    onMutate: async (fileIds) => {
      // Cancel in-flight queries to prevent overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: fileKeys.all });

      // Snapshot previous data for rollback
      const previousFiles = queryClient.getQueriesData<FileRecord[]>({ queryKey: fileKeys.all });

      // Optimistically remove deleted files from all cached queries
      queryClient.setQueriesData<FileRecord[]>(
        { queryKey: fileKeys.all },
        (old) => old?.filter((f) => !fileIds.includes(f.id)),
      );

      return { previousFiles };
    },
    onError: (_error, _fileIds, context) => {
      // Rollback optimistic update on error
      if (context?.previousFiles) {
        for (const [key, data] of context.previousFiles) {
          queryClient.setQueryData(key, data);
        }
      }
      showError('Error al eliminar archivos');
    },
    onSuccess: (_data, fileIds) => {
      showSuccess(`${fileIds.length} archivo${fileIds.length > 1 ? 's' : ''} eliminado${fileIds.length > 1 ? 's' : ''}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all });
    },
  });
}
