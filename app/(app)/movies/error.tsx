'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function MoviesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center min-h-[400px]">
      <AlertTriangle className="w-12 h-12 text-amber-500" />
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Error al cargar las películas
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
        {error.message || 'No se pudieron cargar las películas. Verifica tu conexión.'}
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Reintentar
      </button>
    </div>
  );
}
