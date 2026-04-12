'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'lc_playback_progress';
const SAVE_INTERVAL = 10_000; // Save every 10 seconds
const MIN_PROGRESS = 5;       // Don't save if less than 5 seconds watched
const COMPLETION_THRESHOLD = 0.95; // Consider finished if >95% watched

export interface PlaybackEntry {
  movieId: string;
  currentTime: number;
  duration: number;
  updatedAt: string;
}

function loadAll(): Record<string, PlaybackEntry> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAll(data: Record<string, PlaybackEntry>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Hook for reading all playback progress entries (for "Continue Watching" row).
 */
export function useAllPlaybackProgress() {
  const [entries, setEntries] = useState<PlaybackEntry[]>([]);

  useEffect(() => {
    const all = loadAll();
    // Sort by most recently watched, filter out completed
    const sorted = Object.values(all)
      .filter((e) => e.currentTime / e.duration < COMPLETION_THRESHOLD)
      .filter((e) => e.currentTime >= MIN_PROGRESS)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setEntries(sorted);
  }, []);

  return entries;
}

/**
 * Hook for saving/loading progress of a specific movie.
 */
export function usePlaybackProgress(movieId: string) {
  const [savedTime, setSavedTime] = useState<number | null>(null);

  // Load saved progress on mount
  useEffect(() => {
    const all = loadAll();
    const entry = all[movieId];
    if (entry && entry.currentTime >= MIN_PROGRESS && entry.currentTime / entry.duration < COMPLETION_THRESHOLD) {
      setSavedTime(entry.currentTime);
    }
  }, [movieId]);

  // Save progress function
  const saveProgress = useCallback((currentTime: number, duration: number) => {
    if (duration <= 0 || currentTime < MIN_PROGRESS) return;

    const all = loadAll();

    // If completed, remove the entry
    if (currentTime / duration >= COMPLETION_THRESHOLD) {
      delete all[movieId];
    } else {
      all[movieId] = {
        movieId,
        currentTime,
        duration,
        updatedAt: new Date().toISOString(),
      };
    }
    saveAll(all);
  }, [movieId]);

  // Clear progress
  const clearProgress = useCallback(() => {
    const all = loadAll();
    delete all[movieId];
    saveAll(all);
    setSavedTime(null);
  }, [movieId]);

  return { savedTime, saveProgress, clearProgress, SAVE_INTERVAL };
}
