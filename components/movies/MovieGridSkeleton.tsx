'use client';

import { Skeleton } from '@/components/ui/Skeleton';

interface Props {
  count?: number;
}

/** Skeleton placeholder matching the movie grid layout */
export function MovieGridSkeleton({ count = 12 }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col rounded-xl overflow-hidden">
          {/* Poster skeleton (3:4 ratio) */}
          <Skeleton className="w-full rounded-b-none" style={{ paddingTop: '150%' }} />
          {/* Info skeleton */}
          <div className="p-3 bg-gray-100 dark:bg-gray-800 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
