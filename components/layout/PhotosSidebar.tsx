'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Calendar, Film, FolderOpen, Globe, Heart, Images, Library, MapPin, Plus, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { useTrash } from '@/hooks/useTrash';
import { useAddFileToAlbum } from '@/hooks/mutations/useAlbumMutations';
import { cn } from '@/lib/utils';
import type { Album } from '@/lib/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { NewAlbumModal } from '@/components/photos/NewAlbumModal';

interface Props {
  /** Controlled on mobile; ignored on md+ (always visible) */
  isOpen: boolean;
  onClose: () => void;
}

export function PhotosSidebar({ isOpen, onClose }: Props) {
  const { user }     = useAuth();
  const { trashCount } = useTrash();
  const searchParams = useSearchParams();
  const view         = searchParams.get('view');
  const albumId      = searchParams.get('album');

  const [albums, setAlbums]                   = useState<Album[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [showModal, setShowModal]             = useState(false);
  const [mounted, setMounted]                 = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting]               = useState(false);
  const [deleteError, setDeleteError]         = useState<string | null>(null);
  const [dragOverAlbumId, setDragOverAlbumId] = useState<string | null>(null);
  const addToAlbum = useAddFileToAlbum();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    api.albums.list()
      .then(setAlbums)
      .catch(() => setAlbums([]))
      .finally(() => setLoading(false));
  }, []);

  // Close sidebar on navigation (mobile)
  useEffect(() => { onClose(); }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleAlbumCreated(album: Album) {
    setAlbums((prev) => [...prev, album]);
  }

  async function handleDeleteAlbum(id: string) {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.albums.delete(id);
      setAlbums((prev) => prev.filter((a) => a.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  return (
      <aside
        className={cn(
          // ── Base layout ──────────────────────────────────────────────────────
          'fixed top-16 left-0 bottom-0 w-64 z-40 flex flex-col',
          'bg-white dark:bg-gray-900',
          'border-r border-gray-200 dark:border-gray-800',
          'overflow-y-auto',
          // ── Mobile: slide in/out ─────────────────────────────────────────────
          // On md+ the sidebar is always translated to 0 (visible).
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        {/* Mobile close button */}
        <div className="md:hidden flex justify-end p-2">
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="p-3 flex flex-col gap-0.5">

          {/* ── Main views ── */}
          <SidebarLink href="/photos"                icon={<Library className="w-4 h-4" />} label="Library"   active={!view && !albumId} />
          <SidebarLink href="/photos?view=favorites" icon={<Heart   className="w-4 h-4" />} label="Favorites" active={view === 'favorites'} />
          <SidebarLink href="/photos?view=photos"    icon={<Images  className="w-4 h-4" />} label="Photos"    active={view === 'photos'} />
          <SidebarLink href="/photos?view=videos"    icon={<Film    className="w-4 h-4" />} label="Videos"    active={view === 'videos'} />
          <SidebarLink href="/photos?view=timeline"  icon={<Calendar className="w-4 h-4" />} label="Timeline"  active={view === 'timeline'} />
          <SidebarLink href="/photos?view=map"       icon={<MapPin   className="w-4 h-4" />} label="Mapa"      active={view === 'map'} />
          <SidebarLink
            href="/photos?view=trash"
            icon={<Trash2 className="w-4 h-4" />}
            label="Papelera"
            active={view === 'trash'}
            badge={trashCount > 0 ? trashCount : undefined}
          />

          {/* ── Admin only: All Media (deferred to avoid hydration mismatch) ── */}
          {mounted && user?.role === 'admin' && (
            <>
              <div className="my-2 border-t border-gray-100 dark:border-gray-800" />
              <SidebarLink
                href="/photos?view=all"
                icon={<Globe className="w-4 h-4" />}
                label="All Media"
                active={view === 'all'}
                accent
              />
            </>
          )}

          {/* ── Albums ── */}
          <div className="mt-5 mb-1.5 flex items-center justify-between px-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Albums
            </span>
            <button
              onClick={() => setShowModal(true)}
              aria-label="New album"
              className="p-0.5 rounded text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-4">
              <LoadingSpinner size="sm" />
            </div>
          ) : albums.length === 0 ? (
            <p className="px-3 text-xs text-gray-400 dark:text-gray-600 py-2">No albums yet</p>
          ) : (
            albums.map((album) =>
              confirmDeleteId === album.id ? (
                <div
                  key={album.id}
                  className="flex flex-col gap-1 mx-1 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30"
                >
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-red-600 dark:text-red-400 flex-1 truncate">
                      Delete &quot;{album.name}&quot;?
                    </span>
                    <button
                      onClick={() => handleDeleteAlbum(album.id)}
                      disabled={deleting}
                      className="text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 px-1.5 py-0.5 rounded disabled:opacity-50"
                    >
                      {deleting ? '…' : 'Yes'}
                    </button>
                    <button
                      onClick={() => { setConfirmDeleteId(null); setDeleteError(null); }}
                      disabled={deleting}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-1.5 py-0.5 rounded disabled:opacity-50"
                    >
                      No
                    </button>
                  </div>
                  {deleteError && (
                    <p className="text-xs text-red-500">{deleteError}</p>
                  )}
                </div>
              ) : (
                <div
                  key={album.id}
                  className={cn(
                    'group/album flex items-center transition-all duration-150',
                    dragOverAlbumId === album.id && 'mx-0.5 rounded-lg ring-2 ring-indigo-500 ring-dashed bg-indigo-50 dark:bg-indigo-500/10',
                  )}
                  onDragOver={(e) => {
                    if (e.dataTransfer.types.includes('application/lc-file-ids')) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'copy';
                      setDragOverAlbumId(album.id);
                    }
                  }}
                  onDragLeave={(e) => {
                    // Only clear if we're leaving the container (not entering a child)
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDragOverAlbumId(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverAlbumId(null);
                    const raw = e.dataTransfer.getData('application/lc-file-ids');
                    if (!raw) return;
                    try {
                      const fileIds: string[] = JSON.parse(raw);
                      if (fileIds.length > 0) {
                        addToAlbum.mutate({ albumId: album.id, fileIds });
                      }
                    } catch { /* ignore malformed data */ }
                  }}
                >
                  <Link
                    href={`/photos?album=${album.id}`}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex-1 min-w-0',
                      albumId === album.id
                        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                        : dragOverAlbumId === album.id
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200',
                    )}
                  >
                    <FolderOpen className={cn('w-4 h-4 shrink-0', dragOverAlbumId === album.id && 'text-indigo-500')} />
                    <span className="truncate">{album.name}</span>
                    {dragOverAlbumId === album.id && (
                      <span className="ml-auto text-[10px] font-semibold text-indigo-500">Soltar aquí</span>
                    )}
                  </Link>

                  <button
                    onClick={() => setConfirmDeleteId(album.id)}
                    aria-label={`Delete album "${album.name}"`}
                    className="
                      opacity-0 group-hover/album:opacity-100 transition-opacity
                      p-1.5 mr-1 rounded
                      text-gray-400 hover:text-red-500 dark:hover:text-red-400
                      hover:bg-red-50 dark:hover:bg-red-950/30
                    "
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ),
            )
          )}
        </nav>
        <NewAlbumModal
          open={showModal}
          onClose={() => setShowModal(false)}
          onCreated={handleAlbumCreated}
        />
      </aside>
  );
}

function SidebarLink({
  href, icon, label, active, accent = false, badge,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  accent?: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        active
          ? accent
            ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400'
            : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
          : accent
            ? 'text-purple-500 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200',
      )}
    >
      {icon}
      <span className="truncate flex-1">{label}</span>
      {badge !== undefined && (
        <span className="ml-auto px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 tabular-nums">
          {badge}
        </span>
      )}
    </Link>
  );
}
