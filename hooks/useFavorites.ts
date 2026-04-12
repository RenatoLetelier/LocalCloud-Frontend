'use client';

/**
 * Persists favorite file IDs in localStorage.
 * (Favorites are client-side only — no backend support yet.)
 */

import { useCallback, useEffect, useState } from 'react';

const KEY = 'lc_favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) setFavorites(new Set(JSON.parse(stored) as string[]));
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const isFavorite = useCallback((id: string) => favorites.has(id), [favorites]);

  return { favorites, toggle, isFavorite };
}
