'use client';

import dynamic from 'next/dynamic';

const MapView = dynamic(
  () => import('@/components/photos/MapView').then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  },
);

export function MapViewLoader() {
  return <MapView />;
}
