import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ChartCardProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Standard card shell wrapping a Recharts/graph — title row + content. */
export function ChartCard({ title, action, children, className }: ChartCardProps) {
  return (
    <div className={cn('bg-background-card border border-border rounded-lg p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
