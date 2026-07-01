'use client';

import { MapPin, Phone, Calendar, Package, DollarSign, ChevronRight } from 'lucide-react';
import { usePolling } from '@/hooks/usePolling';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { LoadStatusBadge } from '@/components/ui/StatusBadge';
import Link from 'next/link';

export function CurrentLoadScreen() {
  const { data, loading } = usePolling<any>('/api/driver-app/current-load', { intervalMs: 10000 });
  const load = data?.load;

  if (loading) {
    return <div className="p-4 space-y-3">
      <div className="h-32 bg-background-hover rounded-lg animate-pulse" />
      <div className="h-40 bg-background-hover rounded-lg animate-pulse" />
    </div>;
  }

  if (!load) {
    return (
      <div className="p-6 text-center text-text-muted">
        <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">No active load assigned right now.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="bg-background-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-text-primary">#{load.loadCode}</span>
          <LoadStatusBadge status={load.status} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Field label="Reference / PO" value={load.referenceNumber ?? load.poNumber ?? '—'} />
          <Field label="Trailer" value={load.truck?.truckNumber ?? '—'} />
          <Field label="Type / Weight" value={`${load.equipmentType?.replaceAll('_', ' ')} · ${load.weight ?? '—'} lbs`} />
          <Field label="Client" value={load.client?.companyName ?? '—'} />
        </div>
      </div>

      <div className="bg-background-card border border-border rounded-lg overflow-hidden">
        <StopRow icon={<MapPin className="w-4 h-4 text-brand-light" />} label="Pickup" when={load.pickupAt} address={load.pickupAddress} city={load.pickupCity} state={load.pickupState} />
        <div className="border-t border-border-subtle" />
        <StopRow icon={<MapPin className="w-4 h-4 text-emerald-400" />} label="Delivery" when={load.deliveryAt} address={load.deliveryAddress} city={load.deliveryCity} state={load.deliveryState} />
      </div>

      <div className="bg-background-card border border-border rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-success" />
          <span className="text-sm text-text-secondary">Payment</span>
        </div>
        <span className="text-lg font-bold text-text-primary">{formatCurrency(load.rate)}</span>
      </div>

      <Link href="/driver-app/trip" className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium">
        Load Details <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background-hover rounded-md px-2.5 py-2">
      <p className="text-2xs text-text-muted">{label}</p>
      <p className="text-text-primary font-medium truncate">{value}</p>
    </div>
  );
}

function StopRow({ icon, label, when, address, city, state }: any) {
  return (
    <div className="flex items-start gap-3 p-4">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-2xs text-text-muted mb-0.5">
          {label} <Calendar className="w-3 h-3" /> {formatDateTime(when)}
        </div>
        <p className="text-sm text-text-primary">{city}, {state}</p>
        <p className="text-xs text-text-secondary truncate">{address}</p>
      </div>
      <button className="w-8 h-8 rounded-full bg-background-hover flex items-center justify-center flex-shrink-0">
        <Phone className="w-3.5 h-3.5 text-text-secondary" />
      </button>
    </div>
  );
}
