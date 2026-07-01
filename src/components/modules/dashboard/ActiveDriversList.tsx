import { DriverStatusBadge } from '@/components/ui/StatusBadge';
import { timeAgo } from '@/lib/utils';
import { Truck } from 'lucide-react';

interface DriverRow {
  id: string;
  fullName: string;
  status: 'AVAILABLE' | 'ON_LOAD' | 'OFF_DUTY' | 'INACTIVE';
  currentTruck?: { truckNumber: string } | null;
  locationUpdates: { label: string | null; at: string }[];
}

export function ActiveDriversList({ drivers }: { drivers: DriverRow[] }) {
  if (drivers.length === 0) {
    return (
      <div className="p-6 text-center text-text-muted text-sm">
        No active drivers right now.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border-subtle max-h-[360px] overflow-y-auto">
      {drivers.map((d) => {
        const lastUpdate = d.locationUpdates[0];
        return (
          <div key={d.id} className="flex items-center justify-between px-4 py-3 hover:bg-background-hover transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-background-hover flex items-center justify-center flex-shrink-0">
                <Truck className="w-4 h-4 text-text-secondary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{d.fullName}</p>
                <p className="text-2xs text-text-muted truncate">
                  {d.currentTruck?.truckNumber ?? 'No truck'}
                  {lastUpdate?.label ? ` · ${lastUpdate.label}` : ''}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <DriverStatusBadge status={d.status} />
              {lastUpdate && (
                <span className="text-2xs text-text-muted">{timeAgo(lastUpdate.at)}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
