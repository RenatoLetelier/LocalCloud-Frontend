'use client';

import { createContext, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getSavedUser, saveUser, clearAuth, getToken } from '@/lib/auth';
import type { UserPublic } from '@/lib/types';

export const authKeys = {
  me: ['auth', 'me'] as const,
};

interface AuthContextValue {
  user: UserPublic | null;
  isLoading: boolean;
  setUser: (user: UserPublic | null) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  setUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user = null, isLoading } = useQuery<UserPublic | null>({
    queryKey: authKeys.me,
    queryFn: async () => {
      try {
        const me = await api.auth.me();
        saveUser(me);
        return me;
      } catch {
        clearAuth();
        return null;
      }
    },
    // Use sessionStorage as instant initial data (avoids blank navbar flash)
    initialData: () => getSavedUser(),
    // Only fetch if we have a token
    enabled: !!getToken(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  function setUser(newUser: UserPublic | null) {
    if (newUser) {
      saveUser(newUser);
    } else {
      clearAuth();
    }
    queryClient.setQueryData(authKeys.me, newUser);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
