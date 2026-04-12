'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import type { FileRecord, UserPublic } from '@/lib/types';
import { PhotoCard } from './PhotoCard';
import { Lightbox } from './Lightbox';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const USERS_PER_BATCH = 3; // how many users' files to fetch per scroll trigger

export function AllMediaGrid() {
  const { user } = useAuth();

  const [users, setUsers]               = useState<UserPublic[]>([]);
  const [files, setFiles]               = useState<FileRecord[]>([]);
  const [usersReady, setUsersReady]     = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError]     = useState<string | null>(null);
  const [hasMore, setHasMore]           = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Use refs to avoid stale closures in the observer callback
  const pageRef       = useRef(0);       // how many batches have been fetched
  const loadingRef    = useRef(false);   // guard against concurrent loads
  const usersRef      = useRef<UserPublic[]>([]);

  // ── 1. Fetch user list once ────────────────────────────────────────────────
  useEffect(() => {
    api.users.list()
      .then((list) => {
        usersRef.current = list;
        setUsers(list);
        setUsersReady(true);
      })
      .catch(() => setUsersReady(true)); // still mark ready so UI shows error
  }, []);

  // ── 2. Load one batch of files ─────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;

    const all = usersRef.current;
    const offset = pageRef.current * USERS_PER_BATCH;
    if (offset >= all.length) { setHasMore(false); return; }

    loadingRef.current = true;
    setBatchLoading(true);
    setBatchError(null);

    const batch = all.slice(offset, offset + USERS_PER_BATCH);
    try {
      const results = await Promise.all(batch.map((u) => api.files.list(u.id)));
      setFiles((prev) => [...prev, ...results.flat()]);
      pageRef.current += 1;
      if (pageRef.current * USERS_PER_BATCH >= all.length) setHasMore(false);
    } catch (err) {
      setBatchError(err instanceof Error ? err.message : 'Failed to load some files');
    } finally {
      setBatchLoading(false);
      loadingRef.current = false;
    }
  }, []); // no deps — reads everything from refs

  // ── 3. Kick off first batch when users are ready ───────────────────────────
  useEffect(() => {
    if (usersReady && usersRef.current.length > 0) loadMore();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usersReady]);

  // ── 4. Infinite scroll via IntersectionObserver ────────────────────────────
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasMore) loadMore(); },
      { rootMargin: '300px' }, // start loading 300 px before sentinel appears
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  // ── Guard: admins only ─────────────────────────────────────────────────────
  if (user && user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center gap-3 py-32 text-gray-400 dark:text-gray-600">
        <ShieldAlert className="w-14 h-14" />
        <p className="text-sm">This view is only available to admins.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col min-h-full">

        {/* ── Toolbar ── */}
        <div className="
          sticky top-0 z-10 shrink-0
          flex items-center justify-between
          px-5 py-3
          bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur-sm
          border-b border-gray-200 dark:border-gray-800
        ">
          <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">
            {files.length} items
            {hasMore && (
              <span className="ml-1 text-gray-400 dark:text-gray-600">· loading more…</span>
            )}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-600">
            All users · Admin view
          </span>
        </div>

        {/* ── Initial loading ── */}
        {!usersReady && (
          <div className="flex items-center justify-center py-32">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* ── Grid ── */}
        {files.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 2xl:grid-cols-11 gap-1 p-3">
            {files.map((file, idx) => (
              <PhotoCard
                key={`${file.id}-${idx}`}
                file={file}
                onClick={(f) => {
                  const i = files.findIndex((x) => x.id === f.id);
                  if (i !== -1) setLightboxIndex(i);
                }}
              />
            ))}
          </div>
        )}

        {/* ── Sentinel ── */}
        <div ref={sentinelRef} className="h-20 flex items-center justify-center shrink-0">
          {batchLoading && <LoadingSpinner size="md" />}
          {batchError && !batchLoading && (
            <button
              onClick={loadMore}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              {batchError} — tap to retry
            </button>
          )}
          {!hasMore && files.length > 0 && !batchError && (
            <p className="text-xs text-gray-400 dark:text-gray-600">All media loaded</p>
          )}
        </div>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          files={files}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  );
}
