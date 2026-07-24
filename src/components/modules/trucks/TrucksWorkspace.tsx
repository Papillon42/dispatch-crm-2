'use client';

import { useEffect, useState } from 'react';
import {
  Search, RefreshCw, Plus, Truck as TruckIcon, X, ShieldAlert,
  Wrench, FileText, Gauge, Trash2,
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/components/providers/ToastProvider';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { KpiCard } from '@/components/ui/KpiCard';
import { LiveBadge } from '@/components/realtime/LiveBadge';
import { usePolling } from '@/hooks/usePolling';
import { cn, formatDate } from '@/lib/utils';

const MAINTENANCE_STYLES: Record<string, string> = {
  OK: 'bg-green-500/15 text-green-400',
  SCHEDULED: 'bg-blue-500/15 text-blue-400',
  IN_PROGRESS: 'bg-amber-500/15 text-amber-400',
  OVERDUE: 'bg-red-500/15 text-red-400',
};

function expiryTone(dateStr: string | null) {
  if (!dateStr) return 'text-text-muted';
  const days = Math.floor((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return 'text-danger font-medium';
  if (days <= 30) return 'text-warning font-medium';
  return 'text-text-primary';
}

export function TrucksWorkspace() {
  const [trucks, setTrucks] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { user } = useCurrentUser();
  const { showToast } = useToast();

  const { data: allTrucksForKpi, lastUpdatedAt } = usePolling<any>('/api/trucks?limit=100', { intervalMs: 15000 });

  const fetchTrucks = () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '50' });
    if (search) params.set('search', search);
    fetch(`/api/trucks?${params.toString()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        setTrucks(data.trucks ?? []);
        setTotal(data.total ?? 0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(fetchTrucks, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function deleteTruck() {
    if (!selected) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/trucks/${selected.id}`, { method: 'DELETE' });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error ?? 'Unable to delete truck');
      showToast(`Truck #${selected.truckNumber} deleted`, 'success');
      setShowDeleteConfirm(false);
      setSelected(null);
      fetchTrucks();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete truck', 'error');
    } finally {
      setDeleting(false);
    }
  }

  const canDelete = user?.role != null && ['OWNER', 'ADMIN'].includes(user.role);

  const allTrucks: any[] = allTrucksForKpi?.trucks ?? [];
  const activeCount = allTrucks.filter((t) => t.maintenanceStatus !== 'OVERDUE' && t.maintenanceStatus !== 'IN_PROGRESS').length;
  const maintenanceCount = allTrucks.filter((t) => t.maintenanceStatus === 'IN_PROGRESS' || t.maintenanceStatus === 'OVERDUE').length;
  const unassignedCount = allTrucks.filter((t) => !t.currentDriver).length;
  const expiringCount = allTrucks.filter((t) => {
    return [t.insuranceExp, t.registrationExp, t.iftaExp].some((d) => {
      if (!d) return false;
      const days = Math.floor((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return days <= 30;
    });
  }).length;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Trucks &amp; Trailers</h1>
          <p className="text-sm text-text-secondary mt-1">Fleet inventory, maintenance and document expiry</p>
        </div>
        <div className="flex items-center gap-3">
          <LiveBadge lastUpdatedAt={lastUpdatedAt} />
          <button className="flex items-center gap-2 px-4 py-2 rounded-md bg-brand hover:bg-brand-dark text-white text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add Truck
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Active Trucks" value={activeCount} icon={<TruckIcon className="w-4 h-4 text-emerald-400" />} iconColor="bg-emerald-500/15" />
        <KpiCard label="In Maintenance" value={maintenanceCount} icon={<Wrench className="w-4 h-4 text-amber-400" />} iconColor="bg-amber-500/15" />
        <KpiCard label="Unassigned" value={unassignedCount} icon={<Gauge className="w-4 h-4 text-cyan-400" />} iconColor="bg-cyan-500/15" />
        <KpiCard label="Docs Expiring ≤30d" value={expiringCount} icon={<ShieldAlert className="w-4 h-4 text-red-400" />} iconColor="bg-red-500/15" />
      </div>

      <div className="flex items-center gap-3 bg-background-card border border-border rounded-lg px-4 py-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by truck #, VIN, plate, client…"
            className="w-full pl-9 pr-3 py-2 rounded-md bg-background-hover border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
          />
        </div>
        <button onClick={() => setSearch('')} className="flex items-center gap-1.5 px-3 py-2 rounded-md text-text-secondary hover:text-text-primary text-sm">
          <RefreshCw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>

      <div className="flex gap-4 items-start">
        <div className="flex-1 bg-background-card border border-border rounded-lg overflow-hidden">
          <table className="w-full data-table">
            <thead>
              <tr className="border-b border-border-subtle">
                <th>Truck #</th>
                <th>Driver</th>
                <th>Trailer Type</th>
                <th>Client</th>
                <th>Maintenance</th>
                <th>Insurance Exp</th>
                <th>Registration Exp</th>
                <th>IFTA Exp</th>
                <th>ELD</th>
              </tr>
            </thead>
            <tbody>
              {loading && trucks.length === 0 && (
                <tr><td colSpan={9} className="text-center py-8 text-text-muted">Loading trucks…</td></tr>
              )}
              {!loading && trucks.length === 0 && (
                <tr><td colSpan={9} className="text-center py-8 text-text-muted">No trucks found.</td></tr>
              )}
              {trucks.map((truck) => (
                <tr key={truck.id} onClick={() => setSelected(truck)} className={cn('cursor-pointer', selected?.id === truck.id && 'bg-background-hover')}>
                  <td className="font-medium text-brand-light">#{truck.truckNumber}</td>
                  <td>{truck.currentDriver?.fullName ?? 'Unassigned'}</td>
                  <td>{truck.trailerType.replaceAll('_', ' ')}</td>
                  <td>{truck.client?.companyName ?? '—'}</td>
                  <td><span className={cn('badge', MAINTENANCE_STYLES[truck.maintenanceStatus])}>{truck.maintenanceStatus.replaceAll('_', ' ')}</span></td>
                  <td className={expiryTone(truck.insuranceExp)}>{formatDate(truck.insuranceExp)}</td>
                  <td className={expiryTone(truck.registrationExp)}>{formatDate(truck.registrationExp)}</td>
                  <td className={expiryTone(truck.iftaExp)}>{formatDate(truck.iftaExp)}</td>
                  <td>{truck.eldProvider ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-border-subtle text-sm text-text-secondary">
            Showing {trucks.length} of {total} trucks
          </div>
        </div>

        {selected && (
          <div className="right-panel">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
              <h2 className="text-sm font-semibold text-text-primary">Truck #{selected.truckNumber}</h2>
              <div className="flex items-center gap-1">
                {canDelete && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-text-muted hover:text-danger"
                    title="Delete truck"
                    aria-label="Delete truck"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => setSelected(null)} className="text-text-muted hover:text-text-primary">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-y-3 gap-x-3 text-sm">
                <Field label="VIN" value={selected.vin ?? '—'} />
                <Field label="Plate" value={selected.plate ? `${selected.plate} (${selected.plateState ?? ''})` : '—'} />
                <Field label="Trailer Type" value={selected.trailerType?.replaceAll('_', ' ')} />
                <Field label="ELD Provider" value={selected.eldProvider ?? '—'} />
                <Field label="Client" value={selected.client?.companyName ?? '—'} />
                <Field label="Current Driver" value={selected.currentDriver?.fullName ?? 'Unassigned'} />
                <Field label="Make / Model" value={[selected.make, selected.model].filter(Boolean).join(' ') || '—'} />
                <Field label="Year" value={selected.year ?? '—'} />
              </div>

              <div>
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Maintenance &amp; Documents</h3>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between px-2.5 py-2 rounded-md bg-background-hover">
                    <span className="text-text-secondary">Insurance</span>
                    <span className={expiryTone(selected.insuranceExp)}>{formatDate(selected.insuranceExp)}</span>
                  </div>
                  <div className="flex justify-between px-2.5 py-2 rounded-md bg-background-hover">
                    <span className="text-text-secondary">Registration</span>
                    <span className={expiryTone(selected.registrationExp)}>{formatDate(selected.registrationExp)}</span>
                  </div>
                  <div className="flex justify-between px-2.5 py-2 rounded-md bg-background-hover">
                    <span className="text-text-secondary">IFTA</span>
                    <span className={expiryTone(selected.iftaExp)}>{formatDate(selected.iftaExp)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showDeleteConfirm && selected && (
        <ConfirmDialog
          title="Delete truck"
          message={`Delete truck #${selected.truckNumber}? It will be removed from active lists; historical loads and documents are kept.`}
          busy={deleting}
          onConfirm={deleteTruck}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-2xs text-text-muted">{label}</p>
      <p className="text-text-primary truncate">{value}</p>
    </div>
  );
}
