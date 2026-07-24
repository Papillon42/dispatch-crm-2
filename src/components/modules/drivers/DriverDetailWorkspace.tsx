'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Clock,
  History,
  LocateFixed,
  MapPin,
  Navigation,
  Package,
  Pencil,
  Phone,
  RefreshCw,
  Route,
  Satellite,
  Truck as TruckIcon,
  UserRound,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { cn, formatDateTime, timeAgo } from '@/lib/utils';
import { DriverStatusBadge } from '@/components/ui/StatusBadge';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDriverStatuses } from '@/hooks/useDriverStatuses';
import { useRealtime } from '@/hooks/useRealtime';
import { useToast } from '@/components/providers/ToastProvider';
import { statusMeta } from '@/lib/driverStatus';
import { ChangeStatusModal, type DriverDetailForModal } from './ChangeStatusModal';
import { StatusHistoryTimeline } from './StatusHistoryTimeline';

interface DriverDetail extends DriverDetailForModal {
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  statusUpdatedAt: string | null;
  statusComment: string | null;
  statusReason: string | null;
  expectedReturnAt: string | null;
  currentLocationUpdatedAt: string | null;
  currentEta: string | null;
  homeBase: string | null;
  payPerMile: number | null;
  client: { id: string; companyName: string; mc: string | null; dot: string | null } | null;
  dispatcher: { id: string; fullName: string } | null;
  updater: { id: string; fullName: string } | null;
  statusUpdatedBy: { id: string; fullName: string } | null;
  currentTruck: { id: string; truckNumber: string; trailerType: string; maintenanceStatus: string } | null;
  currentTrailer: { id: string; trailerNumber: string | null; type: string; plate: string | null } | null;
  currentLoad: (DriverDetailForModal['currentLoad'] & {
    pickupLat: number | null; pickupLng: number | null; pickupAt: string | null;
    deliveryLat: number | null; deliveryLng: number | null; deliveryAt: string | null;
    estimatedArrivalAt: string | null; actualDepartureAt: string | null;
    actualDeliveryAt: string | null; loadedAt: string | null;
  }) | null;
  locationUpdates: Array<{ id: string; lat: number; lng: number; label: string | null; at: string }>;
  _count: { loads: number; issues: number; documents: number; statusHistory: number };
}

interface LocationEntry {
  id: string; lat: number; lng: number; label: string | null; speed: number | null;
  heading: number | null; source: string; eta: string | null; at: string;
}

type Tab = 'status' | 'history' | 'locations';

const GPS_STALE_MINUTES_DEFAULT = 30;

function routeText(load: DriverDetail['currentLoad'], kind: 'pickup' | 'delivery'): string {
  if (!load) return '—';
  if (kind === 'pickup') {
    return load.pickupAddress ?? ([load.pickupCity, load.pickupState].filter(Boolean).join(', ') || '—');
  }
  return load.deliveryAddress ?? ([load.deliveryCity, load.deliveryState].filter(Boolean).join(', ') || '—');
}

export function DriverDetailWorkspace({ driverId }: { driverId: string }) {
  const [driver, setDriver] = useState<DriverDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('status');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [locations, setLocations] = useState<LocationEntry[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const { statuses } = useDriverStatuses();
  const { showToast } = useToast();
  const { user: currentUser } = useCurrentUser();
  const canEditPay = currentUser?.role != null && ['OWNER', 'ADMIN'].includes(currentUser.role);
  const [payDraft, setPayDraft] = useState<string | null>(null);

  async function savePayPerMile() {
    if (payDraft === null || !driver) return;
    const value = payDraft.trim() === '' ? null : Number(payDraft);
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      showToast('Enter a valid pay rate', 'error');
      return;
    }
    try {
      const res = await fetch(`/api/drivers/${driver.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payPerMile: value }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error ?? 'Unable to save pay rate');
      showToast('Pay rate saved', 'success');
      setPayDraft(null);
      void loadDriver();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save pay rate', 'error');
    }
  }

  const loadDriver = useCallback(async () => {
    try {
      const res = await fetch(`/api/drivers/${driverId}`, { cache: 'no-store' });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error ?? 'Unable to load driver');
      setDriver(payload as DriverDetail);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load driver');
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    void loadDriver();
  }, [loadDriver]);

  // Realtime: refresh the card when this driver's status/location changes
  const { connectionState, lastEventAt } = useRealtime({
    onEvent: (message) => {
      if (message.driverId === driverId) {
        void loadDriver();
        setRefreshKey((k) => k + 1);
        if (message.event === 'driver.status.updated') {
          const p = message.payload as { newStatus?: string };
          if (p?.newStatus) showToast(`Status updated: ${statusMeta(p.newStatus, statuses).label}`, 'info');
        }
      }
    },
  });

  // Slow polling fallback (safety net when SSE is unavailable)
  useEffect(() => {
    const timer = setInterval(() => void loadDriver(), 60_000);
    return () => clearInterval(timer);
  }, [loadDriver]);

  useEffect(() => {
    if (tab !== 'locations') return;
    setLocationsLoading(true);
    fetch(`/api/drivers/${driverId}/location-history?limit=100`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((payload) => setLocations(payload.entries ?? []))
      .catch(() => setLocations([]))
      .finally(() => setLocationsLoading(false));
  }, [tab, driverId, refreshKey]);

  const gpsAgeMinutes = useMemo(() => {
    if (!driver?.currentLocationUpdatedAt) return null;
    return Math.floor((Date.now() - new Date(driver.currentLocationUpdatedAt).getTime()) / 60_000);
  }, [driver?.currentLocationUpdatedAt]);
  const gpsStale = gpsAgeMinutes !== null && gpsAgeMinutes > GPS_STALE_MINUTES_DEFAULT;

  const nextOperation = useMemo(() => {
    if (!driver) return null;
    const config = statuses.find((s) => s.code === driver.status);
    const nextCode = config?.allowedNext?.[0];
    return nextCode ? statusMeta(nextCode, statuses).label : null;
  }, [driver, statuses]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-64 rounded bg-background-hover animate-pulse" />
        <div className="h-48 rounded-lg bg-background-hover animate-pulse" />
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div className="p-6">
        <Link href="/drivers" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to drivers
        </Link>
        <div className="mt-4 flex items-center gap-2 rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          <AlertTriangle className="h-4 w-4" />
          <span>{error ?? 'Driver not found'}</span>
        </div>
      </div>
    );
  }

  const meta = statusMeta(driver.status, statuses);
  const statusRows: Array<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = [
    {
      icon: <Clock className="h-4 w-4 text-text-muted" />,
      label: 'Last Change',
      value: driver.statusUpdatedAt
        ? <>{formatDateTime(driver.statusUpdatedAt)} <span className="text-text-muted">({timeAgo(driver.statusUpdatedAt)})</span></>
        : '—',
    },
    {
      icon: <UserRound className="h-4 w-4 text-text-muted" />,
      label: 'Changed By',
      value: driver.statusUpdatedBy?.fullName ?? '—',
    },
    {
      icon: <Package className="h-4 w-4 text-text-muted" />,
      label: 'Current Load',
      value: driver.currentLoad
        ? <Link href={`/loads?load=${driver.currentLoad.id}`} className="text-brand-light hover:underline">{driver.currentLoad.loadCode}</Link>
        : 'No active load',
    },
    {
      icon: <TruckIcon className="h-4 w-4 text-text-muted" />,
      label: 'Truck',
      value: driver.currentTruck ? `${driver.currentTruck.truckNumber} (${driver.currentTruck.trailerType.replace(/_/g, ' ')})` : 'Not assigned',
    },
    {
      icon: <TruckIcon className="h-4 w-4 text-text-muted" />,
      label: 'Trailer',
      value: driver.currentTrailer
        ? [driver.currentTrailer.trailerNumber, driver.currentTrailer.type.replace(/_/g, ' ')].filter(Boolean).join(' · ')
        : 'Not assigned',
    },
    {
      icon: <MapPin className="h-4 w-4 text-text-muted" />,
      label: 'Origin',
      value: routeText(driver.currentLoad, 'pickup'),
    },
    {
      icon: <Navigation className="h-4 w-4 text-text-muted" />,
      label: 'Destination',
      value: routeText(driver.currentLoad, 'delivery'),
    },
    {
      icon: <LocateFixed className="h-4 w-4 text-text-muted" />,
      label: 'Current Location',
      value: driver.currentLat != null && driver.currentLng != null
        ? (
          <span className={cn(gpsStale && 'text-amber-300')}>
            {driver.currentLocationLabel ?? `${driver.currentLat.toFixed(3)}, ${driver.currentLng.toFixed(3)}`}
            {driver.currentLocationUpdatedAt && (
              <span className="text-text-muted"> · GPS {timeAgo(driver.currentLocationUpdatedAt)}</span>
            )}
            {gpsStale && <span className="text-amber-400"> · stale</span>}
          </span>
        )
        : 'No GPS data',
    },
    {
      icon: <CalendarClock className="h-4 w-4 text-text-muted" />,
      label: 'ETA',
      value: driver.currentEta ?? driver.currentLoad?.estimatedArrivalAt
        ? formatDateTime(driver.currentEta ?? driver.currentLoad?.estimatedArrivalAt ?? null)
        : '—',
    },
    {
      icon: <Route className="h-4 w-4 text-text-muted" />,
      label: 'Next Planned Operation',
      value: nextOperation ?? '—',
    },
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/drivers"
            className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-border bg-background-secondary text-text-secondary hover:text-text-primary hover:bg-background-hover transition-colors"
            aria-label="Back to drivers"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          {driver.avatarUrl ? (
            <img src={driver.avatarUrl} alt="" className="h-12 w-12 rounded-full border border-border object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background-hover text-sm font-semibold text-text-secondary">
              {driver.fullName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
              {driver.fullName}
              <DriverStatusBadge status={driver.status} configs={statuses} />
            </h1>
            <p className="text-sm text-text-secondary mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{driver.client?.companyName ?? 'No company'}</span>
              {driver.phone && (
                <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{driver.phone}</span>
              )}
              {driver.homeBase && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{driver.homeBase}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={cn(
            'inline-flex items-center gap-1.5 text-xs',
            connectionState === 'connected' ? 'text-success' : 'text-amber-400',
          )}>
            {connectionState === 'connected' ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {connectionState === 'connected' ? 'Live' : 'Reconnecting…'}
            {lastEventAt && <span className="text-text-muted">· {timeAgo(lastEventAt)}</span>}
          </span>
          <button
            type="button"
            onClick={() => { void loadDriver(); setRefreshKey((k) => k + 1); }}
            className="h-10 w-10 inline-flex items-center justify-center rounded-md border border-border bg-background-secondary text-text-secondary hover:text-text-primary hover:bg-background-hover transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="h-10 inline-flex items-center gap-2 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-dark transition-colors"
          >
            <Pencil className="h-4 w-4" />
            Change Status
          </button>
        </div>
      </div>

      {/* ── Current Driver Status block ── */}
      <div className="bg-background-card border border-border rounded-lg overflow-hidden">
        <div
          className="px-5 py-4 border-b border-border-subtle flex flex-wrap items-center justify-between gap-3"
          style={{ borderLeft: `3px solid ${meta.color}` }}
        >
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-text-primary">Current Driver Status</h2>
            <DriverStatusBadge status={driver.status} configs={statuses} />
            {driver.status === 'ON_LOAD' && (
              <span className="text-sm" style={{ color: meta.color }}>Driver is loaded and ready to depart</span>
            )}
          </div>
          {driver.statusComment && (
            <p className="text-sm text-text-secondary">“{driver.statusComment}”</p>
          )}
          {driver.statusReason && (
            <p className="text-sm text-amber-300/90">Reason: {driver.statusReason}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4 p-5">
          {statusRows.map((row) => (
            <div key={row.label} className="flex items-start gap-2.5">
              <span className="mt-0.5">{row.icon}</span>
              <div className="min-w-0">
                <p className="text-2xs uppercase tracking-wider text-text-muted">{row.label}</p>
                <p className="text-sm text-text-primary mt-0.5 break-words">{row.value}</p>
              </div>
            </div>
          ))}
        </div>

        {gpsStale && (
          <div className="mx-5 mb-4 flex items-center gap-2 rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
            <Satellite className="h-4 w-4 flex-shrink-0" />
            <span>GPS has not updated for {gpsAgeMinutes} minutes. The position on the map may be outdated.</span>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="bg-background-card border border-border rounded-lg overflow-hidden">
        <div className="flex border-b border-border-subtle">
          {([
            { key: 'status', label: 'Overview', icon: <Package className="h-4 w-4" /> },
            { key: 'history', label: `Status History (${driver._count.statusHistory})`, icon: <History className="h-4 w-4" /> },
            { key: 'locations', label: 'Location History', icon: <LocateFixed className="h-4 w-4" /> },
          ] as Array<{ key: Tab; label: string; icon: React.ReactNode }>).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-3 text-sm border-b-2 -mb-px transition-colors',
                tab === t.key
                  ? 'border-brand text-text-primary font-medium'
                  : 'border-transparent text-text-secondary hover:text-text-primary',
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'status' && (
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border-subtle">
            <div className="p-4">
              <p className="text-2xs uppercase tracking-wider text-text-muted">Total Loads</p>
              <p className="text-xl font-bold text-text-primary mt-1">{driver._count.loads}</p>
            </div>
            <div className="p-4">
              <p className="text-2xs uppercase tracking-wider text-text-muted">Issues</p>
              <p className="text-xl font-bold text-text-primary mt-1">{driver._count.issues}</p>
            </div>
            <div className="p-4">
              <p className="text-2xs uppercase tracking-wider text-text-muted">Dispatcher</p>
              <p className="text-sm font-medium text-text-primary mt-2">{driver.dispatcher?.fullName ?? '—'}</p>
            </div>
            <div className="p-4">
              <p className="text-2xs uppercase tracking-wider text-text-muted">Updater</p>
              <p className="text-sm font-medium text-text-primary mt-2">{driver.updater?.fullName ?? '—'}</p>
            </div>
            <div className="p-4 col-span-2 md:col-span-4 border-t border-border-subtle">
              <p className="text-2xs uppercase tracking-wider text-text-muted">Pay per mile (driver&apos;s personal rate)</p>
              {canEditPay ? (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={payDraft ?? (driver.payPerMile?.toString() ?? '')}
                    onChange={(e) => setPayDraft(e.target.value)}
                    placeholder="0.65"
                    className="h-9 w-28 rounded-md border border-border bg-background-secondary px-3 text-sm text-text-primary outline-none focus:border-border-focus"
                  />
                  <span className="text-xs text-text-muted">$/mi — used in the driver&apos;s My Finance screen</span>
                  {payDraft !== null && (
                    <button
                      type="button"
                      onClick={() => void savePayPerMile()}
                      className="h-9 rounded-md bg-brand px-3 text-xs font-medium text-white hover:bg-brand-dark"
                    >
                      Save
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm font-medium text-text-primary mt-2">
                  {driver.payPerMile != null ? `$${driver.payPerMile.toFixed(2)}/mi` : 'Not set'}
                </p>
              )}
            </div>
          </div>
        )}

        {tab === 'history' && (
          <StatusHistoryTimeline driverId={driverId} statuses={statuses} refreshKey={refreshKey} />
        )}

        {tab === 'locations' && (
          <div className="overflow-x-auto">
            {locationsLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-8 rounded bg-background-hover animate-pulse" />
                ))}
              </div>
            ) : locations.length === 0 ? (
              <div className="py-12 text-center">
                <Satellite className="h-8 w-8 text-text-muted mx-auto mb-3" />
                <p className="text-sm font-medium text-text-primary">No location updates yet</p>
                <p className="text-sm text-text-secondary mt-1">GPS pings and manual location updates will appear here.</p>
              </div>
            ) : (
              <table className="data-table w-full min-w-[720px]">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Location</th>
                    <th>Coordinates</th>
                    <th>Speed</th>
                    <th>Source</th>
                    <th>ETA</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((loc) => (
                    <tr key={loc.id}>
                      <td className="whitespace-nowrap">{formatDateTime(loc.at)}</td>
                      <td>{loc.label ?? '—'}</td>
                      <td className="text-xs text-text-secondary">{loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</td>
                      <td>{loc.speed != null ? `${Math.round(loc.speed)} mph` : '—'}</td>
                      <td><span className="badge bg-background-hover text-text-secondary">{loc.source}</span></td>
                      <td className="whitespace-nowrap">{loc.eta ? formatDateTime(loc.eta) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <ChangeStatusModal
          driver={driver}
          statuses={statuses}
          onClose={() => setIsModalOpen(false)}
          onChanged={() => {
            showToast('Driver status updated', 'success');
            void loadDriver();
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
