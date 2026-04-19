'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Heart, ImageIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthImage } from '@/hooks/useAuthImage';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import type { FileRecord } from '@/lib/types';

interface Props {
  file: FileRecord;
  isFavorite?: boolean;
  selected?: boolean;
  selectionMode?: boolean;
  /** IDs currently selected — used when dragging to include all selected items */
  selectedIds?: Set<string>;
  onToggleFavorite?: (id: string) => void;
  onSelect?: (id: string) => void;
  onClick?: (file: FileRecord) => void;
}

export const PhotoCard = memo(function PhotoCard({
  file,
  isFavorite = false,
  selected = false,
  selectionMode = false,
  selectedIds,
  onToggleFavorite,
  onSelect,
  onClick,
}: Props) {
  // Lazy load: only build the thumbnail URL once the card is near the viewport
  const cardRef = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const thumbUrl = visible && file.thumbPath
    ? api.pi.thumbUrl(file.userId, file.thumbPath)
    : null;
  const { src, loading, error, retry } = useAuthImage(thumbUrl);

  function handleClick() {
    if (selectionMode) onSelect?.(file.id);
    else onClick?.(file);
  }

  function handleDragStart(e: React.DragEvent) {
    // If this card is selected, drag all selected IDs; otherwise just this one
    const ids = selected && selectedIds && selectedIds.size > 0
      ? [...selectedIds]
      : [file.id];
    e.dataTransfer.setData('application/lc-file-ids', JSON.stringify(ids));
    e.dataTransfer.effectAllowed = 'copy';

    // Custom drag image with count badge
    if (ids.length > 1) {
      const badge = document.createElement('div');
      badge.textContent = `${ids.length} fotos`;
      badge.style.cssText = 'padding:6px 12px;background:#6366f1;color:white;border-radius:8px;font-size:13px;font-weight:600;position:fixed;top:-100px;left:-100px;';
      document.body.appendChild(badge);
      e.dataTransfer.setDragImage(badge, badge.offsetWidth / 2, badge.offsetHeight / 2);
      requestAnimationFrame(() => document.body.removeChild(badge));
    }
  }

  return (
    <button
      ref={cardRef}
      type="button"
      onClick={handleClick}
      draggable
      onDragStart={handleDragStart}
      className={cn(
        // base
        'group relative w-full aspect-square rounded-xl overflow-hidden cursor-pointer text-left',
        'bg-gray-100 dark:bg-gray-800',
        'transition-all duration-200 focus-visible:outline-none',
        // selection / hover ring
        selected
          ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-950'
          : 'ring-1 ring-gray-200 dark:ring-gray-700 hover:ring-indigo-400 dark:hover:ring-indigo-500 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-indigo-500',
      )}
    >
      {/* Thumbnail */}
      {loading && (
        <Skeleton className="absolute inset-0 rounded-none" />
      )}

      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={file.name}
          className={cn(
            'absolute inset-0 w-full h-full object-cover',
            !selectionMode && 'group-hover:scale-105',
            'transition-transform duration-300',
          )}
          draggable={false}
        />
      )}

      {/* Error state with retry */}
      {error && !loading && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-amber-500 dark:text-amber-400 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); retry(); }}
          title="Error al cargar. Clic para reintentar."
        >
          <AlertTriangle className="w-6 h-6" />
          <span className="text-[10px]">Reintentar</span>
        </div>
      )}

      {/* Placeholder when no thumb available */}
      {!src && !loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-200 dark:bg-gray-700">
          <ImageIcon className="w-8 h-8" />
        </div>
      )}

      {/* Selection tint */}
      {selected && (
        <div className="absolute inset-0 bg-indigo-500/20 pointer-events-none" />
      )}

      {/* Filename overlay (hover, hidden in selection mode) */}
      {!selectionMode && (
        <div className="
          absolute inset-x-0 bottom-0 p-2 pointer-events-none
          bg-gradient-to-t from-black/70 to-transparent
          opacity-0 group-hover:opacity-100 transition-opacity
        ">
          <p className="text-xs text-white truncate">{file.name}</p>
        </div>
      )}

      {/* Checkbox (top-left) */}
      <span
        role="checkbox"
        aria-checked={selected}
        onClick={(e) => { e.stopPropagation(); onSelect?.(file.id); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onSelect?.(file.id); } }}
        tabIndex={-1}
        className={cn(
          'absolute top-2 left-2 z-10',
          'w-5 h-5 rounded-full border-2',
          'flex items-center justify-center',
          'transition-all duration-150',
          selected
            ? 'opacity-100 bg-indigo-500 border-indigo-500 shadow'
            : 'opacity-0 group-hover:opacity-100 bg-black/30 border-white backdrop-blur-sm',
        )}
      >
        {selected && (
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>

      {/* Favorite button (top-right, hidden in selection mode) */}
      {onToggleFavorite && !selectionMode && (
        <span
          role="button"
          aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(file.id); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onToggleFavorite(file.id); } }}
          tabIndex={-1}
          className={cn(
            'absolute top-2 right-2 z-10 p-1.5 rounded-full backdrop-blur-sm transition-all',
            'opacity-0 group-hover:opacity-100',
            isFavorite
              ? 'bg-red-500/80 text-white !opacity-100'
              : 'bg-black/30 text-white hover:bg-black/50',
          )}
        >
          <Heart className={cn('w-3.5 h-3.5', isFavorite && 'fill-current')} />
        </span>
      )}
    </button>
  );
});
