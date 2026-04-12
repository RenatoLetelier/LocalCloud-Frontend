'use client';

/**
 * Fetches a protected image (one that requires Authorization header) and
 * returns a blob object-URL safe to use as <img src>.
 *
 * Why: the backend proxies thumbnails from the Pi with JWT auth.
 * Browsers don't send custom headers for <img src>, so we must fetch manually.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getToken } from '@/lib/auth';

interface UseAuthImageResult {
  src: string | null;
  loading: boolean;
  error: boolean;
  /** Call to retry a failed fetch */
  retry: () => void;
}

export function useAuthImage(url: string | null | undefined): UseAuthImageResult {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const prevObjectUrl = useRef<string | null>(null);

  const retry = useCallback(() => {
    if (!url) return;
    setError(false);
    setSrc(null);
    setRetryCount((c) => c + 1);
  }, [url]);

  useEffect(() => {
    // Reset state when URL changes
    setSrc(null);
    setError(false);

    if (!url) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();

    (async () => {
      try {
        const token = getToken();
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        // Revoke previous object URL before creating a new one
        if (prevObjectUrl.current) URL.revokeObjectURL(prevObjectUrl.current);
        const objectUrl = URL.createObjectURL(blob);
        prevObjectUrl.current = objectUrl;
        setSrc(objectUrl);
      } catch (err: unknown) {
        // Ignore aborted fetches (component unmounted or URL changed)
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // Ignore generic fetch abort errors (e.g. from React StrictMode)
        if (err instanceof TypeError && (err.message.includes('abort') || err.message.includes('cancel'))) return;
        setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [url, retryCount]);

  // Revoke the last object URL on unmount
  useEffect(() => {
    return () => {
      if (prevObjectUrl.current) URL.revokeObjectURL(prevObjectUrl.current);
    };
  }, []);

  return { src, loading, error, retry };
}
