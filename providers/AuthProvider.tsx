'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getSavedUser } from '@/lib/auth';
import type { UserPublic } from '@/lib/types';

interface AuthContextValue {
  user: UserPublic | null;
  setUser: (user: UserPublic | null) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  setUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);

  useEffect(() => {
    // Hydrate from sessionStorage (saved on login) so the navbar renders
    // immediately without an extra network round-trip.
    const saved = getSavedUser();
    if (saved) setUser(saved);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
