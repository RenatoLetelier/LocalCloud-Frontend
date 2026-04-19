'use client';

import { useCallback, useMemo, useState } from 'react';
import { useFiles } from '@/hooks/queries/useFiles';
import { useDebounce } from '@/hooks/useDebounce';
import { useFavorites } from '@/hooks/useFavorites';
import { useTrash } from '@/hooks/useTrash';
import { showSuccess, showUndoToast } from '@/lib/toast';
import type { FileRecord } from '@/lib/types';
import { PhotoCard } from './PhotoCard';
import { PhotoToolbar } from './PhotoToolbar';
import { PhotoGridSkeleton } from './PhotoGridSkeleton';
import { EmptyState } from './EmptyState';
import { DateGroupedView } from './DateGroupedView';
import { Lightbox } from './Lightbox';
import { SelectionToolbar } from './SelectionToolbar';
import { AddToAlbumModal } from './AddToAlbumModal';
import { UploadModal } from './UploadModal';
import { ErrorMessage } from '@/components/ui/ErrorMessage';

export type PhotoView = 'library' | 'favorites' | 'photos' | 'videos' | 'timeline';

interface Props {
  view?: PhotoView;
  albumId?: string;
}

export function PhotoGrid({ view = 'library', albumId }: Props) {
  // ── Data (React Query) ─────────────────────────────────────────────────────
  const { data: files = [], isLoading, error, refetch } = useFiles();
  const { trashedIds, trashFiles, restoreFiles } = useTrash();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [uploadOpen, setUploadOpen]         = useState(false);
  const [lightboxIndex, setLightboxIndex]   = useState<number | null>(null);
  const [selected, setSelected]             = useState<Set<string>>(new Set());
  const [addToAlbumOpen, setAddToAlbumOpen] = useState(false);
  const [searchQuery, setSearchQuery]       = useState('');

  const debouncedSearch = useDebounce(searchQuery, 300);
  const { favoriteIds, toggle: toggleFavorite, isFavorite } = useFavorites();

  // ── Filter displayed files (exclude trashed) ───────────────────────────────
  const displayed = useMemo(() => {
    // First exclude trashed files from all views
    const active = files.filter((f) => !trashedIds.has(f.id));
    let result: FileRecord[];

    if (albumId) {
      result = active.filter((f) => f.albumId === albumId);
    } else {
      switch (view) {
        case 'photos':    result = active.filter((f) => f.type === 'photo'); break;
        case 'videos':    result = active.filter((f) => f.type === 'video'); break;
        case 'favorites': result = active.filter((f) => favoriteIds.has(f.id)); break;
        case 'timeline':  result = [...active]; break;
        default:          result = active;
      }
    }

    // Apply search filter
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      result = result.filter((f) => f.name.toLowerCase().includes(q));
    }

    return result;
  }, [files, view, albumId, favoriteIds, debouncedSearch, trashedIds]);

  // ── Selection helpers ─────────────────────────────────────────────────────
  const selectionMode = selected.size > 0;

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  // ── Lightbox ──────────────────────────────────────────────────────────────
  const openLightbox = useCallback((file: FileRecord) => {
    const idx = displayed.findIndex((f) => f.id === file.id);
    if (idx !== -1) setLightboxIndex(idx);
  }, [displayed]);

  // ── Selection actions ─────────────────────────────────────────────────────
  const handleFavoriteSelected = useCallback(() => {
    selected.forEach((id) => toggleFavorite(id));
    clearSelection();
  }, [selected, toggleFavorite, clearSelection]);

  function handleMoveToTrash() {
    const ids = [...selected];
    trashFiles(ids);
    clearSelection();
    showUndoToast(
      `${ids.length} archivo${ids.length > 1 ? 's' : ''} movido${ids.length > 1 ? 's' : ''} a la papelera`,
      () => restoreFiles(ids),
    );
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const activeView: PhotoView = albumId ? 'library' : view;
  const isTimeline = view === 'timeline' && !albumId;

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) return <PhotoGridSkeleton />;

  return (
    <>
      <div className="flex flex-col min-h-full">
        <PhotoToolbar
          view={activeView}
          count={displayed.length}
          loading={isLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onUpload={() => setUploadOpen(true)}
        />

        {error ? (
          <ErrorMessage message={error.message} onRetry={() => refetch()} />
        ) : displayed.length === 0 ? (
          debouncedSearch.trim() ? (
            <div className="flex flex-col items-center gap-3 py-32 text-gray-400 dark:text-gray-600">
              <p className="text-sm">No se encontraron resultados para &quot;{debouncedSearch}&quot;</p>
            </div>
          ) : (
            <EmptyState view={activeView} />
          )
        ) : isTimeline ? (
          <DateGroupedView
            files={displayed}
            isFavorite={isFavorite}
            selected={selected}
            selectionMode={selectionMode}
            onToggleFavorite={toggleFavorite}
            onSelect={toggleSelect}
            onClick={openLightbox}
          />
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 2xl:grid-cols-11 gap-1 p-3">
            {displayed.map((file) => (
              <PhotoCard
                key={file.id}
                file={file}
                isFavorite={isFavorite(file.id)}
                selected={selected.has(file.id)}
                selectionMode={selectionMode}
                selectedIds={selected}
                onToggleFavorite={toggleFavorite}
                onSelect={toggleSelect}
                onClick={openLightbox}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          files={displayed}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}

      {/* Floating selection toolbar */}
      {selectionMode && (
        <SelectionToolbar
          count={selected.size}
          onClear={clearSelection}
          onAddToAlbum={() => setAddToAlbumOpen(true)}
          onFavorite={handleFavoriteSelected}
          onDelete={handleMoveToTrash}
        />
      )}

      {/* Upload modal */}
      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
      />

      {/* Add to album modal */}
      <AddToAlbumModal
        open={addToAlbumOpen}
        selectedIds={[...selected]}
        onClose={() => setAddToAlbumOpen(false)}
        onDone={clearSelection}
      />

      {/* Delete confirmation removed — files go to trash with undo toast */}
    </>
  );
}
