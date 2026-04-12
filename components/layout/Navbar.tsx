'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { ChevronRight, Cloud, LogOut, Moon, Sun, User } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { clearAuth } from '@/lib/auth';

const PROJECT_LABELS: Record<string, string> = {
  '/photos': 'Photos',
  '/movies': 'Movies',
};

function getProjectName(pathname: string): string | null {
  for (const [prefix, label] of Object.entries(PROJECT_LABELS)) {
    if (pathname.startsWith(prefix)) return label;
  }
  return null;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const project = getProjectName(pathname);

  // next-themes: theme is undefined on the server — wait for mount
  // to avoid SSR/client HTML mismatch (hydration error).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function handleLogout() {
    clearAuth();
    router.replace('/login');
  }

  return (
    <header className="
      fixed top-0 left-0 right-0 z-50 h-16
      flex items-center px-6 gap-4
      bg-white/80 dark:bg-gray-950/90 backdrop-blur-md
      border-b border-gray-200 dark:border-gray-800
    ">
      {/* ── Left: brand + current project ── */}
      <nav className="flex items-center gap-1.5 min-w-0">
        <Link
          href="/"
          className="flex items-center gap-2 shrink-0 text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <Cloud className="w-5 h-5 text-indigo-500" />
          <span className="font-semibold text-sm">LocalCloud</span>
        </Link>

        {project && (
          <>
            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
              {project}
            </span>
          </>
        )}
      </nav>

      {/* ── Spacer ── */}
      <div className="flex-1" />

      {/* ── Right: user info + controls ── */}
      <div className="flex items-center gap-3">
        {/* Username */}
        {user && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <User className="w-4 h-4 shrink-0" />
            <span className="hidden sm:block truncate max-w-[140px]">{user.name}</span>
          </div>
        )}

        {/* Divider */}
        <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />

        {/* Theme toggle — only rendered after mount to avoid hydration mismatch */}
        {mounted && (
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
            className="
              p-2 rounded-lg text-gray-500 dark:text-gray-400
              hover:bg-gray-100 dark:hover:bg-gray-800
              transition-colors
            "
          >
            {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          aria-label="Sign out"
          className="
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
            text-gray-500 dark:text-gray-400
            hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-500 dark:hover:text-red-400
            transition-colors
          "
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:block">Logout</span>
        </button>
      </div>
    </header>
  );
}
