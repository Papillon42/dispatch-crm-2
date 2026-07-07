'use client';

import { useEffect, useState } from 'react';
import { X, Search, Truck, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/providers/ToastProvider';

interface DriverOption {
  id: string;
  fullName: string;
  status: 'AVAILABLE' | 'ON_LOAD' | 'OFF_DUTY' | 'INACTIVE';
  currentTruck: { id: string; truckNumber: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: 'bg-green-500/15 text-green-400',
  ON_LOAD: 'bg-blue-500/15 text-blue-400',
  OFF_DUTY: 'bg-gray-500/15 text-gray-400',
  INACTIVE: 'bg-red-500/15 text-red-400',
};

interface AssignDriverModalProps {
  loadId: string;
  clientId?: string | null;
  currentDriverId?: string | null;
  onClose: () => void;
  onAssigned: () => void;
}

export function AssignDriverModal({ loadId, clientId, currentDriverId, onClose, onAssigned }: AssignDriverModalProps) {
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(currentDriverId ?? null);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams({ limit: '100' });
    if (clientId) params.set('clientId', clientId);
    fetch(`/api/drivers?${params.toString()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => setDrivers(data.drivers ?? []))
      .catch(() => setDrivers([]))
      .finally(() => setLoading(false));
  }, [clientId]);

  const filtered = drivers.filter((d) => d.fullName.toLowerCase().includes(search.toLowerCase()));

  async function assign() {
    if (!selectedId) return;
    setSaving(true);
    try {
      const driver = drivers.find((d) => d.id === selectedId);
      const res = await fetch(`/api/loads/${loadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: selectedId, truckId: driver?.currentTruck?.id ?? null }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error ?? 'Не удалось назначить драйвера');
      showToast(`Драйвер ${driver?.fullName ?? ''} назначен на груз`, 'success');
      onAssigned();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Не удалось назначить драйвера', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-background-card shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <h2 className="text-base font-semibold text-text-primary">Assign Driver</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4 border-b border-border-subtle">
          <div className="relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search drivers…"
              className="w-full pl-9 pr-3 py-2 rounded-md bg-background-hover border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-background-hover rounded animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">No drivers found for this client.</p>
          ) : (
            <div className="p-2">
              {filtered.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-md text-left transition-colors',
                    selectedId === d.id ? 'bg-brand-muted border border-brand' : 'hover:bg-background-hover border border-transparent',
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{d.fullName}</p>
                    <p className="text-2xs text-text-muted flex items-center gap-1">
                      <Truck className="w-3 h-3" /> {d.currentTruck?.truckNumber ?? 'No truck'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={cn('badge', STATUS_STYLES[d.status])}>{d.status.replace('_', ' ')}</span>
                    {selectedId === d.id && <CheckCircle2 className="w-4 h-4 text-brand-light" />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border-subtle p-4">
          <button onClick={onClose} className="h-9 rounded-md border border-border bg-background-secondary px-4 text-sm text-text-secondary hover:bg-background-hover">
            Cancel
          </button>
          <button
            onClick={assign}
            disabled={!selectedId || saving}
            className="h-9 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {saving ? 'Assigning…' : 'Assign Driver'}
          </button>
        </div>
      </div>
    </div>
  );
}
