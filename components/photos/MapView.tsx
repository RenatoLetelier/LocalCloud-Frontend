'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { MapPin, X, Trash2 } from 'lucide-react';
import { useFiles } from '@/hooks/queries/useFiles';
import { useUpdateFileLocation, useRemoveFileLocation } from '@/hooks/mutations/useFileLocation';
import { useTrash } from '@/hooks/useTrash';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import type { FileRecord } from '@/lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fetch a thumbnail with auth and return an object URL */
async function fetchThumbBlobUrl(url: string): Promise<string | null> {
  try {
    const token = getToken();
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MapView() {
  const { data: files = [], isLoading, error, refetch } = useFiles();
  const { isTrashed } = useTrash();
  const updateLocation = useUpdateFileLocation();
  const removeLocation = useRemoveFileLocation();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const thumbCacheRef = useRef<Map<string, string>>(new Map());
  const mapReadyRef = useRef(false);

  const [placingFile, setPlacingFile] = useState<FileRecord | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);

  // Active files (not trashed)
  const activeFiles = useMemo(
    () => files.filter((f) => !isTrashed(f.id)),
    [files, isTrashed],
  );

  const filesWithLocations = useMemo(
    () => activeFiles.filter((f) => f.latitude != null && f.longitude != null),
    [activeFiles],
  );

  const filesWithoutLocations = useMemo(
    () => activeFiles.filter((f) => f.latitude == null || f.longitude == null),
    [activeFiles],
  );

  // ── Update markers on the map ──────────────────────────────────────────────
  const updateMarkers = useCallback(async () => {
    if (!mapInstanceRef.current || !mapReadyRef.current) return;

    const L = (await import('leaflet')).default;
    const map = mapInstanceRef.current;

    // Track which file IDs should have markers
    const activeIds = new Set(filesWithLocations.map((f) => f.id));

    // Remove markers for files that no longer have locations
    markersRef.current.forEach((marker, id) => {
      if (!activeIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Add/update markers
    const bounds: [number, number][] = [];

    for (const file of filesWithLocations) {
      const lat = file.latitude!;
      const lng = file.longitude!;
      bounds.push([lat, lng]);

      // If marker already exists at correct position, skip
      const existing = markersRef.current.get(file.id);
      if (existing) {
        const pos = existing.getLatLng();
        if (Math.abs(pos.lat - lat) < 0.0001 && Math.abs(pos.lng - lng) < 0.0001) {
          continue;
        }
        existing.setLatLng([lat, lng]);
        continue;
      }

      // Create marker with default icon first
      const marker = L.marker([lat, lng]).addTo(map);
      marker.bindPopup(`<b>${file.name}</b><br/>${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      marker.on('click', () => setSelectedFile(file));
      markersRef.current.set(file.id, marker);

      // Load real thumbnail async and update the marker icon
      const thumbUrl = file.thumbPath
        ? api.pi.thumbUrl(file.userId, file.thumbPath)
        : null;

      if (thumbUrl) {
        // Check cache first
        const cached = thumbCacheRef.current.get(file.id);
        if (cached) {
          marker.setIcon(createThumbIcon(L, cached));
        } else {
          fetchThumbBlobUrl(thumbUrl).then((blobUrl) => {
            if (blobUrl) {
              thumbCacheRef.current.set(file.id, blobUrl);
              // Only update if marker still exists
              if (markersRef.current.has(file.id)) {
                marker.setIcon(createThumbIcon(L, blobUrl));
              }
            }
          });
        }
      }
    }

    // Fit bounds on first load (when we have markers and map was just initialized)
    if (bounds.length === 1) {
      map.setView(bounds[0], 13);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [filesWithLocations]);

  // ── Initialize map ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let cancelled = false;

    const init = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (cancelled || !mapContainerRef.current) return;

      delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if ((mapContainerRef.current as HTMLElement & { _leaflet_id?: number })._leaflet_id) {
        return;
      }

      const map = L.map(mapContainerRef.current, {
        center: [-33.4489, -70.6693],
        zoom: 4,
        zoomControl: true,
        scrollWheelZoom: true,
        dragging: true,
        touchZoom: true,
      });
      mapInstanceRef.current = map;
      mapReadyRef.current = true;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Handle click for placing photos
      map.on('click', (e: L.LeafletMouseEvent) => {
        // We use a custom event to communicate with React state
        const event = new CustomEvent('lc-map-click', {
          detail: { lat: e.latlng.lat, lng: e.latlng.lng },
        });
        window.dispatchEvent(event);
      });

      // Load markers after map is ready
      updateMarkers();
    };

    init();

    return () => {
      cancelled = true;
      mapReadyRef.current = false;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update markers when files/locations change ──────────────────────────────
  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  // ── Handle map clicks for placement mode ────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const { lat, lng } = (e as CustomEvent).detail;
      // Read placingFile from ref to get latest value
      setPlacingFile((current) => {
        if (current) {
          updateLocation.mutate({
            fileId: current.id,
            latitude: lat,
            longitude: lng,
          });
          return null; // Exit placement mode
        }
        return current;
      });
    };

    window.addEventListener('lc-map-click', handler);
    return () => window.removeEventListener('lc-map-click', handler);
  }, [updateLocation]);

  // ── Change cursor when in placement mode ────────────────────────────────────
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;
    container.style.cursor = placingFile ? 'crosshair' : '';
  }, [placingFile]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorMessage message={error.message} onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)]">
      {/* Map */}
      <div className="flex-1 relative min-h-[400px]">
        <div ref={mapContainerRef} className="absolute inset-0 z-0" />

        {/* Stats overlay */}
        <div className="absolute top-4 left-4 z-[1000] bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg pointer-events-none">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            <span className="text-indigo-600 dark:text-indigo-400">{filesWithLocations.length}</span>
            {' '}foto{filesWithLocations.length !== 1 ? 's' : ''} en el mapa
          </p>
        </div>

        {/* Placement mode banner */}
        {placingFile && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-indigo-600 text-white rounded-lg px-4 py-2.5 shadow-lg flex items-center gap-3">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium truncate max-w-[200px]">
              Haz click en el mapa para ubicar: <strong>{placingFile.name}</strong>
            </span>
            <button
              onClick={() => setPlacingFile(null)}
              className="p-1 rounded hover:bg-white/20 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Selected file popup */}
        {selectedFile && selectedFile.latitude != null && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 min-w-[250px] max-w-sm">
            <button
              onClick={() => setSelectedFile(null)}
              className="absolute top-2 right-2 p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
            <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate pr-6">
              {selectedFile.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
              {selectedFile.latitude!.toFixed(6)}, {selectedFile.longitude!.toFixed(6)}
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  setPlacingFile(selectedFile);
                  setSelectedFile(null);
                }}
                className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                Mover ubicación
              </button>
              <button
                onClick={() => {
                  removeLocation.mutate(selectedFile.id);
                  setSelectedFile(null);
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar — files without locations */}
      <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col max-h-[300px] lg:max-h-none overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Sin ubicación ({filesWithoutLocations.length})
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Selecciona una foto y haz click en el mapa
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filesWithoutLocations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-gray-400 dark:text-gray-600">
              <MapPin className="w-8 h-8" />
              <p className="text-xs">Todas tus fotos tienen ubicación</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 lg:grid-cols-2 gap-1 p-2">
              {filesWithoutLocations.map((file) => (
                <SidebarThumb
                  key={file.id}
                  file={file}
                  isActive={placingFile?.id === file.id}
                  onClick={() => setPlacingFile(placingFile?.id === file.id ? null : file)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SidebarThumb({ file, isActive, onClick }: { file: FileRecord; isActive: boolean; onClick: () => void }) {
  const thumbUrl = file.thumbPath ? api.pi.thumbUrl(file.userId, file.thumbPath) : null;
  const { src, loading } = useAuthImage(thumbUrl);

  return (
    <button
      onClick={onClick}
      className={`
        relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800
        transition-all group
        ${isActive
          ? 'ring-2 ring-indigo-500 scale-95'
          : 'hover:ring-2 hover:ring-indigo-400'
        }
      `}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner size="sm" />
        </div>
      )}
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={file.name} className="w-full h-full object-cover" />
      )}
      <div className={`
        absolute inset-0 flex items-center justify-center transition-colors
        ${isActive ? 'bg-indigo-500/30' : 'bg-black/0 group-hover:bg-black/30'}
      `}>
        <MapPin className={`w-5 h-5 text-white transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
      </div>
    </button>
  );
}

// ─── Leaflet helpers ──────────────────────────────────────────────────────────

function createThumbIcon(L: typeof import('leaflet').default, blobUrl: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:44px;height:44px;border-radius:10px;overflow:hidden;
      border:3px solid #6366f1;box-shadow:0 2px 10px rgba(0,0,0,0.35);
      background:#1f2937;
    "><img src="${blobUrl}" style="width:100%;height:100%;object-fit:cover;" /></div>
    <div style="
      width:0;height:0;margin:0 auto;
      border-left:6px solid transparent;border-right:6px solid transparent;
      border-top:6px solid #6366f1;
    "></div>`,
    iconSize: [44, 50],
    iconAnchor: [22, 50],
    popupAnchor: [0, -50],
  });
}

// Re-export for use in SidebarThumb without circular import
import { useAuthImage } from '@/hooks/useAuthImage';
