import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LiveBadge } from '@/components/realtime/LiveBadge';

interface MapCardProps {
  title: string;
  live?: boolean;
  lastUpdatedAt?: Date | null;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Card shell for map widgets (Dashboard fleet map, Map/Updater screen). */
export function MapCard({ title, live, lastUpdatedAt, action, children, className }: MapCardProps) {
  return (
    <div className={cn('bg-background-card border border-border rounded-lg overflow-hidden', className)}>
      <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
        <div className="flex items-center gap-3">
          {action}
          {live && <LiveBadge lastUpdatedAt={lastUpdatedAt} />}
        </div>
      </div>
      {children}
    </div>
  );
}
