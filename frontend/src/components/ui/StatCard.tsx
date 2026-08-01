import { cn, formatCurrency } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  className?: string;
  isCurrency?: boolean;
}

export function StatCard({ title, value, icon: Icon, trend, className, isCurrency }: StatCardProps) {
  const display = isCurrency && typeof value === 'number' ? formatCurrency(value) : value;
  return (
    <div className={cn('rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md', className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold">{display}</p>
          {trend && <p className="mt-1 text-xs text-muted-foreground">{trend}</p>}
        </div>
        <div className="rounded-full bg-primary/10 p-3">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  );
}
