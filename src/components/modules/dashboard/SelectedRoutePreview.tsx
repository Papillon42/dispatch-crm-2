'use client';

import Link from 'next/link';
import { ArrowLeft, MapPin, User, Clock, DollarSign } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { MapRoute } from '@/lib/services/types';

const STATUS_LABEL: Record<string, string> = {
  IN_TRANSIT: 'In Transit',
  LOADING: 'Loading',
  UNLOADING: 'Unloading',
  WAITING: 'Waiting',
  IDLE: 'Idle',
  PROBLEM: 'Problem',
};

export function SelectedRoutePreview({ route, onClear }: { route: MapRoute | null; onClear: () => void }) {
  if (!route) {
    return (
      <div className="h-full flex items-center justify-center text-center px-6 py-8">
        <p className="text-sm text-text-muted">
          Select a route on the map to view load details.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={onClear}
          className="w-7 h-7 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-background-hover"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="badge bg-brand-muted text-brand-light">{STATUS_LABEL[route.status] ?? route.status}</span>
      </div>

      <div>
        <Link href={`/loads?search=${route.loadCode}`} className="text-sm font-semibold text-text-primary hover:text-brand-light">
          Load {route.loadCode}
        </Link>
      </div>

      <div className="space-y-2 text-xs text-text-secondary">
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
          {route.driverName}
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
          {route.pickup.city ?? '—'}{route.pickup.state ? `, ${route.pickup.state}` : ''}
          {' → '}
          {route.delivery.city ?? '—'}{route.delivery.state ? `, ${route.delivery.state}` : ''}
        </div>
        {route.etaLabel || route.eta ? (
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
            ETA: {route.etaLabel ?? formatDateTime(route.eta)}
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <DollarSign className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
          {formatCurrency(route.rate)}
        </div>
      </div>
    </div>
  );
}
