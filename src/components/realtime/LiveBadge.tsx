'use client';

interface LiveBadgeProps {
  label?: string;
  lastUpdatedAt?: Date | null;
  className?: string;
}

export function LiveBadge({ label = 'Live', lastUpdatedAt, className }: LiveBadgeProps) {
  return (
    <div className={className ?? 'flex items-center gap-2 text-2xs text-text-muted'}>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
      <span className="font-medium text-success">{label}</span>
      {lastUpdatedAt && (
        <span>· {lastUpdatedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
      )}
    </div>
  );
}
