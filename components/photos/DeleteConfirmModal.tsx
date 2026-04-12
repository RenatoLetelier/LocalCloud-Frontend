'use client';

import { Modal } from '@/components/ui/Modal';

interface Props {
  open: boolean;
  count: number;
  deleting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmModal({ open, count, deleting, error, onClose, onConfirm }: Props) {
  return (
    <Modal
      open={open}
      onClose={() => !deleting && onClose()}
      title="Eliminar fotos"
    >
      <div className="p-5 flex flex-col gap-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          ¿Estás seguro de que quieres eliminar{' '}
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {count} foto{count !== 1 ? 's' : ''}
          </span>
          ? Esta acción es permanente y no se puede deshacer.
        </p>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 text-sm rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {deleting ? 'Eliminando…' : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
