'use client';

import { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react';
import { useTrash } from '@/hooks/useTrash';
import { useDeleteFiles } from '@/hooks/mutations/useDeleteFiles';
import { showSuccess } from '@/lib/toast';
import { PhotoCard } from './PhotoCard';
import { PhotoGridSkeleton } from './PhotoGridSkeleton';
import { Modal } from '@/components/ui/Modal';

export function TrashView() {
  const { trashedFiles, trashedItems, restoreFiles, emptyTrashMutation } = useTrash();
  const deleteFiles = useDeleteFiles();

  const [selected, setSelected]             = useState<Set<string>>(new Set());
  const [deleteOpen, setDeleteOpen]         = useState(false);
  const [emptyTrashOpen, setEmptyTrashOpen] = useState(false);

  // Map of fileId → daysRemaining
  const daysMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of trashedItems) {
      map.set(item.id, item.daysRemaining);
    }
    return map;
  }, [trashedItems]);

  const selectionMode = selected.size > 0;

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  // ── Actions ───────────────────────────────────────────────────────────────

  function handleRestore() {
    const ids = [...selected];
    restoreFiles(ids);
    clearSelection();
    showSuccess(`${ids.length} archivo${ids.length > 1 ? 's' : ''} restaurado${ids.length > 1 ? 's' : ''}`);
  }

  function handlePermanentDelete() {
    const ids = [...selected];
    deleteFiles.mutate(ids, {
      onSuccess: () => {
        clearSelection();
        setDeleteOpen(false);
      },
    });
  }

  function handleEmptyTrash() {
    emptyTrashMutation.mutate(undefined, {
      onSuccess: () => {
        setEmptyTrashOpen(false);
      },
    });
  }

  return (
    <>
      <div className="flex flex-col min-h-full">
        {/* Toolbar */}
        <div className="sticky top-0 z-10 shrink-0 flex items-center justify-between px-5 py-3 bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
          <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">
            {trashedFiles.length} {trashedFiles.length === 1 ? 'archivo' : 'archivos'} en papelera
          </span>
          {trashedFiles.length > 0 && (
            <button
              onClick={() => setEmptyTrashOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Vaciar papelera
            </button>
          )}
        </div>

        {/* Warning banner */}
        {trashedFiles.length > 0 && (
          <div className="mx-5 mt-3 flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Los archivos en la papelera se eliminarán permanentemente después de 30 días.
              Selecciona archivos para restaurarlos o eliminarlos definitivamente.
            </p>
          </div>
        )}

        {/* Grid */}
        {trashedFiles.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-32 text-gray-400 dark:text-gray-600">
            <Trash2 className="w-14 h-14" />
            <p className="text-sm">La papelera está vacía.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 2xl:grid-cols-11 gap-1 p-3">
            {trashedFiles.map((file) => (
              <div key={file.id} className="relative">
                <PhotoCard
                  file={file}
                  selected={selected.has(file.id)}
                  selectionMode={true}
                  onSelect={toggleSelect}
                />
                {/* Days remaining badge */}
                <div className="absolute bottom-1 right-1 z-10 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm pointer-events-none">
                  <span className="text-[10px] text-white font-medium tabular-nums">
                    {daysMap.get(file.id) ?? 0}d
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selection toolbar */}
      {selectionMode && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-3 py-2 rounded-2xl shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 max-w-[calc(100vw-2rem)]">
          <button
            onClick={clearSelection}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="font-semibold tabular-nums">{selected.size}</span>
            <span className="hidden sm:inline">seleccionados</span>
          </button>

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

          <button
            onClick={handleRestore}
            title="Restaurar"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Restaurar</span>
          </button>

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

          <button
            onClick={() => setDeleteOpen(true)}
            title="Eliminar permanentemente"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Eliminar</span>
          </button>
        </div>
      )}

      {/* Permanent delete confirmation */}
      <Modal
        open={deleteOpen}
        onClose={() => !deleteFiles.isPending && setDeleteOpen(false)}
        title="Eliminar permanentemente"
      >
        <div className="p-5 flex flex-col gap-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ¿Estás seguro de que quieres eliminar permanentemente{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {selected.size} archivo{selected.size !== 1 ? 's' : ''}
            </span>
            ? Esta acción <strong>no se puede deshacer</strong>.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDeleteOpen(false)}
              disabled={deleteFiles.isPending}
              className="px-4 py-2 text-sm rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handlePermanentDelete}
              disabled={deleteFiles.isPending}
              className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {deleteFiles.isPending ? 'Eliminando…' : 'Eliminar definitivamente'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Empty trash confirmation */}
      <Modal
        open={emptyTrashOpen}
        onClose={() => !emptyTrashMutation.isPending && setEmptyTrashOpen(false)}
        title="Vaciar papelera"
      >
        <div className="p-5 flex flex-col gap-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ¿Estás seguro de que quieres eliminar permanentemente <strong>todos los {trashedFiles.length} archivos</strong> de la papelera?
            Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEmptyTrashOpen(false)}
              disabled={emptyTrashMutation.isPending}
              className="px-4 py-2 text-sm rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleEmptyTrash}
              disabled={emptyTrashMutation.isPending}
              className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {emptyTrashMutation.isPending ? 'Eliminando…' : 'Sí, vaciar papelera'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
