'use client';

import { FolderPlus, Heart, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  count: number;
  onClear: () => void;
  onAddToAlbum: () => void;
  onFavorite: () => void;
  onDelete: () => void;
}

export function SelectionToolbar({ count, onClear, onAddToAlbum, onFavorite, onDelete }: Props) {
  return (
    <div className="
      fixed bottom-4 left-1/2 -translate-x-1/2 z-30
      flex items-center gap-1
      px-3 py-2 rounded-2xl shadow-2xl
      bg-white dark:bg-gray-900
      border border-gray-200 dark:border-gray-700
      max-w-[calc(100vw-2rem)]
    ">
      {/* Count + clear */}
      <button
        onClick={onClear}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <X className="w-4 h-4" />
        <span className="font-semibold tabular-nums">{count}</span>
        <span className="hidden sm:inline">selected</span>
      </button>

      <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

      <ToolbarAction
        icon={<FolderPlus className="w-4 h-4" />}
        label="Add to Album"
        onClick={onAddToAlbum}
      />
      <ToolbarAction
        icon={<Heart className="w-4 h-4" />}
        label="Favorite"
        onClick={onFavorite}
      />

      <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

      <ToolbarAction
        icon={<Trash2 className="w-4 h-4" />}
        label="Delete"
        onClick={onDelete}
        danger
      />
    </div>
  );
}

function ToolbarAction({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors',
        danger
          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400'
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white',
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
