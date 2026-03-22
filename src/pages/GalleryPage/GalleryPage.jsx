import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import Header from "../../components/HeaderComponent/Header.component.jsx";
import { useAuth } from "../../context/Contexts.jsx";
import { getPhotos, getVideos, uploadPhotoFile, getVideoUploadToken, deduplicateMedia, getUserMedia, createUserMedia, deleteUserMedia, deletePhoto, deleteVideo, patchPhoto, patchVideo } from "../../api/media.js";
import { getAlbums, createAlbum, getAlbum, patchAlbum, addAlbumItem, removeAlbumItem } from "../../api/albums.js";
import { getUsers } from "../../api/users.js";
import UploadQueue from "../../components/UploadQueue/UploadQueue.jsx";
import "./GalleryPage.css";

// Module-level cache: survives component remounts
const mediaCache = { key: -1, photos: null, videos: null };

const API_BASE = import.meta.env.VITE_API_URL ?? "";

/**
 * Returns true if a user-media `mediaId` corresponds to a file entry from
 * the deduplication report.  The media API may use the bare filename, the
 * filename without extension, or embed the id inside the stream URL, so we
 * try all three shapes.
 */
function mediaIdMatchesDupFile(mediaId, dupFile) {
  const filename = dupFile.filename ?? "";
  const url      = dupFile.url      ?? "";
  const nameNoExt = filename.replace(/\.[^.]+$/, "");
  return (
    mediaId === filename  ||
    mediaId === nameNoExt ||
    url.includes(`/${mediaId}/`) ||
    url.includes(`/${mediaId}.`) ||
    url.endsWith(`/${mediaId}`)
  );
}

/** Unified stream URL for both photos and videos — uses the new /api/media/file/:filename endpoint */
function mediaFileUrl(item) {
  const name = item.filename || item.id;
  return `${API_BASE}/api/media/file/${encodeURIComponent(name)}`;
}

// Keep named aliases used throughout the file
const photoStreamUrl = mediaFileUrl;
const videoStreamUrl = mediaFileUrl;

// ── Hooks ────────────────────────────────────────────────────────────────────

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

const GRID_GAP = 10;
const PAGINATION_H = 56;

function useItemsPerPage(containerRef, enabled) {
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    const calc = () => {
      const padX = 20, padY = 20;
      const w = el.clientWidth  - padX * 2;
      const h = el.clientHeight - padY * 2 - PAGINATION_H;
      const cols = Math.max(1, Math.floor((w + GRID_GAP) / (160 + GRID_GAP)));
      const rows = Math.max(1, Math.floor((h + GRID_GAP) / (160 + GRID_GAP)));
      setItemsPerPage(cols * rows);
    };

    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef, enabled]);

  return itemsPerPage;
}

// ── Pagination (desktop only) ─────────────────────────────────────────────────

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  if (totalPages <= 7) {
    for (let i = 0; i < totalPages; i++) pages.push(i);
  } else {
    pages.push(0);
    if (currentPage > 2) pages.push("…");
    for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages - 2, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 3) pages.push("…");
    pages.push(totalPages - 1);
  }

  return (
    <nav className="pagination" aria-label="Page navigation">
      <button
        className="pagination-btn pagination-arrow"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
        aria-label="Previous page"
      >‹</button>

      {pages.map((p, i) =>
        typeof p === "string" ? (
          <span key={`e${i}`} className="pagination-ellipsis">…</span>
        ) : (
          <button
            key={p}
            className={`pagination-btn${p === currentPage ? " active" : ""}`}
            onClick={() => onPageChange(p)}
            aria-current={p === currentPage ? "page" : undefined}
          >{p + 1}</button>
        )
      )}

      <button
        className="pagination-btn pagination-arrow"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages - 1}
        aria-label="Next page"
      >›</button>
    </nav>
  );
}

// ── Constants ────────────────────────────────────────────────────────────────

const FILTERS = [
  { id: "all",   label: "All",    icon: "⊞" },
  { id: "photo", label: "Photos", icon: "🖼" },
  { id: "video", label: "Videos", icon: "🎬" },
];

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Video player — direct streaming with native Range-request support ─────────
// The backend now serves raw video files via GET /api/media/file/:filename with
// proper Content-Range forwarding, so the browser's built-in <video> handles
// seeking and buffering without a separate HLS layer.

function VideoPlayer({ item, videoClassName }) {
  return (
    <div className="video-player-wrap" onClick={(e) => e.stopPropagation()}>
      <video
        key={item.filename || item.id}   // remount when item changes so src reloads
        className={videoClassName}
        src={videoStreamUrl(item)}
        controls
        autoPlay
        playsInline
      />
    </div>
  );
}

// ── Thumbnail components ──────────────────────────────────────────────────────

const PhotoThumb = memo(function PhotoThumb({ item, onClick, onContextMenu }) {
  return (
    <button className="media-thumb" onClick={onClick} onContextMenu={onContextMenu} title={item.filename}>
      <img src={photoStreamUrl(item)} alt={item.filename} />
      <div className="thumb-overlay">
        <span className="thumb-name">{item.filename}</span>
      </div>
    </button>
  );
});

const VideoThumb = memo(function VideoThumb({ item, onClick, onContextMenu }) {
  const wrapRef = useRef(null);
  const [thumbSrc, setThumbSrc] = useState(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let cancelled = false;

    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();

      const vid = document.createElement("video");
      vid.muted       = true;
      vid.playsInline = true;
      vid.crossOrigin = "anonymous";
      vid.preload     = "metadata";
      vid.src         = videoStreamUrl(item);

      const captureFrame = () => {
        if (cancelled) return;
        try {
          const c  = document.createElement("canvas");
          c.width  = vid.videoWidth  || 320;
          c.height = vid.videoHeight || 180;
          c.getContext("2d").drawImage(vid, 0, 0, c.width, c.height);
          if (!cancelled) setThumbSrc(c.toDataURL("image/jpeg", 0.7));
        } catch (_) { /* tainted canvas — keep placeholder */ }
      };

      vid.addEventListener("seeked",           captureFrame,   { once: true });
      vid.addEventListener("loadedmetadata", () => {
        vid.currentTime = Math.min(1, vid.duration || 1);
      }, { once: true });
    }, { rootMargin: "400px 0px" });

    io.observe(el);

    return () => { cancelled = true; io.disconnect(); };
  }, [item]);

  return (
    <button ref={wrapRef} className="media-thumb" onClick={onClick} onContextMenu={onContextMenu} title={item.filename}>
      {thumbSrc
        ? <img src={thumbSrc} alt={item.filename} className="video-thumb-preview" />
        : <div className="thumb-placeholder thumb-video-bg" />
      }
      <span className="play-badge">▶</span>
      <div className="thumb-overlay">
        <span className="thumb-name">{item.filename}</span>
      </div>
    </button>
  );
});

// ── MetaPanel — shows / edits media metadata inside the lightbox ─────────────

function MetaPanel({ item, isAdmin, onSave }) {
  const [editing,   setEditing]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState(null);

  const blankForm = (it) => ({
    name:          it.name         ?? it.filename ?? "",
    description:   it.description  ?? "",
    tags:          (it.tags        ?? []).join(", "),
    visibility:    it.visibility   ?? "private",
    lat:           it.metadata?.location?.lat   ?? "",
    lng:           it.metadata?.location?.lng   ?? "",
    locationLabel: it.metadata?.location?.label ?? "",
    people:        (it.metadata?.people ?? []).join(", "),
  });

  const [form, setForm] = useState(() => blankForm(item));

  // Sync when navigating to a different item
  useEffect(() => {
    setForm(blankForm(item));
    setEditing(false);
    setSaveError(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.filename]);

  const patch = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const tags   = form.tags  .split(",").map((t) => t.trim()).filter(Boolean);
      const people = form.people.split(",").map((p) => p.trim()).filter(Boolean);

      const hasLocation = form.lat !== "" || form.lng !== "" || form.locationLabel !== "";
      const data = {
        name:        form.name        || undefined,
        description: form.description || undefined,
        tags,
        visibility:  form.visibility,
        metadata: {
          ...(hasLocation ? {
            location: {
              ...(form.lat           !== "" && { lat:   parseFloat(form.lat) }),
              ...(form.lng           !== "" && { lng:   parseFloat(form.lng) }),
              ...(form.locationLabel !== "" && { label: form.locationLabel }),
            },
          } : {}),
          people,
        },
      };
      await onSave(item, data);
      setEditing(false);
    } catch (err) {
      setSaveError(err.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const Row = ({ label, value }) => (
    <div className="meta-row">
      <span className="meta-label">{label}</span>
      <span className="meta-value">{value || <em className="meta-empty">—</em>}</span>
    </div>
  );

  const locationDisplay =
    item.metadata?.location?.label ||
    (item.metadata?.location?.lat != null
      ? `${item.metadata.location.lat}, ${item.metadata.location.lng}`
      : null);

  if (!editing) {
    return (
      <div className="meta-panel">
        <Row label="Name"        value={item.name ?? item.filename} />
        <Row label="Description" value={item.description} />
        <Row label="Tags"        value={item.tags?.join(", ")} />
        <Row label="Visibility"  value={item.visibility} />
        <Row label="Location"    value={locationDisplay} />
        <Row label="People"      value={item.metadata?.people?.join(", ")} />
        {item.metadata?.width  && <Row label="Dimensions" value={`${item.metadata.width} × ${item.metadata.height}`} />}
        {item.metadata?.size   && <Row label="Size"       value={formatSize(item.metadata.size)} />}
        {item.metadata?.type   && <Row label="Type"       value={item.metadata.type} />}
        {isAdmin && (
          <button className="meta-edit-btn" onClick={() => setEditing(true)}>✏ Edit metadata</button>
        )}
      </div>
    );
  }

  return (
    <div className="meta-panel meta-panel--editing">
      <div className="meta-field">
        <label className="meta-field-label">Name</label>
        <input className="meta-input" value={form.name} onChange={patch("name")} />
      </div>
      <div className="meta-field">
        <label className="meta-field-label">Description</label>
        <textarea className="meta-input meta-textarea" rows={3} value={form.description} onChange={patch("description")} />
      </div>
      <div className="meta-field">
        <label className="meta-field-label">Tags <span className="meta-hint">(comma separated)</span></label>
        <input className="meta-input" value={form.tags} onChange={patch("tags")} placeholder="nature, beach, night" />
      </div>
      <div className="meta-field">
        <label className="meta-field-label">Visibility</label>
        <select className="meta-input meta-select" value={form.visibility} onChange={patch("visibility")}>
          <option value="private">Private</option>
          <option value="public">Public</option>
        </select>
      </div>
      <div className="meta-field">
        <label className="meta-field-label">Location</label>
        <div className="meta-field-row">
          <input className="meta-input" placeholder="Lat"  type="number" step="any" value={form.lat} onChange={patch("lat")} />
          <input className="meta-input" placeholder="Lng"  type="number" step="any" value={form.lng} onChange={patch("lng")} />
        </div>
        <input className="meta-input" placeholder="Label (e.g. Paris, France)" value={form.locationLabel} onChange={patch("locationLabel")} />
      </div>
      <div className="meta-field">
        <label className="meta-field-label">People <span className="meta-hint">(comma separated)</span></label>
        <input className="meta-input" value={form.people} onChange={patch("people")} placeholder="Alice, Bob" />
      </div>
      {saveError && <p className="meta-error">{saveError}</p>}
      <div className="meta-edit-actions">
        <button className="meta-save-btn"   onClick={handleSave}           disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        <button className="meta-cancel-btn" onClick={() => setEditing(false)}>Cancel</button>
      </div>
    </div>
  );
}

// ── Assign-to-user modal (admin only) ────────────────────────────────────────

function AssignToUserModal({ item, onClose, onConfirm }) {
  const [users,          setUsers]          = useState([]);
  const [loadingUsers,   setLoadingUsers]   = useState(true);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [error,          setError]          = useState(null);
  const [busy,           setBusy]           = useState(false);

  useEffect(() => {
    getUsers()
      .then((r) => setUsers(r.data.data ?? []))
      .catch(() => setError("Failed to load users."))
      .finally(() => setLoadingUsers(false));
  }, []);

  const handleConfirm = async () => {
    if (!selectedUserId) return;
    setBusy(true);
    try {
      await onConfirm(selectedUserId);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message ?? err.message ?? "Assignment failed.");
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Assign to user</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <p className="modal-subtitle" title={item.filename}>{item.filename}</p>

        {loadingUsers && <p className="modal-loading">Loading users…</p>}
        {error && <p className="modal-error">{error}</p>}

        {!loadingUsers && !error && (
          <select
            className="modal-select"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="">Select a user…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username} — {u.email}
              </option>
            ))}
          </select>
        )}

        <div className="modal-actions">
          <button className="modal-btn modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className="modal-btn modal-btn-confirm"
            disabled={!selectedUserId || busy}
            onClick={handleConfirm}
          >
            {busy ? "Assigning…" : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Context Menu ──────────────────────────────────────────────────────────────

function ContextMenu({
  x, y, item, albums, userMediaMap, onClose, onAddToAlbum, onCreateAndAdd,
  selectedAlbumId, isAdmin,
  onRemoveFromAlbum, onRemoveFromLibrary, onDeletePermanently, onAssignToUser,
}) {
  const userMedia = userMediaMap[item.id];

  return (
    <div
      className="context-menu"
      style={{ left: x, top: y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {userMedia ? (
        <>
          {/* ── Add to album ── */}
          <p className="context-menu-header">Add to album</p>
          {albums.map((album) => (
            <button
              key={album.id}
              className="context-menu-item"
              onClick={() => { onAddToAlbum(album.id, userMedia.id); onClose(); }}
            >
              📁 {album.name}
            </button>
          ))}
          {albums.length > 0 && <div className="context-menu-divider" />}
          <button
            className="context-menu-item context-menu-new"
            onClick={() => { onCreateAndAdd(item); onClose(); }}
          >
            + New album
          </button>

          {/* ── Destructive actions ── */}
          <div className="context-menu-divider" />
          {selectedAlbumId && (
            <button
              className="context-menu-item context-menu-danger"
              onClick={() => { onRemoveFromAlbum(item, userMedia); onClose(); }}
            >
              📤 Remove from album
            </button>
          )}
          <button
            className="context-menu-item context-menu-danger"
            onClick={() => { onRemoveFromLibrary(item, userMedia); onClose(); }}
          >
            🗑 Remove from library
          </button>
          {isAdmin && (
            <button
              className="context-menu-item context-menu-danger"
              onClick={() => { onDeletePermanently(item); onClose(); }}
            >
              ⚠ Delete permanently
            </button>
          )}

          {/* ── Admin: assign ── */}
          {isAdmin && (
            <>
              <div className="context-menu-divider" />
              <button
                className="context-menu-item"
                onClick={() => { onAssignToUser(item); onClose(); }}
              >
                👤 Assign to user
              </button>
            </>
          )}
        </>
      ) : (
        <>
          <p className="context-menu-empty">Not in your library</p>
          {isAdmin && (
            <>
              <div className="context-menu-divider" />
              <button
                className="context-menu-item context-menu-danger"
                onClick={() => { onDeletePermanently(item); onClose(); }}
              >
                ⚠ Delete permanently
              </button>
              <button
                className="context-menu-item"
                onClick={() => { onAssignToUser(item); onClose(); }}
              >
                👤 Assign to user
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({
  item, items, onClose, onNavigate,
  userMediaMap, selectedAlbumId, isAdmin,
  onRemoveFromAlbum, onRemoveFromLibrary, onDeletePermanently, onAssignToUser,
  onSaveMeta,
}) {
  const isMobile     = useIsMobile();
  const currentIndex = items.findIndex((i) => i.filename === item.filename);
  const hasPrev      = currentIndex > 0;
  const hasNext      = currentIndex < items.length - 1;
  const touchStartX  = useRef(null);
  const [showMeta,   setShowMeta] = useState(false);

  // Lookup this item's user-media record (determines which actions are available)
  const userMedia = userMediaMap?.[item.id] ?? null;

  // Shared action bar rendered inside both desktop and mobile lightbox
  const actionBar = (
    <div className="lb-actions">
      <button
        className={`lb-btn${showMeta ? " lb-btn-active" : ""}`}
        onClick={() => setShowMeta((v) => !v)}
        title="Toggle metadata panel"
      >
        ℹ Details
      </button>
      {userMedia && selectedAlbumId && (
        <button className="lb-btn lb-btn-danger"
          onClick={() => { onRemoveFromAlbum(item, userMedia); onClose(); }}>
          📤 Remove from album
        </button>
      )}
      {userMedia && (
        <button className="lb-btn lb-btn-danger"
          onClick={() => { onRemoveFromLibrary(item, userMedia); onClose(); }}>
          🗑 Remove from library
        </button>
      )}
      {isAdmin && (
        <button className="lb-btn lb-btn-danger"
          onClick={() => { onDeletePermanently(item); onClose(); }}>
          ⚠ Delete permanently
        </button>
      )}
      {isAdmin && (
        <button className="lb-btn"
          onClick={() => onAssignToUser(item)}>
          👤 Assign to user
        </button>
      )}
    </div>
  );

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft"  && hasPrev) onNavigate(items[currentIndex - 1]);
      if (e.key === "ArrowRight" && hasNext)  onNavigate(items[currentIndex + 1]);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentIndex, hasPrev, hasNext, items, onNavigate, onClose]);

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta > 0 && hasPrev) onNavigate(items[currentIndex - 1]);
    if (delta < 0 && hasNext) onNavigate(items[currentIndex + 1]);
  };

  const mediaContent = (photoClassName, videoClassName) =>
    item.type === "photo" ? (
      <img
        src={photoStreamUrl(item)}
        alt={item.filename}
        className={photoClassName}
        onClick={(e) => e.stopPropagation()}
      />
    ) : (
      <VideoPlayer item={item} videoClassName={videoClassName} />
    );

  if (isMobile) {
    return (
      <div
        className="lightbox-backdrop lightbox-mobile"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        role="dialog"
        aria-modal="true"
        aria-label="Media viewer"
      >
        <div className="lightbox-mobile-bar">
          <button className="lightbox-mobile-close" onClick={onClose} aria-label="Close">✕</button>
          <span className="lightbox-counter">{currentIndex + 1} / {items.length}</span>
          <div style={{ width: 40 }} />
        </div>

        <div className="lightbox-mobile-media" onClick={onClose}>
          {mediaContent("lightbox-mobile-img", "lightbox-mobile-video")}
        </div>

        <div className="lightbox-mobile-info">
          <span className="lightbox-filename">{item.filename}</span>
          <span className="lightbox-meta">
            {formatSize(item.size)} · {new Date(item.mtime).toLocaleDateString()}
          </span>
        </div>
        {actionBar}
        {showMeta && (
          <div className="lightbox-meta-panel" onClick={(e) => e.stopPropagation()}>
            <MetaPanel item={item} isAdmin={isAdmin} onSave={onSaveMeta} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="lightbox-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Media viewer"
    >
      <div className="lightbox-row">
        <div className="lightbox-nav-slot">
          {hasPrev && (
            <button
              className="lightbox-nav"
              onClick={(e) => { e.stopPropagation(); onNavigate(items[currentIndex - 1]); }}
              aria-label="Previous"
            >‹</button>
          )}
        </div>

        <div className={`lightbox-content${showMeta ? " lightbox-content--with-meta" : ""}`} onClick={(e) => e.stopPropagation()}>
          <button className="lightbox-close" onClick={onClose} aria-label="Close">✕</button>

          <div className="lightbox-body">
            <div className="lightbox-media">
              {mediaContent("lightbox-image", "lightbox-video")}
            </div>
            {showMeta && (
              <div className="lightbox-meta-panel">
                <MetaPanel item={item} isAdmin={isAdmin} onSave={onSaveMeta} />
              </div>
            )}
          </div>

          <div className="lightbox-info">
            <span className="lightbox-filename">{item.filename}</span>
            <span className="lightbox-meta">
              {formatSize(item.size)} · {new Date(item.mtime).toLocaleDateString()}
            </span>
          </div>
          {actionBar}
        </div>

        <div className="lightbox-nav-slot">
          {hasNext && (
            <button
              className="lightbox-nav"
              onClick={(e) => { e.stopPropagation(); onNavigate(items[currentIndex + 1]); }}
              aria-label="Next"
            >›</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GalleryPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isMobile = useIsMobile();

  // ── Existing media state ──────────────────────────────────────────────────
  const [filter, setFilter]           = useState("all");
  const [refreshKey, setRefreshKey]   = useState(0);
  const [items, setItems]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [selected, setSelected]       = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [uploadQueue, setUploadQueue]               = useState([]); // per-file progress queue
  const [videoUploadLoading, setVideoUploadLoading] = useState(false);
  const [videoUploadError, setVideoUploadError]     = useState(null);
  const [dedupeLoading, setDedupeLoading]           = useState(false);
  const [dedupeMessage, setDedupeMessage]           = useState(null);

  // ── Album / user-media state ──────────────────────────────────────────────
  const [albums, setAlbums]                       = useState([]);
  const [albumsLoading, setAlbumsLoading]         = useState(false);
  const [selectedAlbumId, setSelectedAlbumId]     = useState(null);
  const [selectedAlbumMediaIds, setSelectedAlbumMediaIds] = useState(null); // Set<mediaId> | null
  const [userMediaMap, setUserMediaMap]           = useState({}); // mediaId → userMedia record
  const [userMediaLoaded, setUserMediaLoaded]     = useState(false);
  const [adminViewAll, setAdminViewAll]           = useState(true);

  // ── Context menu state ────────────────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState(null); // { x, y, item }

  // ── Album editing state ───────────────────────────────────────────────────
  const [creatingAlbum, setCreatingAlbum]     = useState(false);
  const [newAlbumName, setNewAlbumName]       = useState("");
  const [renamingAlbumId, setRenamingAlbumId] = useState(null);
  const [renameValue, setRenameValue]         = useState("");
  const [albumActionError, setAlbumActionError] = useState(null);
  const [pendingAlbumItem, setPendingAlbumItem] = useState(null); // item to add after album creation

  // ── Assign-to-user modal ──────────────────────────────────────────────────
  const [assignTarget, setAssignTarget] = useState(null); // item being assigned to another user

  // ── Sidebar resize ────────────────────────────────────────────────────────
  const [sidebarWidth, setSidebarWidth] = useState(200);

  const handleResizeStart = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX     = e.clientX;
    const startWidth = sidebarWidth;

    const onMove = (ev) => {
      const newWidth = Math.max(150, Math.min(420, startWidth + ev.clientX - startX));
      setSidebarWidth(newWidth);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
  }, [sidebarWidth]);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const mainRef        = useRef(null);
  const photoInputRef  = useRef(null);
  const videoInputRef  = useRef(null);
  const newAlbumInputRef  = useRef(null);
  const renameInputRef    = useRef(null);
  const albumItemsCache   = useRef({}); // albumId → Set<mediaId>, cleared on refreshAlbums

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // ── Desktop pagination ────────────────────────────────────────────────────
  const itemsPerPage = useItemsPerPage(mainRef, !isMobile);
  const [currentPage, setCurrentPage] = useState(0);

  // Apply album + admin view filters on top of type-filtered items.
  // Non-admins always see only their own media (filtered by userMediaMap once loaded).
  // Admins see all by default; toggling to "Mine" applies the same filter.
  const filteredItems = useMemo(() => {
    let result = items;
    const applyUserFilter = userMediaLoaded && (!isAdmin || !adminViewAll);
    if (applyUserFilter) {
      result = result.filter((i) => userMediaMap[i.id]);
    }
    if (selectedAlbumMediaIds) {
      result = result.filter((i) => selectedAlbumMediaIds.has(i.id));
    }
    return result;
  }, [items, isAdmin, adminViewAll, userMediaMap, userMediaLoaded, selectedAlbumMediaIds]);

  useEffect(() => { setCurrentPage(0); }, [filter, refreshKey, selectedAlbumId, adminViewAll]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  useEffect(() => { setCurrentPage((p) => Math.min(p, totalPages - 1)); }, [totalPages]);

  const pageItems = filteredItems.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  const handleLightboxNavigate = useCallback((item) => {
    setSelected(item);
    const idx = filteredItems.findIndex((i) => i.filename === item.filename);
    if (idx !== -1 && !isMobile) setCurrentPage(Math.floor(idx / itemsPerPage));
  }, [filteredItems, itemsPerPage, isMobile]);

  // ── Mobile infinite scroll ────────────────────────────────────────────────
  const [mobileCount, setMobileCount] = useState(24);
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (isMobile) setMobileCount(24);
  }, [filter, refreshKey, isMobile, selectedAlbumId, adminViewAll]);

  useEffect(() => {
    if (!isMobile || !sentinelRef.current || !mainRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setMobileCount((c) => Math.min(c + 24, filteredItems.length));
      },
      { root: mainRef.current, rootMargin: "0px 0px 300px 0px" }
    );
    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, [isMobile, mobileCount, filteredItems.length]);

  const displayItems = isMobile ? filteredItems.slice(0, mobileCount) : pageItems;

  // ── Data fetching: media ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const cacheWarm = mediaCache.key === refreshKey && mediaCache.photos && mediaCache.videos;
    if (!cacheWarm) setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        if (mediaCache.key !== refreshKey) {
          mediaCache.key = refreshKey;
          mediaCache.photos = null;
          mediaCache.videos = null;
        }

        const fetches = [];
        if (!mediaCache.photos) fetches.push(
          getPhotos().then((r) => { mediaCache.photos = r.data.data ?? []; })
        );
        if (!mediaCache.videos) fetches.push(
          getVideos().then((r) => {
            mediaCache.videos = (r.data.data ?? []).map((v) => ({
              ...v,
              type: "video",
              filename: v.name,
            }));
          })
        );
        await Promise.all(fetches);

        const seen = new Set();
        const all = [...mediaCache.photos, ...mediaCache.videos].filter((item) => {
          if (seen.has(item.filename)) return false;
          seen.add(item.filename);
          return true;
        });

        const fetched =
          filter === "photo" ? all.filter((i) => i.type === "photo") :
          filter === "video" ? all.filter((i) => i.type === "video") :
          all;

        fetched.sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
        if (!cancelled) setItems(fetched);
      } catch (err) {
        if (!cancelled) setError(err.message ?? "Failed to load media");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [filter, refreshKey]);

  // ── Data fetching: user-media map ─────────────────────────────────────────
  useEffect(() => {
    setUserMediaLoaded(false);
    getUserMedia()
      .then((r) => {
        const map = {};
        (r.data ?? []).forEach((um) => { map[um.mediaId] = um; });
        setUserMediaMap(map);
      })
      .catch(() => {})
      .finally(() => setUserMediaLoaded(true));
  }, [refreshKey]);

  // ── Data fetching: albums ─────────────────────────────────────────────────
  const refreshAlbums = useCallback(async () => {
    setAlbumsLoading(true);
    albumItemsCache.current = {}; // invalidate album items cache on any album list refresh
    try {
      const r = await getAlbums();
      setAlbums(r.data ?? []);
    } catch {
      setAlbums([]);
    } finally {
      setAlbumsLoading(false);
    }
  }, []);

  useEffect(() => { refreshAlbums(); }, [refreshAlbums]);

  // ── Data fetching: selected album items (with ref cache) ──────────────────
  useEffect(() => {
    if (!selectedAlbumId) { setSelectedAlbumMediaIds(null); return; }

    // Serve from cache immediately — no network round-trip
    const cached = albumItemsCache.current[selectedAlbumId];
    if (cached) { setSelectedAlbumMediaIds(cached); return; }

    getAlbum(selectedAlbumId)
      .then((r) => {
        const mediaIds = new Set(
          (r.data.items ?? []).map((ai) => ai.userMedia?.mediaId).filter(Boolean)
        );
        albumItemsCache.current[selectedAlbumId] = mediaIds;
        setSelectedAlbumMediaIds(mediaIds);
      })
      .catch(() => setSelectedAlbumMediaIds(new Set()));
  }, [selectedAlbumId]);

  // ── Focus helpers ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!creatingAlbum) return;
    const raf = requestAnimationFrame(() => newAlbumInputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [creatingAlbum]);

  useEffect(() => {
    if (!renamingAlbumId) return;
    const raf = requestAnimationFrame(() => renameInputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [renamingAlbumId]);

  // ── Close context menu on outside click ───────────────────────────────────
  useEffect(() => {
    if (!contextMenu) return;
    const handleDown = () => setContextMenu(null);
    document.addEventListener("mousedown", handleDown);
    return () => document.removeEventListener("mousedown", handleDown);
  }, [contextMenu]);

  // ── Album handlers ────────────────────────────────────────────────────────
  const handleCreateAlbum = async () => {
    const name = newAlbumName.trim();
    if (!name) return;
    setAlbumActionError(null);
    try {
      const res = await createAlbum(name);
      const newAlbum = res.data;
      if (pendingAlbumItem) {
        const um = userMediaMap[pendingAlbumItem.id];
        if (um) await addAlbumItem(newAlbum.id, um.id);
        setPendingAlbumItem(null);
      }
      setNewAlbumName("");
      setCreatingAlbum(false);
      await refreshAlbums();
    } catch (err) {
      setAlbumActionError(err.message ?? "Failed to create album");
    }
  };

  const handleRenameAlbum = async (albumId) => {
    const name = renameValue.trim();
    setRenamingAlbumId(null);
    if (!name) return;
    try {
      await patchAlbum(albumId, { name });
      await refreshAlbums();
    } catch (err) {
      setAlbumActionError(err.message ?? "Failed to rename album");
    }
  };

  const handleAddToAlbum = async (albumId, userMediaId) => {
    try {
      await addAlbumItem(albumId, userMediaId);
      // Bust cache for this album so next visit re-fetches fresh items
      delete albumItemsCache.current[albumId];
      if (selectedAlbumId === albumId) {
        const r = await getAlbum(albumId);
        const mediaIds = new Set(
          (r.data.items ?? []).map((ai) => ai.userMedia?.mediaId).filter(Boolean)
        );
        albumItemsCache.current[albumId] = mediaIds;
        setSelectedAlbumMediaIds(mediaIds);
      }
      await refreshAlbums(); // refresh counts
    } catch (err) {
      setAlbumActionError(err.message ?? "Failed to add to album");
    }
  };

  const handleContextMenu = useCallback((e, item) => {
    e.preventDefault();
    const MENU_W = 200;
    const MENU_H = 220;
    const x = Math.min(e.clientX, window.innerWidth  - MENU_W - 8);
    const y = Math.min(e.clientY, window.innerHeight - MENU_H - 8);
    setContextMenu({ x, y, item });
  }, []);

  const handleCreateAndAdd = useCallback((item) => {
    setPendingAlbumItem(item);
    setNewAlbumName("");
    setCreatingAlbum(true);
    setSidebarOpen(true);
  }, []);

  // ── Media action handlers ─────────────────────────────────────────────────

  /** Remove item from the currently viewed album (user-scoped; file stays on server). */
  const handleRemoveFromAlbum = useCallback(async (item, userMedia) => {
    if (!selectedAlbumId) return;
    try {
      await removeAlbumItem(selectedAlbumId, userMedia.id);
      // Update local album cache immediately so the grid reacts without a round-trip
      albumItemsCache.current[selectedAlbumId]?.delete(item.id);
      setSelectedAlbumMediaIds((prev) => {
        if (!prev) return prev;
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      setSelected(null);
      await refreshAlbums();
    } catch (err) {
      console.error("Remove from album failed:", err);
    }
  }, [selectedAlbumId, refreshAlbums]);

  /** Remove item from this user's library (deletes user-media record; file stays on server). */
  const handleRemoveFromLibrary = useCallback(async (item, userMedia) => {
    if (!window.confirm(`Remove "${item.filename}" from your library?`)) return;
    try {
      await deleteUserMedia(userMedia.id);
      setSelected(null);
      refresh();
    } catch (err) {
      console.error("Remove from library failed:", err);
    }
  }, [refresh]);

  /** Admin only: permanently delete the media file from the server. */
  const handleDeletePermanently = useCallback(async (item) => {
    const name = item.filename || item.id;
    if (!window.confirm(
      `Permanently delete "${name}" from the server?\n\nThis removes the file for ALL users and cannot be undone.`
    )) return;
    try {
      if (item.type === "photo") await deletePhoto(name);
      else                       await deleteVideo(name);
      setSelected(null);
      refresh();
    } catch (err) {
      console.error("Permanent delete failed:", err);
    }
  }, [refresh]);

  /** Admin only: open the assign-to-user modal. */
  const handleAssignToUser = useCallback((item) => {
    setAssignTarget(item);
  }, []);

  /** Called when the admin confirms a user in the assign modal. */
  const handleAssignConfirm = useCallback(async (userId) => {
    if (!assignTarget) return;
    await createUserMedia({ userId, mediaId: assignTarget.id, mediaType: assignTarget.type });
    setAssignTarget(null);
  }, [assignTarget]);

  /** Save updated metadata for a photo or video. */
  const handleSaveMeta = useCallback(async (item, data) => {
    if (item.type === "photo") {
      await patchPhoto(item.filename, data);
    } else {
      await patchVideo({ filename: item.filename, ...data });
    }
    // Optimistically update the local items list so the lightbox reflects the new values
    setItems((prev) =>
      prev.map((i) => i.filename === item.filename ? { ...i, ...data } : i)
    );
    // Bust the module-level cache so a manual refresh pulls fresh data
    mediaCache.key = -1;
  }, []);

  // ── Upload handlers ───────────────────────────────────────────────────────
  const clearUploadQueue = useCallback(() => {
    setUploadQueue((prev) => {
      // Revoke any object URLs we created for thumbnails
      prev.forEach((item) => { if (item.preview) URL.revokeObjectURL(item.preview); });
      return [];
    });
  }, []);

  const handlePhotoUpload = useCallback(async (e) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = ""; // reset input so re-selecting the same files works

    // Build the initial queue (all "queued", with image previews where possible)
    const queue = files.map((file) => ({
      id:       `${Date.now()}-${Math.random()}`,
      file,
      preview:  file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      progress: 0,
      status:   "queued",
      error:    null,
    }));
    setUploadQueue(queue);

    // Upload up to 3 files in parallel.
    // Each "chain" calls uploadNext() recursively, grabbing the next
    // unstarted file via the shared `idx` counter (safe: JS is single-threaded).
    let idx = 0;
    const uploadNext = async () => {
      if (idx >= queue.length) return;
      const item = queue[idx++];

      setUploadQueue((prev) =>
        prev.map((q) => q.id === item.id ? { ...q, status: "uploading" } : q)
      );

      try {
        // Step 1 — upload the file; response contains the new mediaId
        const res = await uploadPhotoFile(item.file, (pct) =>
          setUploadQueue((prev) =>
            prev.map((q) => q.id === item.id ? { ...q, progress: pct } : q)
          )
        );

        // Step 2 — auto-assign the uploaded photo to the uploader.
        // The media API may return the id at different paths; try the most common ones.
        const data   = res.data ?? {};
        const mediaId =
          data.files?.[0]?.id ??  // { files: [{ id }] }
          data.file?.id       ??  // { file: { id } }
          data[0]?.id         ??  // [{ id }]
          data.id;                // { id }

        if (mediaId && user?.id) {
          await createUserMedia({ userId: user.id, mediaId, mediaType: "photo" });
        }

        setUploadQueue((prev) =>
          prev.map((q) => q.id === item.id ? { ...q, status: "done", progress: 100 } : q)
        );
      } catch (err) {
        setUploadQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: "error", error: err.message ?? "Failed" } : q
          )
        );
      }

      await uploadNext(); // pick up the next queued file in this chain
    };

    const CONCURRENCY = 3;
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, uploadNext));
    refresh();
  }, [refresh, user]);

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoUploadLoading(true);
    setVideoUploadError(null);
    try {
      let tokenData;
      try {
        const { data } = await getVideoUploadToken();
        tokenData = data;
      } catch (err) {
        const status = err.response?.status;
        throw new Error(
          status === 404
            ? "Upload token endpoint not found (404) — check backend route order: /upload-token must be defined before /:id"
            : `Failed to get upload token: ${err.message}`
        );
      }

      const { token, uploadUrl } = tokenData;
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error(`Direct upload failed (${res.status}) — check Raspberry Pi is reachable at: ${uploadUrl}`);
      refresh();
    } catch (err) {
      setVideoUploadError(err.message ?? "Video upload failed");
    } finally {
      setVideoUploadLoading(false);
      e.target.value = "";
    }
  };

  const handleDeduplicate = async () => {
    setSidebarOpen(false);
    if (!window.confirm(
      "Scan your library for duplicates and remove extras?\n\n" +
      "Only duplicate entries in YOUR library are removed. " +
      "Actual files are never deleted from the server, so other users are unaffected."
    )) return;

    setDedupeLoading(true);
    setDedupeMessage(null);

    try {
      // 1. Hash-scan the media server — returns groups of files with identical SHA-256
      const dedupeRes = await deduplicateMedia();
      const dupGroups = dedupeRes.data?.duplicates ?? [];

      // 2. Fetch only THIS user's media assignments
      const umRes = await getUserMedia();
      const myRecords = umRes.data ?? [];

      // Track which record ids we will delete (use a Set to avoid double-deletes)
      const toDelete = new Set();

      // ── Pass A: same mediaId assigned to this user more than once (DB duplicate) ──
      const byMediaId = {};
      for (const rec of myRecords) {
        (byMediaId[rec.mediaId] ??= []).push(rec);
      }
      for (const recs of Object.values(byMediaId)) {
        if (recs.length < 2) continue;
        // Keep the oldest assignment, mark the rest for removal
        const sorted = [...recs].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        for (const rec of sorted.slice(1)) toDelete.add(rec.id);
      }

      // ── Pass B: different mediaIds but same file content (hash duplicate) ──
      for (const group of dupGroups) {
        const files = group.files ?? [];
        // Which of this user's records map to files in this hash-group?
        const matches = myRecords.filter(
          (rec) => files.some((f) => mediaIdMatchesDupFile(rec.mediaId, f))
        );
        if (matches.length < 2) continue;
        // Keep the oldest, mark the rest for removal
        const sorted = [...matches].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        for (const rec of sorted.slice(1)) toDelete.add(rec.id);
      }

      // ── Delete the duplicate user-media records (never touches actual files) ──
      await Promise.all([...toDelete].map((id) => deleteUserMedia(id).catch(() => {})));

      if (toDelete.size === 0) {
        setDedupeMessage("No duplicates found in your library.");
      } else {
        setDedupeMessage(
          `Removed ${toDelete.size} duplicate ${toDelete.size === 1 ? "entry" : "entries"} from your library.`
        );
        refresh();
      }
    } catch (err) {
      setDedupeMessage(err.message ?? "Deduplication failed");
    } finally {
      setDedupeLoading(false);
    }
  };

  const activeFilter = FILTERS.find((f) => f.id === filter);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="gallery-page">
      <Header />

      <div className="gallery-layout">

        {sidebarOpen && (
          <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
        )}

        <aside
          className={`gallery-sidebar${sidebarOpen ? " sidebar-open" : ""}`}
          style={!isMobile ? { width: sidebarWidth } : undefined}
        >
          {/* Sheet drag handle + header (mobile only) */}
          <div className="sidebar-sheet-header">
            <div className="sidebar-drag-handle" />
            <div className="sidebar-sheet-title-row">
              <p className="sidebar-title">Filters</p>
              <button
                className="sidebar-close-btn"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close filters"
              >✕</button>
            </div>
          </div>

          <p className="sidebar-title sidebar-title-desktop">Filter</p>

          {/* Admin: All Media / My Media toggle */}
          {isAdmin && (
            <div className="admin-view-toggle">
              <button
                className={`view-toggle-btn${adminViewAll ? " active" : ""}`}
                onClick={() => { setAdminViewAll(true); }}
              >All</button>
              <button
                className={`view-toggle-btn${!adminViewAll ? " active" : ""}`}
                onClick={() => setAdminViewAll(false)}
              >Mine</button>
            </div>
          )}

          {/* Type filter nav */}
          <nav className="sidebar-nav">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                className={`sidebar-btn${filter === f.id && !selectedAlbumId ? " active" : ""}`}
                onClick={() => { setFilter(f.id); setSelectedAlbumId(null); setSidebarOpen(false); }}
              >
                <span className="sidebar-btn-icon">{f.icon}</span>
                {f.label}
              </button>
            ))}
          </nav>

          {!loading && !error && (
            <div className="sidebar-count-row">
              <p className="sidebar-count">
                {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
              </p>
              <button
                className="sidebar-refresh-btn"
                onClick={refresh}
                title="Refresh media"
                aria-label="Refresh media"
              >↻</button>
            </div>
          )}

          {/* Upload button — visible to every user */}
          <input
            ref={photoInputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.gif,.bmp,.tiff,.heic,.webp,.avif"
            style={{ display: "none" }}
            onChange={handlePhotoUpload}
          />
          <button
            className="sidebar-btn upload-photos-btn"
            onClick={() => { photoInputRef.current?.click(); setSidebarOpen(false); }}
          >
            <span className="sidebar-btn-icon">⬆</span>
            Upload Photos
          </button>

          {/* Albums section */}
          <div className="albums-section">
            <div className="albums-header">
              <p className="sidebar-title albums-title">Albums</p>
              <button
                className="album-create-btn"
                onClick={() => { setPendingAlbumItem(null); setNewAlbumName(""); setCreatingAlbum(true); }}
                title="New album"
                aria-label="New album"
              >+</button>
            </div>

            {albumsLoading && <p className="sidebar-count">Loading…</p>}

            {!albumsLoading && albums.length === 0 && !creatingAlbum && (
              <p className="sidebar-count">No albums yet</p>
            )}

            <nav className="sidebar-nav">
              {albums.map((album) => (
                <div key={album.id} className="album-item">
                  {renamingAlbumId === album.id ? (
                    <input
                      ref={renameInputRef}
                      className="album-rename-input"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => handleRenameAlbum(album.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameAlbum(album.id);
                        if (e.key === "Escape") setRenamingAlbumId(null);
                      }}
                    />
                  ) : (
                    <button
                      className={`sidebar-btn album-btn${selectedAlbumId === album.id ? " active" : ""}`}
                      onClick={() => {
                        setSelectedAlbumId(selectedAlbumId === album.id ? null : album.id);
                        setSidebarOpen(false);
                      }}
                    >
                      <span className="sidebar-btn-icon">📁</span>
                      <span className="album-btn-name">{album.name}</span>
                      <button
                        className="album-rename-btn"
                        title="Rename album"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingAlbumId(album.id);
                          setRenameValue(album.name);
                        }}
                      >✏</button>
                      <span className="album-count">{album._count?.items ?? 0}</span>
                    </button>
                  )}
                </div>
              ))}
            </nav>

            {/* Inline album creation */}
            {creatingAlbum && (
              <div className="album-create-row">
                <input
                  ref={newAlbumInputRef}
                  className="album-rename-input"
                  placeholder="Album name…"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateAlbum();
                    if (e.key === "Escape") {
                      setCreatingAlbum(false);
                      setPendingAlbumItem(null);
                      setNewAlbumName("");
                    }
                  }}
                />
                <div className="album-create-actions">
                  <button className="album-action-btn" onClick={handleCreateAlbum} aria-label="Confirm">✓</button>
                  <button
                    className="album-action-btn"
                    onClick={() => { setCreatingAlbum(false); setPendingAlbumItem(null); setNewAlbumName(""); }}
                    aria-label="Cancel"
                  >✕</button>
                </div>
              </div>
            )}

            {albumActionError && (
              <p className="admin-msg error">{albumActionError}</p>
            )}
          </div>

          {/* Admin section */}
          {isAdmin && (
            <div className="admin-section">
              <p className="sidebar-title">Admin</p>


              <input
                ref={videoInputRef}
                type="file"
                accept=".zip"
                style={{ display: "none" }}
                onChange={handleVideoUpload}
              />
              <button
                className="admin-btn upload-btn"
                disabled
                title="Video upload is temporarily unavailable"
              >
                <span>🎬</span>
                Upload Video
              </button>
              {videoUploadError && <p className="admin-msg error">{videoUploadError}</p>}

              <button
                className="admin-btn dedupe-btn"
                onClick={handleDeduplicate}
                disabled={dedupeLoading}
              >
                <span>⊗</span>
                {dedupeLoading ? "Running…" : "Deduplicate"}
              </button>
              {dedupeMessage && <p className="admin-msg">{dedupeMessage}</p>}
            </div>
          )}
        </aside>

        {/* ── Sidebar resize handle (desktop only) ──────────── */}
        {!isMobile && (
          <div className="sidebar-resize-handle" onMouseDown={handleResizeStart} />
        )}

        {/* ── Main content ──────────────────────────────────── */}
        <main className="gallery-main" ref={mainRef}>

          <div className="mobile-topbar">
            <button className="mobile-filter-btn" onClick={() => setSidebarOpen(true)}>
              <span className="sidebar-btn-icon">
                {selectedAlbumId
                  ? "📁"
                  : activeFilter?.icon}
              </span>
              {selectedAlbumId
                ? (albums.find((a) => a.id === selectedAlbumId)?.name ?? "Album")
                : activeFilter?.label}
              <span className="mobile-filter-chevron">↑</span>
            </button>
            <button
              className="mobile-upload-btn"
              onClick={() => photoInputRef.current?.click()}
              title="Upload photos"
              aria-label="Upload photos"
            >⬆</button>
            <button
              className="mobile-upload-btn"
              onClick={refresh}
              title="Refresh media"
              aria-label="Refresh media"
            >↻</button>
          </div>

          {loading && (
            <div className="gallery-status">
              <div className="spinner" />
              <p>Loading media…</p>
            </div>
          )}

          {error && (
            <div className="gallery-status">
              <p className="gallery-error">Error: {error}</p>
            </div>
          )}

          {!loading && !error && filteredItems.length === 0 && (
            <div className="gallery-status">
              <p className="gallery-empty">
                {selectedAlbumId ? "This album is empty." : "No media found."}
              </p>
            </div>
          )}

          {!loading && !error && filteredItems.length > 0 && (
            <>
              <div className="media-grid">
                {displayItems.map((item) =>
                  item.type === "photo" ? (
                    <PhotoThumb
                      key={item.id}
                      item={item}
                      onClick={() => setSelected(item)}
                      onContextMenu={(e) => handleContextMenu(e, item)}
                    />
                  ) : (
                    <VideoThumb
                      key={item.id}
                      item={item}
                      onClick={() => setSelected(item)}
                      onContextMenu={(e) => handleContextMenu(e, item)}
                    />
                  )
                )}
              </div>

              {!isMobile && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}

              {isMobile && mobileCount < filteredItems.length && (
                <div ref={sentinelRef} className="scroll-sentinel">
                  <div className="spinner" />
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {selected && (
        <Lightbox
          item={selected}
          items={filteredItems}
          onClose={() => setSelected(null)}
          onNavigate={handleLightboxNavigate}
          userMediaMap={userMediaMap}
          selectedAlbumId={selectedAlbumId}
          isAdmin={isAdmin}
          onRemoveFromAlbum={handleRemoveFromAlbum}
          onRemoveFromLibrary={handleRemoveFromLibrary}
          onDeletePermanently={handleDeletePermanently}
          onAssignToUser={handleAssignToUser}
          onSaveMeta={handleSaveMeta}
        />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          item={contextMenu.item}
          albums={albums}
          userMediaMap={userMediaMap}
          onClose={() => setContextMenu(null)}
          onAddToAlbum={handleAddToAlbum}
          onCreateAndAdd={handleCreateAndAdd}
          selectedAlbumId={selectedAlbumId}
          isAdmin={isAdmin}
          onRemoveFromAlbum={handleRemoveFromAlbum}
          onRemoveFromLibrary={handleRemoveFromLibrary}
          onDeletePermanently={handleDeletePermanently}
          onAssignToUser={handleAssignToUser}
        />
      )}

      {/* Admin: assign media to another user */}
      {assignTarget && (
        <AssignToUserModal
          item={assignTarget}
          onClose={() => setAssignTarget(null)}
          onConfirm={handleAssignConfirm}
        />
      )}

      {/* Per-file upload progress panel */}
      <UploadQueue queue={uploadQueue} onDismiss={clearUploadQueue} />
    </div>
  );
}
