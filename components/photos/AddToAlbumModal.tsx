'use client';

import { useState } from 'react';
import { Check, FolderOpen } from 'lucide-react';
import { useAlbums } from '@/hooks/queries/useAlbums';
import { useAddFileToAlbum } from '@/hooks/mutations/useAlbumMutations';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  selectedIds: string[];
  onClose: () => void;
  onDone: () => void;
}

export function AddToAlbumModal({ open, selectedIds, onClose, onDone }: Props) {
  const { data: albums = [], isLoading: loadingAlbums } = useAlbums();
  const addToAlbum = useAddFileToAlbum();
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);

  function handleClose() {
    setSelectedAlbum(null);
    onClose();
  }

  function handleAdd() {
    if (!selectedAlbum) return;
    addToAlbum.mutate(
      { albumId: selectedAlbum, fileIds: selectedIds },
      {
        onSuccess: () => {
          onDone();
          handleClose();
        },
      },
    );
  }

  const title = `Agregar ${selectedIds.length} foto${selectedIds.length !== 1 ? 's' : ''} a Album`;

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      <div className="p-5 flex flex-col gap-4">

        {loadingAlbums ? (
          <div className="flex justify-center py-10">
            <LoadingSpinner size="md" />
          </div>
        ) : albums.length === 0 ? (
          <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-10">
            No hay álbumes. Crea uno desde el sidebar primero.
          </p>
        ) : (
          <ul className="flex flex-col gap-1 max-h-64 overflow-y-auto">
            {albums.map((album) => (
              <li key={album.id}>
                <button
                  onClick={() => setSelectedAlbum(album.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                    selectedAlbum === album.id
                      ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                  )}
                >
                  <FolderOpen className="w-4 h-4 shrink-0" />
                  <span className="truncate flex-1 text-left">{album.name}</span>
                  {selectedAlbum === album.id && (
                    <Check className="w-4 h-4 shrink-0 text-indigo-500" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {addToAlbum.error && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">
            {addToAlbum.error.message}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={handleClose}
            disabled={addToAlbum.isPending}
            className="px-4 py-2 text-sm rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedAlbum || addToAlbum.isPending || albums.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {addToAlbum.isPending ? 'Agregando…' : 'Agregar al Album'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
