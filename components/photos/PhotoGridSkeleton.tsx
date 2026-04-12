'use client';

import { Skeleton } from '@/components/ui/Skeleton';

interface Props {
  count?: number;
}

/** Skeleton placeholder matching the photo grid layout */
export function PhotoGridSkeleton({ count = 24 }: Props) {
  return (
    <div className="flex flex-col min-h-full">
      {/* Toolbar skeleton */}
      <div className="sticky top-0 z-10 shrink-0 flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-800">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 2xl:grid-cols-11 gap-1 p-3">
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="aspect-square" />
        ))}
      </div>
    </div>
  );
}
