'use client';

import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  count: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function MovieToolbar({
  count,
  searchQuery,
  onSearchChange,
  categories,
  selectedCategory,
  onCategoryChange,
}: Props) {
  const [searchOpen, setSearchOpen] = useState(false);

  function handleCloseSearch() {
    onSearchChange('');
    setSearchOpen(false);
  }

  return (
    <div className="flex flex-col gap-3 px-6 pt-6 pb-2">
      <div className="flex items-center gap-2">
        {/* Count */}
        <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums shrink-0">
          {count} {count === 1 ? 'película' : 'películas'}
        </span>

        <div className="flex-1" />

        {/* Search */}
        {searchOpen ? (
          <div className="flex items-center gap-1.5 flex-1 max-w-xs">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar por título..."
                autoFocus
                className={cn(
                  'w-full pl-8 pr-3 py-1.5 text-sm rounded-lg',
                  'bg-white dark:bg-gray-800',
                  'border border-gray-300 dark:border-gray-600',
                  'text-gray-900 dark:text-gray-100',
                  'placeholder-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                )}
              />
            </div>
            <button
              onClick={handleCloseSearch}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            {/* Desktop search */}
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
                  'placeholder-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                )}
              />
            </div>
            {/* Mobile search toggle */}
            <button
              onClick={() => setSearchOpen(true)}
              className="sm:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Category filters */}
      {categories.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <CategoryPill
            label="Todas"
            active={selectedCategory === ''}
            onClick={() => onCategoryChange('')}
          />
          {categories.map((cat) => (
            <CategoryPill
              key={cat}
              label={cat}
              active={selectedCategory === cat}
              onClick={() => onCategoryChange(cat)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize',
        active
          ? 'bg-indigo-600 text-white'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
      )}
    >
      {label}
    </button>
  );
}
