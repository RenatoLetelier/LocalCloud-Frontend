import { AlertCircle } from 'lucide-react';

interface Props {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center text-gray-500 dark:text-gray-400">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <p className="text-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 text-sm text-indigo-500 hover:text-indigo-400 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
