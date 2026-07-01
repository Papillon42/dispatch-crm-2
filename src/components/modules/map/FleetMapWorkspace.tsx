'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  LocateFixed,
  Navigation,
  RefreshCw,
  Search,
  Truck,
  UserRound,
} from 'lucide-react';
import { cn, formatDateTime, formatNumber } from '@/lib/utils';
import { OpenLayersUsaMap, type OpenLayersMarker } from './OpenLayersUsaMap';

type DriverStatus = 'AVAILABLE' | 'ON_LOAD' | 'OFF_DUTY' | 'INACTIVE';

type DriverMapRow = {
  id: string;
  fullName: string;
  phone: string | null;
  status: DriverStatus;
  client: { id: string; companyName: string } | null;
  currentTruck: { truckNumber: string; trailerType: string } | null;
  dispatcher: { id: string; fullName: string } | null;
  updater: { id: string; fullName: string } | null;
  locationUpdates: Array<{
    id: string;
    lat: number;
    lng: number;
    label: string | null;
    eta: string | null;
    etaLabel: string | null;
    at: string;
  }>;
  loads: Array<{
    id: string;
    loadCode: string;
    status: string;
    pickupCity: string | null;
    pickupState: string | null;
    deliveryCity: string | null;
    deliveryState: string | null;
    issues: Array<{ id: string; type: string }>;
  }>;
};

type DriversResponse = {
  drivers: DriverMapRow[];
};

const STATUS_OPTIONS: Array<{ value: 'ALL' | DriverStatus; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'ON_LOAD', label: 'On Load' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'OFF_DUTY', label: 'Off Duty' },
  { value: 'INACTIVE', label: 'Inactive' },
];

function latestLocation(driver: DriverMapRow) {
  return driver.locationUpdates[0] ?? null;
}

function routeLabel(load: DriverMapRow['loads'][number] | undefined) {
  if (!load) return 'No active load';
  const pickup = [load.pickupCity, load.pickupState].filter(Boolean).join(', ') || 'Pickup TBD';
  const delivery = [load.deliveryCity, load.deliveryState].filter(Boolean).join(', ') || 'Delivery TBD';
  return `${pickup} -> ${delivery}`;
}

export function FleetMapWorkspace() {
  const [drivers, setDrivers] = useState<DriverMapRow[]>([]);
  const [status, setStatus] = useState<'ALL' | DriverStatus>('ALL');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (status !== 'ALL') params.set('status', status);

      const res = await fetch(`/api/map/drivers?${params.toString()}`, { cache: 'no-store' });
      const payload = await res.json().catch(() => null);

      if (!res.ok) throw new Error(payload?.error ?? 'Unable to load fleet map');
      setDrivers((payload as DriversResponse).drivers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load fleet map');
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void loadDrivers();
  }, [loadDrivers]);

  const visibleDrivers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return drivers.filter((driver) => {
      const load = driver.loads[0];
      const haystack = [
        driver.fullName,
        driver.phone,
        driver.client?.companyName,
        driver.currentTruck?.truckNumber,
        latestLocation(driver)?.label,
        load?.loadCode,
        routeLabel(load),
      ].filter(Boolean).join(' ').toLowerCase();

      return !term || haystack.includes(term);
    });
  }, [drivers, search]);

  const mappedDrivers = visibleDrivers.filter((driver) => latestLocation(driver));
  const selectedDriver = visibleDrivers.find((driver) => driver.id === selectedId) ?? mappedDrivers[0] ?? null;
  const selectedLocation = selectedDriver ? latestLocation(selectedDriver) : null;
  const activeIssues = visibleDrivers.reduce((sum, driver) => sum + (driver.loads[0]?.issues.length ?? 0), 0);
  const mapMarkers: OpenLayersMarker[] = mappedDrivers.map((driver) => {
    const location = latestLocation(driver)!;
    return {
      id: driver.id,
      label: driver.fullName,
      subtitle: location.label,
      lat: location.lat,
      lng: location.lng,
      status: driver.status,
    };
  });
  const selectedPopup = selectedDriver && selectedLocation
    ? {
      title: selectedDriver.fullName,
      rows: [
        selectedDriver.currentTruck?.truckNumber ?? 'No truck',
        selectedLocation.label ?? 'Location update',
      ],
    }
    : null;

  return (
    <div className="h-full min-h-screen flex flex-col bg-background">
      <div className="px-6 py-5 border-b border-border-subtle flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Fleet Map</h1>
          <p className="text-sm text-text-secondary mt-1">
            {formatNumber(mappedDrivers.length)} mapped drivers · {formatNumber(visibleDrivers.length)} visible
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative w-full lg:w-[340px]">
            <Search className="h-4 w-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search driver, truck, load, location"
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

      <div className="px-6 py-3 border-b border-border-subtle flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setStatus(option.value)}
            className={cn(
              'h-9 rounded-md border px-3 text-sm transition-colors',
              status === option.value
                ? 'border-brand bg-brand-muted text-brand-light'
                : 'border-border bg-background-secondary text-text-secondary hover:text-text-primary hover:bg-background-hover',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid flex-1 min-h-[680px] grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="relative min-h-[520px]">
          <OpenLayersUsaMap
            markers={mapMarkers}
            selectedId={selectedDriver?.id}
            onSelect={setSelectedId}
            loading={loading}
            popup={selectedPopup}
            emptyLabel="No trucks have location updates yet. Once a driver location is added, the marker will appear on this USA map."
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
              <p className="text-2xs uppercase tracking-wider text-text-muted">On Load</p>
              <p className="text-xl font-bold text-text-primary mt-1">
                {visibleDrivers.filter((driver) => driver.status === 'ON_LOAD').length}
              </p>
            </div>
            <div className="p-4 border-l border-border-subtle">
              <p className="text-2xs uppercase tracking-wider text-text-muted">Issues</p>
              <p className="text-xl font-bold text-text-primary mt-1">{activeIssues}</p>
            </div>
          </div>

          {selectedDriver && (
            <div className="p-4 border-b border-border-subtle">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-text-primary">{selectedDriver.fullName}</h2>
                  <p className="text-sm text-text-secondary mt-1">{selectedDriver.client?.companyName ?? 'No client assigned'}</p>
                </div>
                <span className={cn('badge', selectedDriver.status === 'ON_LOAD' ? 'bg-blue-500/15 text-blue-400' : 'bg-green-500/15 text-green-400')}>
                  {selectedDriver.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center gap-2 text-text-secondary">
                  <Truck className="h-4 w-4 text-text-muted" />
                  {selectedDriver.currentTruck?.truckNumber ?? 'No truck assigned'}
                </div>
                <div className="flex items-center gap-2 text-text-secondary">
                  <Navigation className="h-4 w-4 text-text-muted" />
                  {routeLabel(selectedDriver.loads[0])}
                </div>
                <div className="flex items-center gap-2 text-text-secondary">
                  <LocateFixed className="h-4 w-4 text-text-muted" />
                  {selectedLocation?.label ?? 'No latest location'}
                </div>
                <div className="flex items-center gap-2 text-text-secondary">
                  <Clock className="h-4 w-4 text-text-muted" />
                  {selectedLocation ? formatDateTime(selectedLocation.at) : '—'}
                </div>
                <div className="flex items-center gap-2 text-text-secondary">
                  <UserRound className="h-4 w-4 text-text-muted" />
                  {selectedDriver.dispatcher?.fullName ?? 'No dispatcher'}
                </div>
              </div>
            </div>
          )}

          <div className="divide-y divide-border-subtle">
            {visibleDrivers.map((driver) => {
              const location = latestLocation(driver);
              const load = driver.loads[0];

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
                      <p className="text-xs text-text-muted mt-1 truncate">{driver.currentTruck?.truckNumber ?? 'No truck'} · {driver.client?.companyName ?? 'No client'}</p>
                    </div>
                    <span className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0 mt-1.5', driver.status === 'ON_LOAD' ? 'bg-blue-400' : 'bg-green-400')} />
                  </div>
                  <p className="text-xs text-text-secondary mt-2 truncate">{routeLabel(load)}</p>
                  <p className="text-xs text-text-muted mt-1 truncate">{location?.label ?? 'No location update'}</p>
                </button>
              );
            })}

            {!loading && visibleDrivers.length === 0 && (
              <div className="p-8 text-center">
                <Truck className="h-8 w-8 mx-auto text-text-muted mb-3" />
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
