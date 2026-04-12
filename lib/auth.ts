import type { UserPublic } from './types';

const TOKEN_COOKIE = 'lc_token';
const USER_KEY = 'lc_user';

// ─── Token cookie (read by middleware for route protection) ───────────────────

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${TOKEN_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function saveAuth(token: string, user: UserPublic): void {
  // Derive expiry from JWT payload so the cookie matches the token lifetime
  let expires = '';
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp) {
      expires = `; expires=${new Date(payload.exp * 1000).toUTCString()}`;
    }
  } catch {
    // Fallback: 7 days
    expires = `; expires=${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString()}`;
  }

  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/${expires}; SameSite=Strict${secure}`;
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  document.cookie = `${TOKEN_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict`;
  sessionStorage.removeItem(USER_KEY);
}

// ─── Cached user (avoids a network round-trip on every page load) ─────────────

export function getSavedUser(): UserPublic | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as UserPublic) : null;
  } catch {
    return null;
  }
}
