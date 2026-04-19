'use client';

import { useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PlaybackEntry } from '@/lib/types';

const SAVE_INTERVAL = 10_000; // Save every 10 seconds
const MIN_PROGRESS = 5;       // Don't save if less than 5 seconds watched
const COMPLETION_THRESHOLD = 0.95; // Consider finished if >95% watched

export const playbackKeys = {
  all: ['playback-progress'] as const,
  list: () => [...playbackKeys.all, 'list'] as const,
  detail: (movieId: string) => [...playbackKeys.all, 'detail', movieId] as const,
};

/**
 * Hook for reading all playback progress entries (for "Continue Watching" row).
 */
export function useAllPlaybackProgress() {
  const { data: entries = [] } = useQuery<PlaybackEntry[]>({
    queryKey: playbackKeys.list(),
    queryFn: () => api.playback.list(),
  });

  // Filter and sort: exclude completed, exclude barely-watched, sort by most recent
  const filtered = entries
    .filter((e) => e.currentTime / e.duration < COMPLETION_THRESHOLD)
    .filter((e) => e.currentTime >= MIN_PROGRESS)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return filtered;
}

/**
 * Hook for saving/loading progress of a specific movie.
 */
export function usePlaybackProgress(movieId: string) {
  const queryClient = useQueryClient();
  const lastSaveTimeRef = useRef(0);

  const { data: entry } = useQuery<PlaybackEntry | null>({
    queryKey: playbackKeys.detail(movieId),
    queryFn: async () => {
      try {
        return await api.playback.get(movieId);
      } catch {
        return null;
      }
    },
    enabled: !!movieId,
  });

  const savedTime =
    entry && entry.currentTime >= MIN_PROGRESS && entry.currentTime / entry.duration < COMPLETION_THRESHOLD
      ? entry.currentTime
      : null;

  const saveMutation = useMutation({
    mutationFn: async ({ currentTime, duration }: { currentTime: number; duration: number }) => {
      if (currentTime / duration >= COMPLETION_THRESHOLD) {
        await api.playback.delete(movieId);
      } else {
        await api.playback.save(movieId, currentTime, duration);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: playbackKeys.list() });
      queryClient.invalidateQueries({ queryKey: playbackKeys.detail(movieId) });
    },
  });

  const saveProgress = useCallback(
    (currentTime: number, duration: number) => {
      if (duration <= 0 || currentTime < MIN_PROGRESS) return;
      saveMutation.mutate({ currentTime, duration });
    },
    [saveMutation],
  );

  // Throttled save for use in onTimeUpdate (saves at most every SAVE_INTERVAL)
  const saveProgressThrottled = useCallback(
    (currentTime: number, duration: number) => {
      const now = Date.now();
      if (now - lastSaveTimeRef.current >= SAVE_INTERVAL) {
        saveProgress(currentTime, duration);
        lastSaveTimeRef.current = now;
      }
    },
    [saveProgress],
  );

  const clearProgress = useCallback(() => {
    api.playback.delete(movieId).then(() => {
      queryClient.invalidateQueries({ queryKey: playbackKeys.list() });
      queryClient.invalidateQueries({ queryKey: playbackKeys.detail(movieId) });
    });
  }, [movieId, queryClient]);

  return { savedTime, saveProgress, saveProgressThrottled, clearProgress, SAVE_INTERVAL };
}

// Re-export type for consumers
export type { PlaybackEntry };
