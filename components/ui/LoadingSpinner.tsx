import { cn } from '@/lib/utils';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-[3px]',
};

export function LoadingSpinner({ size = 'md', className }: Props) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'rounded-full border-gray-300 border-t-indigo-500 animate-spin dark:border-gray-700 dark:border-t-indigo-400',
        sizes[size],
        className,
      )}
    />
  );
}
