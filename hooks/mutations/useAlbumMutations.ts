'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { albumKeys } from '@/hooks/queries/useAlbums';
import { fileKeys } from '@/hooks/queries/useFiles';
import { showSuccess, showError } from '@/lib/toast';
import type { Album } from '@/lib/types';

export function useCreateAlbum() {
  const queryClient = useQueryClient();

  return useMutation<Album, Error, { name: string; description?: string }>({
    mutationFn: (data) => api.albums.create(data),
    onSuccess: (album) => {
      queryClient.invalidateQueries({ queryKey: albumKeys.all });
      showSuccess(`Album "${album.name}" creado`);
    },
    onError: () => {
      showError('Error al crear el album');
    },
  });
}

export function useDeleteAlbum() {
  const queryClient = useQueryClient();

  return useMutation<{ deleted: string }, Error, { id: string; name: string }>({
    mutationFn: ({ id }) => api.albums.delete(id),
    onSuccess: (_data, { name }) => {
      queryClient.invalidateQueries({ queryKey: albumKeys.all });
      showSuccess(`Album "${name}" eliminado`);
    },
    onError: () => {
      showError('Error al eliminar el album');
    },
  });
}

export function useAddFileToAlbum() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { albumId: string; fileIds: string[] }>({
    mutationFn: async ({ albumId, fileIds }) => {
      for (const fileId of fileIds) {
        await api.albums.addFile(albumId, fileId);
      }
    },
    onSuccess: (_data, { fileIds }) => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all });
      queryClient.invalidateQueries({ queryKey: albumKeys.all });
      showSuccess(`${fileIds.length} foto${fileIds.length > 1 ? 's' : ''} agregada${fileIds.length > 1 ? 's' : ''} al album`);
    },
    onError: () => {
      showError('Error al agregar fotos al album');
    },
  });
}

export function useRemoveFileFromAlbum() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { albumId: string; fileId: string }>({
    mutationFn: ({ albumId, fileId }) =>
      api.albums.removeFile(albumId, fileId).then(() => undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.all });
      queryClient.invalidateQueries({ queryKey: albumKeys.all });
      showSuccess('Foto removida del album');
    },
    onError: () => {
      showError('Error al remover foto del album');
    },
  });
}
