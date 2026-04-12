'use client';

import { useMemo } from 'react';
import type { FileRecord } from '@/lib/types';
import { PhotoCard } from './PhotoCard';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

interface DateGroup {
  key: string;       // e.g. "2026-03"
  label: string;     // e.g. "Marzo 2026"
  files: FileRecord[];
}

interface Props {
  files: FileRecord[];
  isFavorite: (id: string) => boolean;
  selected: Set<string>;
  selectionMode: boolean;
  onToggleFavorite: (id: string) => void;
  onSelect: (id: string) => void;
  onClick: (file: FileRecord) => void;
}

export function DateGroupedView({
  files,
  isFavorite,
  selected,
  selectionMode,
  onToggleFavorite,
  onSelect,
  onClick,
}: Props) {
  const groups = useMemo(() => {
    const map = new Map<string, FileRecord[]>();

    // Sort files by date descending (newest first)
    const sorted = [...files].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    for (const file of sorted) {
      const date = new Date(file.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(file);
    }

    const result: DateGroup[] = [];
    for (const [key, groupFiles] of map) {
      const [year, month] = key.split('-').map(Number);
      result.push({
        key,
        label: `${MONTH_NAMES[month]} ${year}`,
        files: groupFiles,
      });
    }

    return result;
  }, [files]);

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-32 text-gray-400 dark:text-gray-600">
        <p className="text-sm">No hay archivos para mostrar en la línea de tiempo.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {groups.map((group) => (
        <section key={group.key}>
          {/* Sticky month/year header */}
          <div className="sticky top-0 z-[5] px-5 py-2 bg-gray-50/90 dark:bg-gray-950/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {group.label}
              <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                {group.files.length} {group.files.length === 1 ? 'archivo' : 'archivos'}
              </span>
            </h3>
          </div>

          {/* Photo grid for this month */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 2xl:grid-cols-11 gap-1 p-3">
            {group.files.map((file) => (
              <PhotoCard
                key={file.id}
                file={file}
                isFavorite={isFavorite(file.id)}
                selected={selected.has(file.id)}
                selectionMode={selectionMode}
                selectedIds={selected}
                onToggleFavorite={onToggleFavorite}
                onSelect={onSelect}
                onClick={onClick}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
