'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Maximize, Minimize, Pause, Play, SkipBack, SkipForward,
  Volume2, VolumeX, Subtitles, Settings, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubtitleTrack {
  label: string;
  src: string;
  lang: string;
}

interface Props {
  src: string;
  title: string;
  /** Resume from this time (seconds) */
  startTime?: number | null;
  subtitles?: SubtitleTrack[];
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function VideoPlayer({ src, title, startTime, subtitles = [], onTimeUpdate, onEnded }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showResumePrompt, setShowResumePrompt] = useState(!!startTime && startTime > 5);
  const [activeSubtitle, setActiveSubtitle] = useState(-1); // -1 = off
  const [showSubMenu, setShowSubMenu] = useState(false);

  // Apply subtitle track via TextTrack API (the `default` attr only applies at mount)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    Array.from(video.textTracks).forEach((track, i) => {
      track.mode = i === activeSubtitle ? 'showing' : 'hidden';
    });
  }, [activeSubtitle]);

  // ── Auto-hide controls ────────────────────────────────────────────────────
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (playing) {
      hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [playing]);

  useEffect(() => {
    resetHideTimer();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [playing, resetHideTimer]);

  // ── Video event handlers ──────────────────────────────────────────────────
  function handleLoadedMetadata() {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration);
    setLoading(false);
  }

  function handleTimeUpdate() {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    onTimeUpdate?.(v.currentTime, v.duration);

    // Update buffered
    if (v.buffered.length > 0) {
      setBuffered(v.buffered.end(v.buffered.length - 1));
    }
  }

  function handleEnded() {
    setPlaying(false);
    onEnded?.();
  }

  // ── Controls ──────────────────────────────────────────────────────────────
  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  }

  function seek(time: number) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(time, duration));
  }

  function handleSeekBar(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    seek(pct * duration);
  }

  function skip(seconds: number) {
    const v = videoRef.current;
    if (v) seek(v.currentTime + seconds);
  }

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseFloat(e.target.value);
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    setVolume(val);
    if (val > 0 && v.muted) { v.muted = false; setMuted(false); }
  }

  function toggleFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setFullscreen(false);
    } else {
      el.requestFullscreen();
      setFullscreen(true);
    }
  }

  // Resume prompt
  function handleResume() {
    seek(startTime!);
    setShowResumePrompt(false);
    togglePlay();
  }

  function handleStartOver() {
    seek(0);
    setShowResumePrompt(false);
    togglePlay();
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      switch (e.key) {
        case ' ':
        case 'k': e.preventDefault(); togglePlay(); break;
        case 'ArrowLeft': e.preventDefault(); skip(-10); break;
        case 'ArrowRight': e.preventDefault(); skip(10); break;
        case 'ArrowUp': e.preventDefault(); handleVolumeChange({ target: { value: String(Math.min(1, volume + 0.1)) } } as React.ChangeEvent<HTMLInputElement>); break;
        case 'ArrowDown': e.preventDefault(); handleVolumeChange({ target: { value: String(Math.max(0, volume - 0.1)) } } as React.ChangeEvent<HTMLInputElement>); break;
        case 'f': e.preventDefault(); toggleFullscreen(); break;
        case 'm': e.preventDefault(); toggleMute(); break;
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  // Fullscreen change listener
  useEffect(() => {
    function handleFsChange() {
      setFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative bg-black w-full aspect-video rounded-xl overflow-hidden group select-none"
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
        onClick={togglePlay}
        playsInline
        crossOrigin="anonymous"
      >
        {subtitles.map((sub, i) => (
          <track
            key={sub.lang}
            kind="subtitles"
            src={sub.src}
            srcLang={sub.lang}
            label={sub.label}
            default={i === activeSubtitle}
          />
        ))}
      </video>

      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-white animate-spin" />
        </div>
      )}

      {/* Resume prompt */}
      {showResumePrompt && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
          <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-gray-900 border border-gray-700">
            <p className="text-white text-sm">
              Continuar desde {formatTime(startTime!)}?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleStartOver}
                className="px-4 py-2 text-sm rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
              >
                Desde el inicio
              </button>
              <button
                onClick={handleResume}
                className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Play overlay (big play button when paused) */}
      {!playing && !showResumePrompt && !loading && (
        <div className="absolute inset-0 flex items-center justify-center cursor-pointer" onClick={togglePlay}>
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-8 h-8 text-white ml-1" fill="white" />
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 transition-opacity duration-300',
          showControls || !playing ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      >
        {/* Gradient background */}
        <div className="bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-16 pb-3 px-4">

          {/* Seek bar */}
          <div
            className="group/seek relative w-full h-1.5 bg-white/20 rounded-full cursor-pointer mb-3 hover:h-2.5 transition-all"
            onClick={handleSeekBar}
          >
            {/* Buffered */}
            <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full" style={{ width: `${bufferedPct}%` }} />
            {/* Progress */}
            <div className="absolute inset-y-0 left-0 bg-indigo-500 rounded-full" style={{ width: `${progress}%` }} />
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-indigo-500 rounded-full shadow-lg opacity-0 group-hover/seek:opacity-100 transition-opacity"
              style={{ left: `calc(${progress}% - 7px)` }}
            />
          </div>

          {/* Bottom bar */}
          <div className="flex items-center gap-2 text-white">
            {/* Play/pause */}
            <button onClick={togglePlay} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
              {playing ? <Pause className="w-5 h-5" fill="white" /> : <Play className="w-5 h-5 ml-0.5" fill="white" />}
            </button>

            {/* Skip back/forward */}
            <button onClick={() => skip(-10)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="-10s">
              <SkipBack className="w-4 h-4" />
            </button>
            <button onClick={() => skip(10)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="+10s">
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Time display */}
            <span className="text-xs tabular-nums px-1">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex-1" />

            {/* Volume */}
            <div className="flex items-center gap-1 group/vol">
              <button onClick={toggleMute} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-0 group-hover/vol:w-20 transition-all duration-200 accent-indigo-500 h-1 cursor-pointer"
              />
            </div>

            {/* Subtitles */}
            {subtitles.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowSubMenu(!showSubMenu)}
                  className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    activeSubtitle >= 0 ? 'bg-indigo-600 hover:bg-indigo-700' : 'hover:bg-white/10',
                  )}
                  title="Subtítulos"
                >
                  <Subtitles className="w-4 h-4" />
                </button>
                {showSubMenu && (
                  <div className="absolute bottom-full right-0 mb-2 py-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl min-w-[140px]">
                    <button
                      onClick={() => { setActiveSubtitle(-1); setShowSubMenu(false); }}
                      className={cn(
                        'w-full text-left px-3 py-1.5 text-xs hover:bg-white/10',
                        activeSubtitle === -1 && 'text-indigo-400',
                      )}
                    >
                      Desactivados
                    </button>
                    {subtitles.map((sub, i) => (
                      <button
                        key={sub.lang}
                        onClick={() => { setActiveSubtitle(i); setShowSubMenu(false); }}
                        className={cn(
                          'w-full text-left px-3 py-1.5 text-xs hover:bg-white/10',
                          activeSubtitle === i && 'text-indigo-400',
                        )}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
              {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
