export const runtime = 'edge';

import { AuthProvider } from '@/providers/AuthProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { Navbar } from '@/components/layout/Navbar';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Toaster } from 'sonner';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <Navbar />
        {/* Push content below the fixed navbar */}
        <div className="pt-16 min-h-screen bg-gray-50 dark:bg-gray-950">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: 'dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700',
          }}
          richColors
          closeButton
        />
      </AuthProvider>
    </QueryProvider>
  );
}
