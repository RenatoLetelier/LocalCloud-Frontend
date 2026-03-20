import { useState, useEffect, useCallback, useRef } from "react";
import Header from "../../components/HeaderComponent/Header.component.jsx";
import { useAuth } from "../../context/Contexts.jsx";
import { getPhotos, getVideos, uploadMedia, deduplicateMedia } from "../../api/media.js";
import "./GalleryPage.css";

const FILTERS = [
  { id: "all", label: "All", icon: "⊞" },
  { id: "photo", label: "Photos", icon: "🖼" },
  { id: "video", label: "Videos", icon: "🎬" },
];

const API_URL = import.meta.env.VITE_API_URL ?? "";

function mediaUrl(filename) {
  return `${API_URL}/api/media/file/${filename}`;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

  const fileInputRef = useRef(null);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        let fetched = [];
        if (filter === "all") {
          const [photosRes, videosRes] = await Promise.all([getPhotos(), getVideos()]);
          fetched = [
            ...(photosRes.data.data ?? []),
            ...(videosRes.data.data ?? []),
          ];
        } else if (filter === "photo") {
          const res = await getPhotos();
          fetched = res.data.data ?? [];
        } else {
          const res = await getVideos();
          fetched = res.data.data ?? [];
        }

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

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") setSelected(null);
  }, []);

  useEffect(() => {
    if (selected) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selected, handleKeyDown]);

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploadLoading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("file", f));
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

        <main className="gallery-main">
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
            <div className="media-grid">
              {items.map((item) => (
                <button
                  key={item.id}
                  className="media-thumb"
                  onClick={() => setSelected(item)}
                  title={item.filename}
                >
                  {item.type === "photo" ? (
                    <img
                      src={mediaUrl(item.filename)}
                      alt={item.filename}
                      loading="lazy"
                    />
                  ) : (
                    <div className="video-thumb-wrapper">
                      <video src={mediaUrl(item.filename)} preload="metadata" muted />
                      <div className="play-overlay">
                        <span className="play-icon">▶</span>
                      </div>
                    </div>
                  )}
                  <div className="thumb-overlay">
                    <span className="thumb-name">{item.filename}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>
      </div>

      {selected && (
        <div
          className="lightbox-backdrop"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Media viewer"
        >
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="lightbox-close"
              onClick={() => setSelected(null)}
              aria-label="Close"
            >
              ✕
            </button>

            <div className="lightbox-media">
              {selected.type === "photo" ? (
                <img
                  src={mediaUrl(selected.filename)}
                  alt={selected.filename}
                  className="lightbox-image"
                />
              ) : (
                <video
                  src={mediaUrl(selected.filename)}
                  controls
                  autoPlay
                  className="lightbox-video"
                />
              )}
            </div>

            <div className="lightbox-info">
              <span className="lightbox-filename">{selected.filename}</span>
              <span className="lightbox-meta">
                {formatSize(selected.size)} · {new Date(selected.mtime).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
