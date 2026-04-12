'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { FileRecord } from '@/lib/types';

export const fileKeys = {
  all: ['files'] as const,
  list: (userId?: string) => [...fileKeys.all, 'list', userId] as const,
  detail: (id: string) => [...fileKeys.all, 'detail', id] as const,
};

export function useFiles(userId?: string) {
  return useQuery<FileRecord[]>({
    queryKey: fileKeys.list(userId),
    queryFn: () => api.files.list(userId),
  });
}

export function useFile(id: string) {
  return useQuery<FileRecord>({
    queryKey: fileKeys.detail(id),
    queryFn: () => api.files.get(id),
    enabled: !!id,
  });
}
