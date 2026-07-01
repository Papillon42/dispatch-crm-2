'use client';

import { useState } from 'react';
import { Navigation, Locate } from 'lucide-react';
import { usePolling } from '@/hooks/usePolling';
import { RouteMiniMap } from '@/components/modules/loads/RouteMiniMap';
import { cn } from '@/lib/utils';

const TABS = ['Route', 'Stops', 'Overview'] as const;

export function RouteScreen() {
  const { data } = usePolling<any>('/api/driver-app/current-load', { intervalMs: 10000 });
  const [tab, setTab] = useState<(typeof TABS)[number]>('Route');
  const load = data?.load;

  if (!load) {
    return <p className="p-6 text-center text-text-muted text-sm">No active route.</p>;
  }

  const inTransit = ['EN_ROUTE_TO_PICKUP', 'IN_TRANSIT'].includes(load.status);

  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium',
              tab === t ? 'bg-brand text-white' : 'bg-background-hover text-text-secondary',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <RouteMiniMap
        originLabel={`${load.pickupCity ?? '—'}`}
        destinationLabel={`${load.deliveryCity ?? '—'}`}
        miles={load.totalMiles}
        animate={inTransit}
      />

      <div className="bg-background-card border border-border rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Remaining</span>
          <span className="text-text-primary font-medium">{Math.round(load.totalMiles)} mi</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">ETA</span>
          <span className="text-text-primary font-medium">{load.deliveryAt ? new Date(load.deliveryAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Current Position</span>
          <span className="text-text-primary font-medium flex items-center gap-1"><Locate className="w-3.5 h-3.5" /> Live GPS pending</span>
        </div>
      </div>

      <button className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium">
        <Navigation className="w-4 h-4" /> Open in Maps
      </button>
    </div>
  );
}
