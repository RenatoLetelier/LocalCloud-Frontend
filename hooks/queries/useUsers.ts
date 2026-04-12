'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { UserPublic } from '@/lib/types';

export const userKeys = {
  all: ['users'] as const,
  list: () => [...userKeys.all, 'list'] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
};

export function useUsers() {
  return useQuery<UserPublic[]>({
    queryKey: userKeys.list(),
    queryFn: () => api.users.list(),
  });
}

export function useUser(id: string) {
  return useQuery<UserPublic>({
    queryKey: userKeys.detail(id),
    queryFn: () => api.users.get(id),
    enabled: !!id,
  });
}
