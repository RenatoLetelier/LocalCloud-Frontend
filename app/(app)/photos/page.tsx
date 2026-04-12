export const runtime = 'edge';

import { PhotoGrid, type PhotoView } from '@/components/photos/PhotoGrid';
import { AllMediaGrid } from '@/components/photos/AllMediaGrid';
import { TrashView } from '@/components/photos/TrashView';
import { MapViewLoader } from '@/components/photos/MapViewLoader';

interface Props {
  searchParams: Promise<{ view?: string; album?: string }>;
}

const VALID_VIEWS: PhotoView[] = ['library', 'favorites', 'photos', 'videos', 'timeline'];

export default async function PhotosPage({ searchParams }: Props) {
  const { view, album } = await searchParams;

  // Admin-only "All Media" view — renders its own grid with infinite scroll
  if (view === 'all') {
    return <AllMediaGrid />;
  }

  // Trash view — shows soft-deleted files with restore/permanent delete
  if (view === 'trash') {
    return <TrashView />;
  }

  // Map view — shows photos on a map with location editing
  if (view === 'map') {
    return <MapViewLoader />;
  }

  const resolvedView: PhotoView = VALID_VIEWS.includes(view as PhotoView)
    ? (view as PhotoView)
    : 'library';

  return <PhotoGrid view={resolvedView} albumId={album} />;
}
