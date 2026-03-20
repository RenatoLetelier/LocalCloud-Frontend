import { useState, useEffect, useCallback, useRef } from "react";
import Header from "../../components/HeaderComponent/Header.component.jsx";
import { useAuth } from "../../context/Contexts.jsx";
import { getPhotos, getVideos, uploadMedia, deduplicateMedia } from "../../api/media.js";
import api from "../../api/axiosInstance.js";
import "./GalleryPage.css";

// Module-level cache: survives component remounts (e.g. navigating away and back)
const mediaCache = { key: -1, photos: null, videos: null };

// Blob URL cache: keeps fetched image/video blobs alive across component unmounts.
// Without this, every PhotoThumb re-fetch its blob from the API when remounted.
const blobUrlCache = new Map(); // filename → object URL

// ── Items-per-page: fills exactly one screen based on container size ─────────
const GRID_GAP = 10;
const PAGINATION_H = 56; // approximate height of pagination bar

function useItemsPerPage(containerRef) {
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const calc = () => {
      const padX = 20, padY = 20;
      const w = el.clientWidth  - padX * 2;
      const h = el.clientHeight - padY * 2 - PAGINATION_H;
      const minItem = window.innerWidth <= 600 ? 120 : 160;
      const cols = Math.max(1, Math.floor((w + GRID_GAP) / (minItem + GRID_GAP)));
      const rows = Math.max(1, Math.floor((h + GRID_GAP) / (minItem + GRID_GAP)));
      setItemsPerPage(cols * rows);
    };

    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  return itemsPerPage;
}

// ── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  // Build the page number list with ellipsis
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

const FILTERS = [
  { id: "all", label: "All", icon: "⊞" },
  { id: "photo", label: "Photos", icon: "🖼" },
  { id: "video", label: "Videos", icon: "🎬" },
];

const API_URL = import.meta.env.VITE_API_URL ?? "";

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Fetches a media file via axios (sends auth header) and returns a blob URL.
// Blob URLs are safe for <img> / <video> and avoid ORB blocks.
// Results are cached in blobUrlCache so remounting (e.g. switching filters) never re-fetches.
function useAuthBlob(filename) {
  const [src, setSrc] = useState(() => blobUrlCache.get(filename) ?? null);

  useEffect(() => {
    if (!filename) return;
    if (blobUrlCache.has(filename)) {
      setSrc(blobUrlCache.get(filename));
      return;
    }
    let cancelled = false;
    api
      .get(`/api/media/file/${filename}`, { responseType: "blob" })
      .then((res) => {
        const url = URL.createObjectURL(res.data);
        blobUrlCache.set(filename, url);
        if (!cancelled) setSrc(url);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [filename]);

  return src;
}

// ── Sub-components ──────────────────────────────────────────────────────────

function PhotoThumb({ item, onClick }) {
  const src = useAuthBlob(item.filename);
  return (
    <button className="media-thumb" onClick={onClick} title={item.filename}>
      {src ? (
        <img src={src} alt={item.filename} />
      ) : (
        <div className="thumb-placeholder" />
      )}
      <div className="thumb-overlay">
        <span className="thumb-name">{item.filename}</span>
      </div>
    </button>
  );
}

function VideoThumb({ item, onClick }) {
  const src = useAuthBlob(item.filename);
  const videoRef = useRef(null);
  return (
    <button className="media-thumb" onClick={onClick} title={item.filename}>
      {src ? (
        <video
          ref={videoRef}
          src={src}
          className="thumb-video"
          preload="metadata"
          muted
          playsInline
          onLoadedMetadata={() => {
            if (videoRef.current) videoRef.current.currentTime = 1;
          }}
        />
      ) : (
        <div className="thumb-placeholder" />
      )}
      <span className="play-badge">▶</span>
      <div className="thumb-overlay">
        <span className="thumb-name">{item.filename}</span>
      </div>
    </button>
  );
}

function Lightbox({ item, items, onClose, onNavigate }) {
  const mediaSrc = useAuthBlob(item.filename);
  const currentIndex = items.findIndex((i) => i.filename === item.filename);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < items.length - 1;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onNavigate(items[currentIndex - 1]);
      if (e.key === "ArrowRight" && hasNext) onNavigate(items[currentIndex + 1]);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentIndex, hasPrev, hasNext, items, onNavigate, onClose]);

  return (
    <div
      className="lightbox-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Media viewer"
    >
      {/* lightbox-row keeps arrows and content in a flex row so arrows are
          vertically centered with the media, not with the full viewport */}
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

        <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
          <button className="lightbox-close" onClick={onClose} aria-label="Close">
            ✕
          </button>

          <div className="lightbox-media">
            {!mediaSrc ? (
              <div className="lightbox-loading">
                <div className="spinner" />
              </div>
            ) : item.type === "photo" ? (
              <img src={mediaSrc} alt={item.filename} className="lightbox-image" />
            ) : (
              <video src={mediaSrc} controls autoPlay className="lightbox-video" />
            )}
          </div>

          <div className="lightbox-info">
            <span className="lightbox-filename">{item.filename}</span>
            <span className="lightbox-meta">
              {formatSize(item.size)} · {new Date(item.mtime).toLocaleDateString()}
            </span>
          </div>
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

// ── Main page ───────────────────────────────────────────────────────────────

export default function GalleryPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [filter, setFilter] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [dedupeLoading, setDedupeLoading] = useState(false);
  const [dedupeMessage, setDedupeMessage] = useState(null);

  const mainRef = useRef(null);
  const fileInputRef = useRef(null);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const itemsPerPage = useItemsPerPage(mainRef);
  const [currentPage, setCurrentPage] = useState(0);

  // Reset to page 0 whenever the filter or data changes
  useEffect(() => { setCurrentPage(0); }, [filter, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));

  // Clamp current page if total pages shrinks (e.g. screen gets bigger)
  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages - 1));
  }, [totalPages]);

  const pageItems = items.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  // Navigate in lightbox and keep the background page in sync
  const handleLightboxNavigate = useCallback((item) => {
    setSelected(item);
    const idx = items.findIndex((i) => i.filename === item.filename);
    if (idx !== -1) setCurrentPage(Math.floor(idx / itemsPerPage));
  }, [items, itemsPerPage]);

  useEffect(() => {
    let cancelled = false;
    const cacheWarm = mediaCache.key === refreshKey && mediaCache.photos && mediaCache.videos;
    if (!cacheWarm) setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        // Invalidate caches when refreshKey changes (after upload/deduplicate)
        if (mediaCache.key !== refreshKey) {
          mediaCache.key = refreshKey;
          mediaCache.photos = null;
          mediaCache.videos = null;
          blobUrlCache.clear();
        }

        // Always fetch both so switching filters never triggers a reload
        const fetches = [];
        if (!mediaCache.photos) fetches.push(getPhotos().then((r) => { mediaCache.photos = r.data.data ?? []; }));
        if (!mediaCache.videos) fetches.push(getVideos().then((r) => { mediaCache.videos = r.data.data ?? []; }));
        await Promise.all(fetches);

        // Combine and deduplicate by filename (guards against items returned by both endpoints)
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

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploadLoading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("files", f));
      await uploadMedia(formData);
      refresh();
    } catch (err) {
      setUploadError(err.message ?? "Upload failed");
    } finally {
      setUploadLoading(false);
      e.target.value = "";
    }
  };

  const handleDeduplicate = async () => {
    if (!window.confirm("Remove all duplicate files? This cannot be undone.")) return;
    setDedupeLoading(true);
    setDedupeMessage(null);
    try {
      const res = await deduplicateMedia();
      setDedupeMessage(res.data?.message ?? "Done");
      refresh();
    } catch (err) {
      setDedupeMessage(err.message ?? "Failed");
    } finally {
      setDedupeLoading(false);
    }
  };

  return (
    <div className="gallery-page">
      <Header />

      <div className="gallery-layout">
        <aside className="gallery-sidebar">
          <p className="sidebar-title">Filter</p>
          <nav className="sidebar-nav">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                className={`sidebar-btn${filter === f.id ? " active" : ""}`}
                onClick={() => setFilter(f.id)}
              >
                <span className="sidebar-btn-icon">{f.icon}</span>
                {f.label}
              </button>
            ))}
          </nav>

          {!loading && !error && (
            <p className="sidebar-count">
              {items.length} item{items.length !== 1 ? "s" : ""}
            </p>
          )}

          {isAdmin && (
            <div className="admin-section">
              <p className="sidebar-title">Admin</p>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                style={{ display: "none" }}
                onChange={handleUpload}
              />
              <button
                className="admin-btn upload-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadLoading}
              >
                <span>↑</span>
                {uploadLoading ? "Uploading…" : "Upload"}
              </button>
              {uploadError && <p className="admin-msg error">{uploadError}</p>}

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

        <main className="gallery-main" ref={mainRef}>
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

          {!loading && !error && items.length === 0 && (
            <div className="gallery-status">
              <p className="gallery-empty">No media found.</p>
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <>
              <div className="media-grid">
                {pageItems.map((item) =>
                  item.type === "photo" ? (
                    <PhotoThumb
                      key={item.filename}
                      item={item}
                      onClick={() => setSelected(item)}
                    />
                  ) : (
                    <VideoThumb
                      key={item.filename}
                      item={item}
                      onClick={() => setSelected(item)}
                    />
                  )
                )}
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </main>
      </div>

      {selected && (
        <Lightbox
          item={selected}
          items={items}
          onClose={() => setSelected(null)}
          onNavigate={handleLightboxNavigate}
        />
      )}
    </div>
  );
}
