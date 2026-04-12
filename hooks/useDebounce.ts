'use client';

import { useEffect, useState } from 'react';

/**
 * Debounces a value by the given delay (ms).
 * Useful for search inputs to avoid filtering on every keystroke.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
