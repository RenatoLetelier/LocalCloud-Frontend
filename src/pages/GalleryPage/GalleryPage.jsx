import { useState, useEffect, useCallback, useRef } from "react";
import Header from "../../components/HeaderComponent/Header.component.jsx";
import { useAuth } from "../../context/Contexts.jsx";
import { getPhotos, getVideos, uploadPhotos, uploadVideo, deduplicateMedia } from "../../api/media.js";
import api from "../../api/axiosInstance.js";
import "./GalleryPage.css";

// Module-level cache: survives component remounts
const mediaCache = { key: -1, photos: null, videos: null };
const blobUrlCache = new Map(); // filename → object URL

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

// ── useAuthBlob ───────────────────────────────────────────────────────────────

function useAuthBlob(item) {
  const filename = item?.filename;
  const [src, setSrc] = useState(() => (filename ? (blobUrlCache.get(filename) ?? null) : null));

  useEffect(() => {
    if (!item || !filename) return;
    if (blobUrlCache.has(filename)) {
      setSrc(blobUrlCache.get(filename));
      return;
    }
    const streamUrl = item.type === "photo"
      ? `/api/photos/${item.id}/stream`
      : `/api/videos/${item.id}/stream`;

    let cancelled = false;
    api
      .get(streamUrl, { responseType: "blob" })
      .then((res) => {
        const url = URL.createObjectURL(res.data);
        blobUrlCache.set(filename, url);
        if (!cancelled) setSrc(url);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [filename, item?.id, item?.type]); // eslint-disable-line react-hooks/exhaustive-deps

  return src;
}

// ── Thumbnail components ──────────────────────────────────────────────────────

function PhotoThumb({ item, onClick }) {
  const src = useAuthBlob(item);
  return (
    <button className="media-thumb" onClick={onClick} title={item.filename}>
      {src ? <img src={src} alt={item.filename} /> : <div className="thumb-placeholder" />}
      <div className="thumb-overlay">
        <span className="thumb-name">{item.filename}</span>
      </div>
    </button>
  );
}

function VideoThumb({ item, onClick }) {
  const src = useAuthBlob(item);
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
          onLoadedMetadata={() => { if (videoRef.current) videoRef.current.currentTime = 1; }}
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

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({ item, items, onClose, onNavigate }) {
  const mediaSrc = useAuthBlob(item);
  const isMobile = useIsMobile();
  const currentIndex = items.findIndex((i) => i.filename === item.filename);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < items.length - 1;
  const touchStartX = useRef(null);

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
        {/* Mobile top bar: close + counter */}
        <div className="lightbox-mobile-bar">
          <button className="lightbox-mobile-close" onClick={onClose} aria-label="Close">✕</button>
          <span className="lightbox-counter">{currentIndex + 1} / {items.length}</span>
          <div style={{ width: 40 }} /> {/* spacer to center counter */}
        </div>

        {/* Media fills the screen */}
        <div className="lightbox-mobile-media" onClick={onClose}>
          {!mediaSrc ? (
            <div className="lightbox-loading"><div className="spinner" /></div>
          ) : item.type === "photo" ? (
            <img
              src={mediaSrc}
              alt={item.filename}
              className="lightbox-mobile-img"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <video
              src={mediaSrc}
              controls
              autoPlay
              playsInline
              className="lightbox-mobile-video"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>

        {/* Swipe hint dots — shown only if multiple items */}
        {items.length > 1 && (
          <div className="lightbox-mobile-info">
            <span className="lightbox-filename">{item.filename}</span>
            <span className="lightbox-meta">
              {formatSize(item.size)} · {new Date(item.mtime).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Desktop layout
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

        <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
          <button className="lightbox-close" onClick={onClose} aria-label="Close">✕</button>

          <div className="lightbox-media">
            {!mediaSrc ? (
              <div className="lightbox-loading"><div className="spinner" /></div>
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GalleryPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isMobile = useIsMobile();

  const [filter, setFilter]           = useState("all");
  const [refreshKey, setRefreshKey]   = useState(0);
  const [items, setItems]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [selected, setSelected]       = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError]     = useState(null);
  const [dedupeLoading, setDedupeLoading] = useState(false);
  const [dedupeMessage, setDedupeMessage] = useState(null);

  // ── Desktop pagination ────────────────────────────────────────────────────
  const mainRef = useRef(null);
  const fileInputRef = useRef(null);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const itemsPerPage = useItemsPerPage(mainRef, !isMobile);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => { setCurrentPage(0); }, [filter, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  useEffect(() => { setCurrentPage((p) => Math.min(p, totalPages - 1)); }, [totalPages]);

  const pageItems = items.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  const handleLightboxNavigate = useCallback((item) => {
    setSelected(item);
    const idx = items.findIndex((i) => i.filename === item.filename);
    if (idx !== -1 && !isMobile) setCurrentPage(Math.floor(idx / itemsPerPage));
  }, [items, itemsPerPage, isMobile]);

  // ── Mobile infinite scroll ────────────────────────────────────────────────
  const [mobileCount, setMobileCount] = useState(24);
  const sentinelRef = useRef(null);

  useEffect(() => { if (isMobile) setMobileCount(24); }, [filter, refreshKey, isMobile]);

  useEffect(() => {
    if (!isMobile || !sentinelRef.current || !mainRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setMobileCount((c) => Math.min(c + 24, items.length));
      },
      { root: mainRef.current, rootMargin: "0px 0px 300px 0px" }
    );
    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, [isMobile, mobileCount, items.length]);

  const displayItems = isMobile ? items.slice(0, mobileCount) : pageItems;

  // ── Data fetching ─────────────────────────────────────────────────────────
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
          blobUrlCache.clear();
        }

        const fetches = [];
        if (!mediaCache.photos) fetches.push(getPhotos().then((r) => { mediaCache.photos = r.data.data ?? []; }));
        if (!mediaCache.videos) fetches.push(getVideos().then((r) => { mediaCache.videos = r.data.data ?? []; }));
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

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleUpload = async (e) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadLoading(true);
    setUploadError(null);
    try {
      const photos = files.filter((f) => f.type.startsWith("image/"));
      const videos = files.filter((f) => f.type.startsWith("video/"));

      const uploads = [];
      if (photos.length) {
        const formData = new FormData();
        photos.forEach((f) => formData.append("files", f));
        uploads.push(uploadPhotos(formData));
      }
      videos.forEach((f) => uploads.push(uploadVideo(f)));

      await Promise.all(uploads);
      refresh();
    } catch (err) {
      setUploadError(err.message ?? "Upload failed");
    } finally {
      setUploadLoading(false);
      e.target.value = "";
    }
  };

  const handleDeduplicate = async () => {
    setSidebarOpen(false);
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

  const activeFilter = FILTERS.find((f) => f.id === filter);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="gallery-page">
      <Header />

      <div className="gallery-layout">

        {/* ── Mobile sidebar backdrop ───────────────────────── */}
        {sidebarOpen && (
          <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
        )}

        {/* ── Sidebar / bottom sheet ────────────────────────── */}
        <aside className={`gallery-sidebar${sidebarOpen ? " sidebar-open" : ""}`}>
          {/* Sheet drag handle + header (mobile only, hidden on desktop via CSS) */}
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

          {/* Desktop-only standalone title */}
          <p className="sidebar-title sidebar-title-desktop">Filter</p>

          <nav className="sidebar-nav">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                className={`sidebar-btn${filter === f.id ? " active" : ""}`}
                onClick={() => { setFilter(f.id); setSidebarOpen(false); }}
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
                onClick={() => { fileInputRef.current?.click(); setSidebarOpen(false); }}
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

        {/* ── Main content ──────────────────────────────────── */}
        <main className="gallery-main" ref={mainRef}>

          {/* Mobile top bar: filter toggle */}
          <div className="mobile-topbar">
            <button className="mobile-filter-btn" onClick={() => setSidebarOpen(true)}>
              <span className="sidebar-btn-icon">{activeFilter?.icon}</span>
              {activeFilter?.label}
              <span className="mobile-filter-chevron">↑</span>
            </button>
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

          {!loading && !error && items.length === 0 && (
            <div className="gallery-status">
              <p className="gallery-empty">No media found.</p>
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <>
              <div className="media-grid">
                {displayItems.map((item) =>
                  item.type === "photo" ? (
                    <PhotoThumb key={item.filename} item={item} onClick={() => setSelected(item)} />
                  ) : (
                    <VideoThumb key={item.filename} item={item} onClick={() => setSelected(item)} />
                  )
                )}
              </div>

              {/* Desktop: pagination */}
              {!isMobile && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}

              {/* Mobile: infinite scroll sentinel */}
              {isMobile && mobileCount < items.length && (
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
          items={items}
          onClose={() => setSelected(null)}
          onNavigate={handleLightboxNavigate}
        />
      )}
    </div>
  );
}
