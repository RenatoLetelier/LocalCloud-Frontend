'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center min-h-[calc(100vh-4rem)]">
      <AlertTriangle className="w-16 h-16 text-amber-500" />
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        Algo salió mal
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
        {error.message || 'Ocurrió un error inesperado. Intenta nuevamente.'}
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Reintentar
      </button>
    </div>
  );
}
