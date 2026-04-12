'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { fileKeys } from '@/hooks/queries/useFiles';
import { showSuccess, showError } from '@/lib/toast';
import type { FileRecord } from '@/lib/types';

interface UploadParams {
  userId: string;
  formData: FormData;
  fileName?: string;
}

export function useUploadPhoto() {
  const queryClient = useQueryClient();

  return useMutation<FileRecord, Error, UploadParams>({
    mutationFn: ({ userId, formData }) => api.files.uploadPhoto(userId, formData),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all });
      showSuccess(`${variables.fileName ?? 'Foto'} subida correctamente`);
    },
    onError: (_error, variables) => {
      showError(`Error al subir ${variables.fileName ?? 'la foto'}`);
    },
  });
}
