import { useEffect } from "react";
import "./UploadQueue.css";

/**
 * Floating upload-progress panel (bottom-right).
 *
 * Props:
 *   queue    – array of { id, file, preview, progress, status, error }
 *   onDismiss – called when the user closes the panel or auto-dismiss fires
 */
export default function UploadQueue({ queue, onDismiss }) {
  const done    = queue.filter((f) => f.status === "done").length;
  const errored = queue.filter((f) => f.status === "error").length;
  const allDone = queue.length > 0 && done + errored === queue.length;

  // Auto-dismiss 4 s after everything finishes
  useEffect(() => {
    if (!allDone) return;
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [allDone, onDismiss]);

  if (!queue.length) return null;

  return (
    <div className="uq-panel" role="status" aria-live="polite">
      {/* ── Header ── */}
      <div className="uq-header">
        <span className="uq-title">
          {allDone
            ? `Upload complete — ${done} file${done !== 1 ? "s" : ""}${errored ? `, ${errored} failed` : ""}`
            : `Uploading ${done} / ${queue.length}…`}
        </span>
        {allDone && (
          <button className="uq-close-btn" onClick={onDismiss} aria-label="Dismiss">
            ✕
          </button>
        )}
      </div>

      {/* ── File list ── */}
      <ul className="uq-list">
        {queue.map((item) => (
          <li key={item.id} className={`uq-item uq-item--${item.status}`}>
            {/* Thumbnail */}
            <div className="uq-thumb">
              {item.preview
                ? <img src={item.preview} alt="" />
                : <span className="uq-file-icon">🖼</span>}
            </div>

            {/* Info */}
            <div className="uq-info">
              <span className="uq-name" title={item.file.name}>
                {item.file.name}
              </span>

              {item.status === "queued" && (
                <span className="uq-badge uq-badge--queued">Queued</span>
              )}
              {item.status === "uploading" && (
                <div className="uq-bar-track">
                  <div className="uq-bar-fill" style={{ width: `${item.progress}%` }} />
                </div>
              )}
              {item.status === "done" && (
                <span className="uq-badge uq-badge--done">✓ Done</span>
              )}
              {item.status === "error" && (
                <span className="uq-badge uq-badge--error" title={item.error}>
                  ✕ Failed
                </span>
              )}
            </div>

            {/* Percentage (only while uploading) */}
            {item.status === "uploading" && (
              <span className="uq-pct">{item.progress}%</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
