import { toast } from 'sonner';

/**
 * Thin wrappers around sonner's toast so we can swap the library later
 * without changing every callsite in the codebase.
 */

export function showSuccess(message: string) {
  toast.success(message);
}

export function showError(message: string) {
  toast.error(message);
}

export function showInfo(message: string) {
  toast.info(message);
}

export function showWarning(message: string) {
  toast.warning(message);
}

/**
 * Toast with an undo action button.
 * Returns a dismiss function so you can close it programmatically.
 */
export function showUndoToast(message: string, onUndo: () => void) {
  return toast(message, {
    action: {
      label: 'Deshacer',
      onClick: onUndo,
    },
    duration: 6000,
  });
}
