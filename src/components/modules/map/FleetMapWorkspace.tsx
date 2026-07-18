'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CalendarClock,
  Clock,
  Filter,
  LocateFixed,
  Navigation,
  Package,
  RefreshCw,
  Satellite,
  Search,
  Truck,
  UserRound,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { cn, formatDateTime, formatNumber, timeAgo } from '@/lib/utils';
import { DriverStatusBadge } from '@/components/ui/StatusBadge';
import { useRealtime } from '@/hooks/useRealtime';
import { haversineMiles, statusMeta } from '@/lib/driverStatus';
import type { DriverStatusConfigRow } from '@/hooks/useDriverStatuses';
import { OpenLayersUsaMap, type OpenLayersMarker, type OpenLayersRouteArc } from './OpenLayersUsaMap';

type DriverMapRow = {
  id: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  status: string;
  statusUpdatedAt: string | null;
  statusComment: string | null;
  currentLat: number | null;
  currentLng: number | null;
  currentLocationLabel: string | null;
  currentLocationUpdatedAt: string | null;
  currentEta: string | null;
  client: { id: string; companyName: string; mc: string | null; dot: string | null } | null;
  dispatcher: { id: string; fullName: string } | null;
  updater: { id: string; fullName: string } | null;
  statusUpdatedBy: { id: string; fullName: string } | null;
  currentTruck: { id: string; truckNumber: string; trailerType: string } | null;
  currentTrailer: { id: string; trailerNumber: string | null; type: string } | null;
  currentLoad: {
    id: string; loadCode: string; status: string;
    pickupAddress: string | null; pickupCity: string | null; pickupState: string | null;
    pickupLat: number | null; pickupLng: number | null;
    deliveryAddress: string | null; deliveryCity: string | null; deliveryState: string | null;
    deliveryLat: number | null; deliveryLng: number | null;
    estimatedArrivalAt: string | null; actualDepartureAt: string | null; loadedAt: string | null;
    totalMiles: number | null;
  } | null;
  locationUpdates: Array<{ lat: number; lng: number; label: string | null; at: string; eta: string | null; etaLabel: string | null }>;
  loads: Array<{ id: string; loadCode: string; status: string }>;
};

type DriversResponse = {
  drivers: DriverMapRow[];
  statuses: DriverStatusConfigRow[];
  gpsStaleMinutes: number;
};

type QuickFilter = 'ALL' | 'WITH_LOAD' | 'NO_LOAD' | 'STALE_GPS' | 'OVERDUE_ETA';

function positionOf(driver: DriverMapRow): { lat: number; lng: number; at: string | null; label: string | null } | null {
  if (driver.currentLat != null && driver.currentLng != null) {
    return {
      lat: driver.currentLat,
      lng: driver.currentLng,
      at: driver.currentLocationUpdatedAt,
      label: driver.currentLocationLabel,
    };
  }
  const fallback = driver.locationUpdates[0];
  if (fallback) return { lat: fallback.lat, lng: fallback.lng, at: fallback.at, label: fallback.label };
  return null;
}

function place(load: DriverMapRow['currentLoad'], kind: 'pickup' | 'delivery'): string {
  if (!load) return '—';
  const addr = kind === 'pickup' ? load.pickupAddress : load.deliveryAddress;
  const city = kind === 'pickup' ? [load.pickupCity, load.pickupState] : [load.deliveryCity, load.deliveryState];
  return addr ?? (city.filter(Boolean).join(', ') || '—');
}

export function FleetMapWorkspace() {
  const [drivers, setDrivers] = useState<DriverMapRow[]>([]);
  const [statusConfigs, setStatusConfigs] = useState<DriverStatusConfigRow[]>([]);
  const [gpsStaleMinutes, setGpsStaleMinutes] = useState(30);
  const [statusFilter, setStatusFilter] = useState<'ALL' | string>('ALL');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('ALL');
  const [dispatcherFilter, setDispatcherFilter] = useState<'ALL' | string>('ALL');
  const [companyFilter, setCompanyFilter] = useState<'ALL' | string>('ALL');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadDrivers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (quickFilter === 'WITH_LOAD') params.set('hasLoad', '1');
      if (quickFilter === 'NO_LOAD') params.set('hasLoad', '0');
      if (quickFilter === 'STALE_GPS') params.set('staleGps', '1');
      if (quickFilter === 'OVERDUE_ETA') params.set('overdueEta', '1');
      if (dispatcherFilter !== 'ALL') params.set('dispatcherId', dispatcherFilter);
      if (companyFilter !== 'ALL') params.set('clientId', companyFilter);

      const res = await fetch(`/api/map/drivers?${params.toString()}`, { cache: 'no-store' });
      const payload = await res.json().catch(() => null);

      if (!res.ok) throw new Error(payload?.error ?? 'Unable to load fleet map');
      const data = payload as DriversResponse;
      setDrivers(data.drivers);
      setStatusConfigs(data.statuses);
      setGpsStaleMinutes(data.gpsStaleMinutes);
      setLastLoadedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load fleet map');
      if (!silent) setDrivers([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, quickFilter, dispatcherFilter, companyFilter]);

  useEffect(() => {
    void loadDrivers();
  }, [loadDrivers]);

  // Realtime: debounce-refresh on driver status/location events (no page reload)
  const { connectionState, lastEventAt } = useRealtime({
    onEvent: () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      reloadTimer.current = setTimeout(() => void loadDrivers(true), 400);
    },
  });

  // Polling fallback (SSE down / multi-instance deployments)
  useEffect(() => {
    const timer = setInterval(() => void loadDrivers(true), connectionState === 'connected' ? 60_000 : 15_000);
    return () => clearInterval(timer);
  }, [loadDrivers, connectionState]);

  const dispatchers = useMemo(() => {
    const map = new Map<string, string>();
    drivers.forEach((d) => { if (d.dispatcher) map.set(d.dispatcher.id, d.dispatcher.fullName); });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [drivers]);

  const companies = useMemo(() => {
    const map = new Map<string, string>();
    drivers.forEach((d) => { if (d.client) map.set(d.client.id, d.client.companyName); });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [drivers]);

  const visibleDrivers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return drivers;
    return drivers.filter((driver) => {
      const haystack = [
        driver.fullName,
        driver.phone,
        driver.client?.companyName,
        driver.client?.mc,
        driver.client?.dot,
        driver.currentTruck?.truckNumber,
        driver.currentTrailer?.trailerNumber,
        driver.currentLoad?.loadCode,
        positionOf(driver)?.label,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [drivers, search]);

  const mappedDrivers = visibleDrivers.filter((driver) => positionOf(driver));
  const selectedDriver = visibleDrivers.find((driver) => driver.id === selectedId) ?? null;
  const selectedPosition = selectedDriver ? positionOf(selectedDriver) : null;

  const mapMarkers: OpenLayersMarker[] = mappedDrivers.map((driver) => {
    const location = positionOf(driver)!;
    const meta = statusMeta(driver.status, statusConfigs);
    return {
      id: driver.id,
      label: driver.fullName,
      subtitle: location.label,
      lat: location.lat,
      lng: location.lng,
      status: driver.status,
      color: meta.color,
      avatarUrl: driver.avatarUrl,
    };
  });

  // Route line pickup -> delivery for the selected driver's active load
  const mapRoutes: OpenLayersRouteArc[] = useMemo(() => {
    if (!selectedDriver?.currentLoad) return [];
    const load = selectedDriver.currentLoad;
    if (load.pickupLat == null || load.pickupLng == null || load.deliveryLat == null || load.deliveryLng == null) return [];
    return [{
      id: selectedDriver.id,
      from: { lat: load.pickupLat, lng: load.pickupLng },
      to: { lat: load.deliveryLat, lng: load.deliveryLng },
      status: selectedDriver.status,
      color: statusMeta(selectedDriver.status, statusConfigs).color,
    }];
  }, [selectedDriver, statusConfigs]);

  const remainingMiles = useMemo(() => {
    if (!selectedDriver?.currentLoad || !selectedPosition) return null;
    const load = selectedDriver.currentLoad;
    if (load.deliveryLat == null || load.deliveryLng == null) return null;
    return Math.round(haversineMiles(
      { lat: selectedPosition.lat, lng: selectedPosition.lng },
      { lat: load.deliveryLat, lng: load.deliveryLng },
    ));
  }, [selectedDriver, selectedPosition]);

  const isGpsStale = useCallback((driver: DriverMapRow) => {
    const pos = positionOf(driver);
    if (!pos?.at) return true;
    return Date.now() - new Date(pos.at).getTime() > gpsStaleMinutes * 60_000;
  }, [gpsStaleMinutes]);

  const selectedPopup = selectedDriver && selectedPosition
    ? {
      title: `${selectedDriver.fullName} · ${statusMeta(selectedDriver.status, statusConfigs).label}`,
      rows: [
        `Truck: ${selectedDriver.currentTruck?.truckNumber ?? '—'} · Trailer: ${selectedDriver.currentTrailer?.trailerNumber ?? '—'}`,
        selectedDriver.currentLoad ? `Load: ${selectedDriver.currentLoad.loadCode}` : 'No active load',
        selectedDriver.currentLoad ? `${place(selectedDriver.currentLoad, 'pickup')} → ${place(selectedDriver.currentLoad, 'delivery')}` : '',
        selectedPosition.label ? `Now: ${selectedPosition.label}` : '',
        remainingMiles != null ? `Distance remaining: ${formatNumber(remainingMiles)} mi` : '',
        selectedDriver.currentEta ?? selectedDriver.currentLoad?.estimatedArrivalAt
          ? `ETA: ${formatDateTime(selectedDriver.currentEta ?? selectedDriver.currentLoad?.estimatedArrivalAt ?? null)}`
          : '',
        selectedPosition.at ? `Last GPS: ${timeAgo(selectedPosition.at)}` : 'No GPS data',
      ].filter(Boolean),
    }
    : null;

  const QUICK_FILTERS: Array<{ value: QuickFilter; label: string }> = [
    { value: 'ALL', label: 'All drivers' },
    { value: 'WITH_LOAD', label: 'With load' },
    { value: 'NO_LOAD', label: 'Without load' },
    { value: 'OVERDUE_ETA', label: 'Overdue ETA' },
    { value: 'STALE_GPS', label: 'Stale GPS' },
  ];

  return (
    <div className="h-full min-h-screen flex flex-col bg-background">
      <div className="px-6 py-5 border-b border-border-subtle flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Fleet Map</h1>
          <p className="text-sm text-text-secondary mt-1 flex items-center gap-3">
            <span>{formatNumber(mappedDrivers.length)} mapped · {formatNumber(visibleDrivers.length)} visible</span>
            <span className={cn(
              'inline-flex items-center gap-1.5 text-xs',
              connectionState === 'connected' ? 'text-success' : 'text-amber-400',
            )}>
              {connectionState === 'connected' ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {connectionState === 'connected' ? 'Realtime connected' : 'Realtime reconnecting — polling fallback'}
            </span>
            {lastLoadedAt && <span className="text-xs text-text-muted">updated {timeAgo(lastLoadedAt)}</span>}
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative w-full lg:w-[360px]">
            <Search className="h-4 w-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Driver, phone, truck, trailer, load, MC, DOT, company"
              className="h-10 w-full rounded-md border border-border bg-background-secondary pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-border-focus"
            />
          </div>
          <button
            type="button"
            onClick={() => void loadDrivers()}
            className="h-10 w-10 inline-flex items-center justify-center rounded-md border border-border bg-background-secondary text-text-secondary hover:text-text-primary hover:bg-background-hover transition-colors"
            aria-label="Refresh fleet map"
            title="Refresh"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      <div className="px-6 py-3 border-b border-border-subtle flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={cn(
            'h-9 rounded-md border px-3 text-sm transition-colors',
            statusFilter === 'ALL'
              ? 'border-brand bg-brand-muted text-brand-light'
              : 'border-border bg-background-secondary text-text-secondary hover:text-text-primary hover:bg-background-hover',
          )}
        >
          All statuses
        </button>
        {statusConfigs.map((config) => (
          <button
            key={config.code}
            type="button"
            onClick={() => setStatusFilter(config.code)}
            className={cn(
              'h-9 rounded-md border px-3 text-sm transition-colors inline-flex items-center gap-2',
              statusFilter === config.code
                ? 'border-brand bg-brand-muted text-brand-light'
                : 'border-border bg-background-secondary text-text-secondary hover:text-text-primary hover:bg-background-hover',
            )}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: config.color }} />
            {config.label}
          </button>
        ))}
      </div>

      <div className="px-6 py-3 border-b border-border-subtle flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-text-muted" />
        {QUICK_FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setQuickFilter(option.value)}
            className={cn(
              'h-8 rounded-md border px-2.5 text-xs transition-colors',
              quickFilter === option.value
                ? 'border-brand bg-brand-muted text-brand-light'
                : 'border-border bg-background-secondary text-text-secondary hover:text-text-primary hover:bg-background-hover',
            )}
          >
            {option.label}
          </button>
        ))}
        <select
          value={dispatcherFilter}
          onChange={(e) => setDispatcherFilter(e.target.value)}
          className="h-8 rounded-md border border-border bg-background-secondary px-2 text-xs text-text-secondary outline-none"
        >
          <option value="ALL">All dispatchers</option>
          {dispatchers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="h-8 rounded-md border border-border bg-background-secondary px-2 text-xs text-text-secondary outline-none"
        >
          <option value="ALL">All companies</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {error && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid flex-1 min-h-[680px] grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="relative min-h-[520px]">
          <OpenLayersUsaMap
            markers={mapMarkers}
            routes={mapRoutes}
            selectedId={selectedDriver?.id}
            onSelect={setSelectedId}
            loading={loading}
            popup={selectedPopup}
            emptyLabel="No drivers have GPS positions yet. Add a location update and markers will appear here."
            className="min-h-[520px]"
          />
        </div>

        <aside className="border-t xl:border-t-0 xl:border-l border-border-subtle bg-background-secondary overflow-y-auto">
          <div className="grid grid-cols-3 border-b border-border-subtle">
            <div className="p-4">
              <p className="text-2xs uppercase tracking-wider text-text-muted">Mapped</p>
              <p className="text-xl font-bold text-text-primary mt-1">{mappedDrivers.length}</p>
            </div>
            <div className="p-4 border-l border-border-subtle">
              <p className="text-2xs uppercase tracking-wider text-text-muted">In Transit</p>
              <p className="text-xl font-bold text-text-primary mt-1">
                {visibleDrivers.filter((driver) => driver.status === 'IN_TRANSIT').length}
              </p>
            </div>
            <div className="p-4 border-l border-border-subtle">
              <p className="text-2xs uppercase tracking-wider text-text-muted">Stale GPS</p>
              <p className="text-xl font-bold text-text-primary mt-1">
                {visibleDrivers.filter((driver) => isGpsStale(driver)).length}
              </p>
            </div>
          </div>

          {selectedDriver && (
            <div className="p-4 border-b border-border-subtle">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/drivers/${selectedDriver.id}`} className="text-base font-semibold text-text-primary hover:text-brand-light transition-colors">
                    {selectedDriver.fullName}
                  </Link>
                  <p className="text-sm text-text-secondary mt-1">{selectedDriver.client?.companyName ?? 'No company'}</p>
                </div>
                <DriverStatusBadge status={selectedDriver.status} configs={statusConfigs} />
              </div>

              <div className="mt-4 space-y-2.5 text-sm">
                <div className="flex items-center gap-2 text-text-secondary">
                  <Truck className="h-4 w-4 text-text-muted flex-shrink-0" />
                  <span>
                    {selectedDriver.currentTruck?.truckNumber ?? 'No truck'}
                    {selectedDriver.currentTrailer?.trailerNumber && ` · TL ${selectedDriver.currentTrailer.trailerNumber}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-text-secondary">
                  <Package className="h-4 w-4 text-text-muted flex-shrink-0" />
                  <span>{selectedDriver.currentLoad?.loadCode ?? 'No active load'}</span>
                </div>
                <div className="flex items-center gap-2 text-text-secondary">
                  <Navigation className="h-4 w-4 text-text-muted flex-shrink-0" />
                  <span className="truncate">
                    {selectedDriver.currentLoad
                      ? `${place(selectedDriver.currentLoad, 'pickup')} → ${place(selectedDriver.currentLoad, 'delivery')}`
                      : 'No route'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-text-secondary">
                  <LocateFixed className="h-4 w-4 text-text-muted flex-shrink-0" />
                  <span>{selectedPosition?.label ?? (selectedPosition ? `${selectedPosition.lat.toFixed(3)}, ${selectedPosition.lng.toFixed(3)}` : 'No GPS')}</span>
                </div>
                {remainingMiles != null && (
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Navigation className="h-4 w-4 text-text-muted flex-shrink-0" />
                    <span>Distance remaining: {formatNumber(remainingMiles)} mi</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-text-secondary">
                  <CalendarClock className="h-4 w-4 text-text-muted flex-shrink-0" />
                  <span>
                    ETA: {formatDateTime(selectedDriver.currentEta ?? selectedDriver.currentLoad?.estimatedArrivalAt ?? null)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-text-secondary">
                  <Clock className="h-4 w-4 text-text-muted flex-shrink-0" />
                  <span className={cn(isGpsStale(selectedDriver) && 'text-amber-300')}>
                    Last GPS: {selectedPosition?.at ? timeAgo(selectedPosition.at) : 'never'}
                    {isGpsStale(selectedDriver) && ' · stale'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-text-secondary">
                  <UserRound className="h-4 w-4 text-text-muted flex-shrink-0" />
                  <span>{selectedDriver.dispatcher?.fullName ?? 'No dispatcher'}</span>
                </div>
              </div>
            </div>
          )}

          <div className="divide-y divide-border-subtle">
            {visibleDrivers.map((driver) => {
              const location = positionOf(driver);
              const meta = statusMeta(driver.status, statusConfigs);

              return (
                <button
                  key={driver.id}
                  type="button"
                  onClick={() => setSelectedId(driver.id)}
                  className={cn(
                    'w-full text-left p-4 hover:bg-background-hover transition-colors',
                    selectedDriver?.id === driver.id && 'bg-background-hover',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary truncate">{driver.fullName}</p>
                      <p className="text-xs text-text-muted mt-1 truncate">
                        {driver.currentTruck?.truckNumber ?? 'No truck'} · {driver.client?.companyName ?? 'No company'}
                      </p>
                    </div>
                    <span
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0 mt-1.5"
                      style={{ backgroundColor: meta.color }}
                      title={meta.label}
                    />
                  </div>
                  <p className="text-xs text-text-secondary mt-2 truncate">
                    {driver.currentLoad
                      ? `${driver.currentLoad.loadCode} · ${place(driver.currentLoad, 'pickup')} → ${place(driver.currentLoad, 'delivery')}`
                      : 'No active load'}
                  </p>
                  <p className={cn('text-xs mt-1 truncate', isGpsStale(driver) ? 'text-amber-300' : 'text-text-muted')}>
                    {location
                      ? `${location.label ?? `${location.lat.toFixed(2)}, ${location.lng.toFixed(2)}`}${location.at ? ` · ${timeAgo(location.at)}` : ''}`
                      : 'No GPS data'}
                    {isGpsStale(driver) && location && ' · stale'}
                  </p>
                </button>
              );
            })}

            {!loading && visibleDrivers.length === 0 && (
              <div className="p-8 text-center">
                <Satellite className="h-8 w-8 mx-auto text-text-muted mb-3" />
                <p className="text-sm font-medium text-text-primary">No drivers found</p>
                <p className="text-sm text-text-secondary mt-1">Adjust the filters or add location updates.</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
