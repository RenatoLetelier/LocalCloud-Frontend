'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Client-side trash system using localStorage.
 *
 * When a file is "deleted", it's moved to trash (stored in localStorage).
 * The actual API delete is NOT called — the file stays on the server.
 * After 30 days, items are auto-purged (permanently deleted via API).
 *
 * Shape stored: { [fileId]: deletedAt (ISO string) }
 */

const STORAGE_KEY = 'lc_trash';
const TRASH_DAYS = 30;

export interface TrashedItem {
  id: string;
  deletedAt: string;
  daysRemaining: number;
}

function loadTrash(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveTrash(data: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getDaysRemaining(deletedAt: string): number {
  const elapsed = Date.now() - new Date(deletedAt).getTime();
  const days = Math.ceil((TRASH_DAYS * 24 * 60 * 60 * 1000 - elapsed) / (24 * 60 * 60 * 1000));
  return Math.max(0, days);
}

export function useTrash() {
  const [trashMap, setTrashMap] = useState<Record<string, string>>({});

  // Load from localStorage on mount
  useEffect(() => {
    setTrashMap(loadTrash());
  }, []);

  /** Move file IDs to trash */
  const trashFiles = useCallback((ids: string[]) => {
    setTrashMap((prev) => {
      const next = { ...prev };
      const now = new Date().toISOString();
      for (const id of ids) {
        next[id] = now;
      }
      saveTrash(next);
      return next;
    });
  }, []);

  /** Restore file IDs from trash */
  const restoreFiles = useCallback((ids: string[]) => {
    setTrashMap((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        delete next[id];
      }
      saveTrash(next);
      return next;
    });
  }, []);

  /** Remove a file ID from trash tracking (after permanent delete) */
  const removeFromTrash = useCallback((ids: string[]) => {
    setTrashMap((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        delete next[id];
      }
      saveTrash(next);
      return next;
    });
  }, []);

  /** Check if a file ID is in trash */
  const isTrashed = useCallback((id: string): boolean => {
    return id in trashMap;
  }, [trashMap]);

  /** Get all trashed item IDs */
  const trashedIds = new Set(Object.keys(trashMap));

  /** Get trashed items with metadata */
  const trashedItems: TrashedItem[] = Object.entries(trashMap).map(([id, deletedAt]) => ({
    id,
    deletedAt,
    daysRemaining: getDaysRemaining(deletedAt),
  }));

  /** Get IDs of items expired (0 days remaining) — ready for permanent delete */
  const expiredIds = trashedItems
    .filter((item) => item.daysRemaining <= 0)
    .map((item) => item.id);

  const trashCount = trashedIds.size;

  return {
    trashMap,
    trashedIds,
    trashedItems,
    trashCount,
    expiredIds,
    isTrashed,
    trashFiles,
    restoreFiles,
    removeFromTrash,
  };
}
