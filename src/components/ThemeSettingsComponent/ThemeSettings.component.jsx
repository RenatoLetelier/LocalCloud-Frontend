import { useState, useEffect, useRef, useLayoutEffect } from "react";
import "./ThemeSettings.component.css";

const STORAGE_KEY = "theme-config";

const DEFAULTS = {
  primaryH: 211,
  primaryS: 90,
  primaryL: 52,
};

function readConfig() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULTS, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return { ...DEFAULTS };
}

export function applyThemeConfig(cfg) {
  const root = document.documentElement;
  root.style.setProperty("--h-primary", String(cfg.primaryH));
  root.style.setProperty("--s-primary", `${cfg.primaryS}%`);
  root.style.setProperty("--l-primary", `${cfg.primaryL}%`);
}

/** Call on app boot to restore any saved theme config. */
export function initThemeConfig() {
  applyThemeConfig(readConfig());
}

export default function ThemeSettings({ isOpen, anchorRef, onClose }) {
  const [config, setConfig] = useState(readConfig);
  const panelRef = useRef(null);

  // Apply whenever config changes
  useEffect(() => {
    applyThemeConfig(config);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch { /* ignore */ }
  }, [config]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      const anchor = anchorRef?.current;
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        !(anchor && anchor.contains(e.target))
      ) {
        onClose?.();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, anchorRef, onClose]);

  // Position panel below the anchor button
  useLayoutEffect(() => {
    if (!isOpen) return;
    const anchor = anchorRef?.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;

    const position = () => {
      const rect = anchor.getBoundingClientRect();
      panel.style.top   = `${rect.bottom + 6}px`;
      panel.style.right = `${window.innerWidth - rect.right}px`;
    };

    position();
    window.addEventListener("resize", position);
    return () => window.removeEventListener("resize", position);
  }, [isOpen, anchorRef]);

  if (!isOpen) return null;

  const update = (key, val) => setConfig((c) => ({ ...c, [key]: Number(val) }));
  const reset  = () => setConfig({ ...DEFAULTS });

  const previewColor = `hsl(${config.primaryH}, ${config.primaryS}%, ${config.primaryL}%)`;

  return (
    <div className="theme-settings-panel" ref={panelRef}>
      <div className="theme-settings-header">
        <span className="theme-settings-title">Theme Colors</span>
        <button
          className="theme-settings-reset"
          onClick={reset}
          title="Reset to defaults"
          aria-label="Reset to defaults"
        >↺ Reset</button>
      </div>

      <div className="theme-settings-preview">
        <div
          className="theme-settings-swatch"
          style={{ background: previewColor }}
          aria-label={`Preview: ${previewColor}`}
        />
        <code className="theme-settings-swatch-label">{previewColor}</code>
      </div>

      <div className="theme-settings-section">
        <p className="theme-settings-section-label">Primary Accent</p>

        <SliderRow
          label="Hue"
          min={0} max={360} step={1}
          value={config.primaryH}
          onChange={(v) => update("primaryH", v)}
          gradient="linear-gradient(to right,
            hsl(0,90%,52%), hsl(30,90%,52%), hsl(60,90%,52%),
            hsl(120,90%,52%), hsl(180,90%,52%), hsl(240,90%,52%),
            hsl(300,90%,52%), hsl(360,90%,52%))"
        />

        <SliderRow
          label="Saturation"
          min={30} max={100} step={1}
          value={config.primaryS}
          onChange={(v) => update("primaryS", v)}
          gradient={`linear-gradient(to right,
            hsl(${config.primaryH},30%,${config.primaryL}%),
            hsl(${config.primaryH},100%,${config.primaryL}%))`}
        />

        <SliderRow
          label="Lightness"
          min={25} max={68} step={1}
          value={config.primaryL}
          onChange={(v) => update("primaryL", v)}
          gradient={`linear-gradient(to right,
            hsl(${config.primaryH},${config.primaryS}%,25%),
            hsl(${config.primaryH},${config.primaryS}%,52%),
            hsl(${config.primaryH},${config.primaryS}%,68%))`}
        />
      </div>

      <div className="theme-settings-presets">
        <p className="theme-settings-section-label">Presets</p>
        <div className="theme-settings-preset-row">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              className="theme-preset-btn"
              style={{ background: `hsl(${p.h},${p.s}%,${p.l}%)` }}
              title={p.name}
              aria-label={p.name}
              onClick={() => setConfig({ primaryH: p.h, primaryS: p.s, primaryL: p.l })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SliderRow({ label, min, max, step, value, onChange, gradient }) {
  return (
    <div className="theme-slider-row">
      <div className="theme-slider-meta">
        <span className="theme-slider-label">{label}</span>
        <span className="theme-slider-value">{value}</span>
      </div>
      <div className="theme-slider-track" style={{ background: gradient }}>
        <input
          type="range"
          className="theme-slider"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

const PRESETS = [
  { name: "Blue",    h: 211, s: 90,  l: 52 },
  { name: "Indigo",  h: 245, s: 85,  l: 58 },
  { name: "Violet",  h: 270, s: 80,  l: 55 },
  { name: "Pink",    h: 328, s: 85,  l: 55 },
  { name: "Red",     h: 4,   s: 82,  l: 52 },
  { name: "Orange",  h: 25,  s: 95,  l: 50 },
  { name: "Amber",   h: 42,  s: 95,  l: 46 },
  { name: "Green",   h: 145, s: 65,  l: 42 },
  { name: "Teal",    h: 174, s: 72,  l: 38 },
  { name: "Cyan",    h: 192, s: 90,  l: 42 },
];
