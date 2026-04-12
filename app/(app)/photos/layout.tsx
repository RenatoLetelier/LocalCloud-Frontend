'use client';

export const runtime = 'edge';

import { Suspense, useState } from 'react';
import { Menu } from 'lucide-react';
import { PhotosSidebar } from '@/components/layout/PhotosSidebar';

export default function PhotosLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)]">

      {/* ── Sidebar ──
           Suspense is required because PhotosSidebar uses useSearchParams(),
           which opts the component into client-side rendering.              */}
      <Suspense key="sidebar" fallback={<div className="fixed top-16 left-0 bottom-0 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800" />}>
        <PhotosSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </Suspense>

      {/* ── Mobile backdrop (closes sidebar on tap outside) ── */}
      {sidebarOpen && (
        <div
          key="backdrop"
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main content ──
           On mobile: full width (sidebar overlays)
           On md+:    offset by sidebar width                  */}
      <main key="main" className="flex-1 md:ml-64 overflow-auto min-w-0">

        {/* Mobile-only top bar with hamburger */}
        <div className="md:hidden flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Photos</span>
        </div>

        <div>{children}</div>
      </main>
    </div>
  );
}
