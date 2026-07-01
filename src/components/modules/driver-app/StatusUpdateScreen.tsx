'use client';

import { useState } from 'react';
import { Truck, PackageCheck, PackageOpen, MapPin, CheckCircle2, AlertTriangle } from 'lucide-react';
import { usePolling } from '@/hooks/usePolling';

const STATUS_BUTTONS = [
  { status: 'EN_ROUTE_TO_PICKUP', label: 'En Route to Pickup', sub: "I'm on my way to pickup", icon: Truck, color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  { status: 'AT_PICKUP', label: 'At Pickup', sub: 'Arrived at pickup location', icon: PackageOpen, color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  { status: 'LOADED', label: 'Loaded', sub: 'Load is loaded', icon: PackageCheck, color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  { status: 'IN_TRANSIT', label: 'In Transit', sub: 'On the way to delivery', icon: Truck, color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  { status: 'AT_DELIVERY', label: 'At Delivery', sub: 'Arrived at delivery location', icon: MapPin, color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  { status: 'DELIVERED', label: 'Delivered', sub: 'Load delivered', icon: CheckCircle2, color: 'bg-green-500/15 text-green-400 border-green-500/30' },
  { status: 'PROBLEM', label: 'Problem', sub: 'Something went wrong', icon: AlertTriangle, color: 'bg-red-500/15 text-red-400 border-red-500/30' },
];

export function StatusUpdateScreen() {
  const { data, refresh } = usePolling<any>('/api/driver-app/current-load', { intervalMs: 10000 });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const load = data?.load;

  async function updateStatus(status: string) {
    if (!load) return;
    setBusy(status);
    setMessage(null);
    try {
      const res = await fetch('/api/driver-app/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loadId: load.id, status }),
      });
      if (res.ok) {
        setMessage('Status updated!');
        refresh();
      } else {
        const err = await res.json();
        setMessage(err.error ?? 'Could not update status');
      }
    } finally {
      setBusy(null);
    }
  }

  if (!load) {
    return <p className="p-6 text-center text-text-muted text-sm">No active load to update.</p>;
  }

  return (
    <div className="p-4 space-y-3">
      <div className="bg-background-card border border-border rounded-lg px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-text-secondary">#{load.loadCode}</span>
        <span className="text-xs text-text-muted">Current: {load.status.replaceAll('_', ' ')}</span>
      </div>
      {message && <p className="text-xs text-center text-brand-light">{message}</p>}
      {STATUS_BUTTONS.map(({ status, label, sub, icon: Icon, color }) => (
        <button
          key={status}
          disabled={busy !== null}
          onClick={() => updateStatus(status)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border ${color} disabled:opacity-50 transition-opacity`}
        >
          <Icon className="w-5 h-5 flex-shrink-0" />
          <div className="text-left">
            <p className="text-sm font-medium">{label}</p>
            <p className="text-2xs opacity-80">{sub}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
