export const runtime = 'edge';

import { PhotoGrid, type PhotoView } from '@/components/photos/PhotoGrid';
import { AllMediaGrid } from '@/components/photos/AllMediaGrid';
import { TrashView } from '@/components/photos/TrashView';
import { MapViewLoader } from '@/components/photos/MapViewLoader';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

interface Props {
  searchParams: Promise<{ view?: string; album?: string }>;
}

const VALID_VIEWS: PhotoView[] = ['library', 'favorites', 'photos', 'videos', 'timeline'];

export default async function PhotosPage({ searchParams }: Props) {
  const { view, album } = await searchParams;

  if (view === 'all') {
    return (
      <ErrorBoundary>
        <AllMediaGrid />
      </ErrorBoundary>
    );
  }

  if (view === 'trash') {
    return (
      <ErrorBoundary>
        <TrashView />
      </ErrorBoundary>
    );
  }

  if (view === 'map') {
    return (
      <ErrorBoundary>
        <MapViewLoader />
      </ErrorBoundary>
    );
  }

  const resolvedView: PhotoView = VALID_VIEWS.includes(view as PhotoView)
    ? (view as PhotoView)
    : 'library';

  return (
    <ErrorBoundary>
      <PhotoGrid view={resolvedView} albumId={album} />
    </ErrorBoundary>
  );
}
