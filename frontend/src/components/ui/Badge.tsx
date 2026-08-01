import { cn } from '@/lib/utils';

export function Badge({ className, children, variant = 'default' }: {
  className?: string;
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}) {
  const variants = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    destructive: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}
