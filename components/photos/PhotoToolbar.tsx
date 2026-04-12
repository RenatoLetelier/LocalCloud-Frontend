'use client';

import { useState } from 'react';
import { Search, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PhotoView } from './PhotoGrid';

const VIEW_LABELS: Record<PhotoView, (n: number) => string> = {
  library:   (n) => `${n} ${n === 1 ? 'item'      : 'items'}`,
  favorites: (n) => `${n} ${n === 1 ? 'favorito'  : 'favoritos'}`,
  photos:    (n) => `${n} ${n === 1 ? 'foto'      : 'fotos'}`,
  videos:    (n) => `${n} ${n === 1 ? 'video'     : 'videos'}`,
  timeline:  (n) => `${n} ${n === 1 ? 'archivo'   : 'archivos'}`,
};

interface Props {
  view: PhotoView;
  count: number;
  loading?: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onUpload: () => void;
}

export function PhotoToolbar({ view, count, loading = false, searchQuery, onSearchChange, onUpload }: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const label = loading ? '—' : VIEW_LABELS[view](count);

  function handleCloseSearch() {
    onSearchChange('');
    setSearchOpen(false);
  }

  return (
    <div className="
      sticky top-0 z-10 shrink-0
      flex items-center gap-2
      px-5 py-3
      bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur-sm
      border-b border-gray-200 dark:border-gray-800
    ">
      {/* Count label */}
      <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums shrink-0">
        {label}
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search bar — desktop: always available / mobile: toggle */}
      {searchOpen ? (
        <div className="flex items-center gap-1.5 flex-1 max-w-xs">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar por nombre..."
              autoFocus
              className={cn(
                'w-full pl-8 pr-3 py-1.5 text-sm rounded-lg',
                'bg-white dark:bg-gray-800',
                'border border-gray-300 dark:border-gray-600',
                'text-gray-900 dark:text-gray-100',
                'placeholder-gray-400 dark:placeholder-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
              )}
            />
          </div>
          <button
            onClick={handleCloseSearch}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Cerrar búsqueda"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          {/* Desktop search — always visible */}
          <div className="relative hidden sm:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar..."
              className={cn(
                'w-44 lg:w-56 pl-8 pr-3 py-1.5 text-sm rounded-lg',
                'bg-white dark:bg-gray-800',
                'border border-gray-300 dark:border-gray-600',
                'text-gray-900 dark:text-gray-100',
                'placeholder-gray-400 dark:placeholder-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                'transition-all',
              )}
            />
          </div>
          {/* Mobile search toggle */}
          <button
            onClick={() => setSearchOpen(true)}
            className="sm:hidden p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Buscar"
          >
            <Search className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Upload button */}
      <button
        onClick={onUpload}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shrink-0"
      >
        <Upload className="w-4 h-4" />
        <span className="hidden sm:inline">Subir</span>
      </button>
    </div>
  );
}
