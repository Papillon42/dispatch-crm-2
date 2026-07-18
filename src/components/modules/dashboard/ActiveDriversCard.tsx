import Link from 'next/link';
import type { ActiveDriverRow } from '@/lib/services/types';

const STATUS_LABEL: Record<string, string> = {
  IN_TRANSIT: 'In Transit',
  LOADING: 'Loading',
  UNLOADING: 'Unloading',
  WAITING: 'Waiting',
  IDLE: 'Idle',
  PROBLEM: 'Problem',
  AVAILABLE: 'Available',
};

const STATUS_CLASS: Record<string, string> = {
  IN_TRANSIT: 'bg-blue-500/15 text-blue-400',
  LOADING: 'bg-amber-500/15 text-amber-400',
  UNLOADING: 'bg-amber-500/15 text-amber-400',
  WAITING: 'bg-violet-500/15 text-violet-400',
  IDLE: 'bg-red-500/15 text-red-400',
  PROBLEM: 'bg-red-500/15 text-red-400',
  AVAILABLE: 'bg-green-500/15 text-green-400',
};

export function ActiveDriversCard({ drivers }: { drivers: ActiveDriverRow[] }) {
  return (
    <div className="bg-background-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Active Drivers</h2>
        <Link href="/drivers" className="text-2xs text-brand-light hover:underline">View all</Link>
      </div>

      {drivers.length === 0 ? (
        <div className="p-6 text-center text-text-muted text-sm">No active drivers.</div>
      ) : (
        <div className="divide-y divide-border-subtle max-h-[360px] overflow-y-auto">
          {drivers.map((d) => (
            <div key={d.id} className="flex items-center justify-between px-4 py-3 hover:bg-background-hover transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                {d.avatar ? (
                  <img
                    src={d.avatar}
                    alt=""
                    className="h-8 w-8 flex-shrink-0 rounded-full border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border bg-background-hover text-2xs font-semibold text-text-secondary">
                    {d.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{d.name}</p>
                  <p className="text-2xs text-text-muted truncate">
                    {d.loadNumber ? `${d.loadNumber} · ` : ''}{d.route}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className={`badge ${STATUS_CLASS[d.status] ?? 'bg-gray-500/15 text-gray-400'}`}>
                  {STATUS_LABEL[d.status] ?? d.status}
                </span>
                <span className="text-2xs text-text-muted">{d.lastUpdate}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
