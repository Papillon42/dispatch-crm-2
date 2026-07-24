'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  CalendarClock,
  ClipboardList,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
  Truck,
  UserCheck,
  X,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { cn, formatDate, formatDateTime, formatNumber } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDriverStatuses } from '@/hooks/useDriverStatuses';
import { useRealtime } from '@/hooks/useRealtime';
import { useToast } from '@/components/providers/ToastProvider';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DriverStatusBadge } from '@/components/ui/StatusBadge';
import { ON_TRIP_STATUSES } from '@/lib/driverStatus';

type DriverStatus = string;

type DriverRow = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  telegram: string | null;
  telegramChatId: string | null;
  cdlNumber: string | null;
  cdlState: string | null;
  cdlExpiry: string | null;
  status: DriverStatus;
  homeBase: string | null;
  preferredLanes: string[];
  score: number;
  notes: string | null;
  createdAt: string;
  client: { id: string; companyName: string } | null;
  dispatcher: { id: string; fullName: string } | null;
  updater: { id: string; fullName: string } | null;
  currentTruck: { id: string; truckNumber: string; trailerType: string } | null;
  locationUpdates: Array<{
    id: string;
    lat: number;
    lng: number;
    label: string | null;
    at: string;
  }>;
  _count: { loads: number; issues: number; documents: number };
};

type DriversResponse = {
  drivers: DriverRow[];
  total: number;
  page: number;
  limit: number;
};

type ClientOption = {
  id: string;
  companyName: string;
};

type ClientsResponse = {
  clients: ClientOption[];
};

type CreateDriverForm = {
  clientId: string;
  fullName: string;
  phone: string;
  email: string;
  avatarUrl: string;
  telegram: string;
  cdlNumber: string;
  cdlState: string;
  cdlExpiry: string;
  homeBase: string;
  preferredLanes: string;
  notes: string;
};

const EMPTY_FORM: CreateDriverForm = {
  clientId: '',
  fullName: '',
  phone: '',
  email: '',
  avatarUrl: '',
  telegram: '',
  cdlNumber: '',
  cdlState: '',
  cdlExpiry: '',
  homeBase: '',
  preferredLanes: '',
  notes: '',
};

function cdlLabel(driver: DriverRow) {
  const parts = [driver.cdlState, driver.cdlNumber].filter(Boolean);
  return parts.length ? parts.join(' ') : '-';
}

function isCdlExpiring(driver: DriverRow) {
  if (!driver.cdlExpiry) return false;
  const expires = new Date(driver.cdlExpiry).getTime();
  const thirtyDays = Date.now() + 1000 * 60 * 60 * 24 * 30;
  return expires <= thirtyDays;
}

export function DriversWorkspace() {
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | DriverStatus>('ALL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DriverRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { user } = useCurrentUser();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const { statuses: statusConfigs } = useDriverStatuses();

  const STATUS_OPTIONS: Array<{ value: 'ALL' | DriverStatus; label: string }> = [
    { value: 'ALL', label: 'All' },
    ...statusConfigs.map((s) => ({ value: s.code, label: s.label })),
  ];

  useEffect(() => {
    if (searchParams.get('new') === '1') setIsCreateOpen(true);
  }, [searchParams]);
  const [form, setForm] = useState<CreateDriverForm>(EMPTY_FORM);

  const query = useMemo(() => {
    const params = new URLSearchParams({ limit: '100' });
    if (search.trim()) params.set('search', search.trim());
    if (status !== 'ALL') params.set('status', status);
    return params.toString();
  }, [search, status]);

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/drivers?${query}`, { cache: 'no-store' });
      const payload = await res.json().catch(() => null);

      if (!res.ok) throw new Error(payload?.error ?? 'Unable to load drivers');

      const data = payload as DriversResponse;
      setDrivers(data.drivers);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load drivers');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const loadClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients?limit=100', { cache: 'no-store' });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error ?? 'Unable to load clients');
      setClients((payload as ClientsResponse).clients.map((client) => ({
        id: client.id,
        companyName: client.companyName,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load clients');
    }
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDrivers();
    }, 180);

    return () => window.clearTimeout(timer);
  }, [loadDrivers]);

  function updateForm<K extends keyof CreateDriverForm>(key: K, value: CreateDriverForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openCreateModal() {
    setForm((current) => ({ ...current, clientId: current.clientId || clients[0]?.id || '' }));
    setIsCreateOpen(true);
  }

  async function createDriver(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: form.clientId,
          fullName: form.fullName.trim(),
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          avatarUrl: form.avatarUrl.trim() || undefined,
          telegram: form.telegram.trim() || undefined,
          cdlNumber: form.cdlNumber.trim() || undefined,
          cdlState: form.cdlState.trim() || undefined,
          cdlExpiry: form.cdlExpiry || undefined,
          homeBase: form.homeBase.trim() || undefined,
          preferredLanes: form.preferredLanes.split(',').map((lane) => lane.trim()).filter(Boolean),
          notes: form.notes.trim() || undefined,
        }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error ?? 'Unable to create driver');

      const createdDriver = payload as DriverRow;
      setForm(EMPTY_FORM);
      setIsCreateOpen(false);
      setSearch('');
      setStatus('ALL');
      setDrivers((current) => [createdDriver, ...current.filter((driver) => driver.id !== createdDriver.id)]);
      setTotal((current) => current + (drivers.some((driver) => driver.id === createdDriver.id) ? 0 : 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create driver');
    } finally {
      setSaving(false);
    }
  }

  async function deleteDriver() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/drivers/${deleteTarget.id}`, { method: 'DELETE' });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error ?? 'Unable to delete driver');
      showToast(`Driver "${deleteTarget.fullName}" deleted`, 'success');
      setDeleteTarget(null);
      await loadDrivers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete driver', 'error');
    } finally {
      setDeleting(false);
    }
  }

  // Live updates: refresh the table when any driver status/location changes
  useRealtime({
    onEvent: () => {
      void loadDrivers();
    },
  });

  const canDelete = user?.role != null && ['OWNER', 'ADMIN'].includes(user.role);

  const availableCount = drivers.filter((driver) => driver.status === 'AVAILABLE').length;
  const onLoadCount = drivers.filter((driver) => ON_TRIP_STATUSES.includes(driver.status)).length;
  const linkedTelegramCount = drivers.filter((driver) => driver.telegramChatId).length;
  const expiringCdlCount = drivers.filter(isCdlExpiring).length;

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Drivers</h1>
          <p className="text-sm text-text-secondary mt-1">{formatNumber(total)} total drivers</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadDrivers()}
            className="h-10 w-10 inline-flex items-center justify-center rounded-md border border-border bg-background-secondary text-text-secondary hover:text-text-primary hover:bg-background-hover transition-colors"
            aria-label="Refresh drivers"
            title="Refresh"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="h-10 inline-flex items-center gap-2 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-dark transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            disabled={clients.length === 0}
          >
            <Plus className="h-4 w-4" />
            New Driver
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="kpi-card">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Available</p>
            <UserCheck className="h-4 w-4 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-text-primary">{formatNumber(availableCount)}</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">On Load</p>
            <Truck className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-text-primary">{formatNumber(onLoadCount)}</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Telegram</p>
            <ShieldCheck className="h-4 w-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-text-primary">{formatNumber(linkedTelegramCount)}</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">CDL Alerts</p>
            <CalendarClock className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-text-primary">{formatNumber(expiringCdlCount)}</p>
        </div>
      </div>

      <div className="bg-background-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border-subtle flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative max-w-md w-full">
            <Search className="h-4 w-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search driver, client, truck, CDL"
              className="h-10 w-full rounded-md border border-border bg-background-secondary pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-border-focus"
            />
          </div>

          <div className="flex flex-wrap gap-2">
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
        </div>

        {error && (
          <div className="m-4 flex items-center gap-2 rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {clients.length === 0 && !loading && (
          <div className="m-4 rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
            Add a client before creating drivers.
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="data-table w-full min-w-[1120px]">
            <thead>
              <tr>
                <th>Driver</th>
                <th>Status</th>
                <th>Client</th>
                <th>Truck</th>
                <th>CDL</th>
                <th>Home / Lanes</th>
                <th>Last Location</th>
                <th>Activity</th>
                <th>Dispatcher</th>
                {canDelete && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={canDelete ? 10 : 9}>
                      <div className="h-8 rounded bg-background-hover animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : drivers.length === 0 ? (
                <tr>
                  <td colSpan={canDelete ? 10 : 9}>
                    <div className="py-12 text-center">
                      <Truck className="h-8 w-8 text-text-muted mx-auto mb-3" />
                      <p className="text-sm font-medium text-text-primary">No drivers found</p>
                      <p className="text-sm text-text-secondary mt-1">Add a driver or adjust the current filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                drivers.map((driver) => {
                  const location = driver.locationUpdates[0];

                  return (
                    <tr key={driver.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          {driver.avatarUrl ? (
                            <img
                              src={driver.avatarUrl}
                              alt=""
                              className="h-9 w-9 flex-shrink-0 rounded-full border border-border object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-border bg-background-hover text-xs font-semibold text-text-secondary">
                              {driver.fullName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <Link href={`/drivers/${driver.id}`} className="font-medium text-text-primary hover:text-brand-light transition-colors">
                              {driver.fullName}
                            </Link>
                            <div className="mt-1 flex flex-col gap-0.5 text-xs text-text-muted">
                              {driver.phone && (
                                <span className="inline-flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {driver.phone}
                                </span>
                              )}
                              {driver.email && (
                                <span className="inline-flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {driver.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td><DriverStatusBadge status={driver.status} configs={statusConfigs} /></td>
                      <td>{driver.client?.companyName ?? '-'}</td>
                      <td>
                        {driver.currentTruck ? (
                          <div className="text-xs text-text-secondary">
                            <p className="font-medium text-text-primary">{driver.currentTruck.truckNumber}</p>
                            <p>{driver.currentTruck.trailerType.replace(/_/g, ' ')}</p>
                          </div>
                        ) : (
                          <span className="text-text-muted">Unassigned</span>
                        )}
                      </td>
                      <td>
                        <div className="text-xs text-text-secondary">
                          <p className="font-medium text-text-primary">{cdlLabel(driver)}</p>
                          <p className={cn(isCdlExpiring(driver) && 'text-amber-300')}>
                            {driver.cdlExpiry ? formatDate(driver.cdlExpiry) : 'No expiry'}
                          </p>
                        </div>
                      </td>
                      <td>
                        <div className="text-xs text-text-secondary max-w-[220px]">
                          <p className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-text-muted" />
                            {driver.homeBase ?? '-'}
                          </p>
                          <p className="mt-1 truncate">
                            {driver.preferredLanes.length ? driver.preferredLanes.join(', ') : 'No lanes'}
                          </p>
                        </div>
                      </td>
                      <td>
                        {location ? (
                          <div className="text-xs text-text-secondary max-w-[220px]">
                            <p className="truncate">{location.label ?? `${location.lat.toFixed(2)}, ${location.lng.toFixed(2)}`}</p>
                            <p className="text-text-muted">{formatDateTime(location.at)}</p>
                          </div>
                        ) : (
                          <span className="text-text-muted">No update</span>
                        )}
                      </td>
                      <td>
                        <div className="text-xs text-text-secondary">
                          <p>{formatNumber(driver._count.loads)} loads</p>
                          <p>{formatNumber(driver._count.issues)} issues</p>
                        </div>
                      </td>
                      <td>{driver.dispatcher?.fullName ?? '-'}</td>
                      {canDelete && (
                        <td>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(driver)}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                            aria-label={`Delete ${driver.fullName}`}
                            title="Delete driver"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Delete driver"
          message={`Delete "${deleteTarget.fullName}"? They will be removed from active lists; historical loads and documents are kept.`}
          busy={deleting}
          onConfirm={deleteDriver}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-lg border border-border bg-background-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-text-primary">New Driver</h2>
                <p className="text-xs text-text-muted mt-0.5">Driver profile and compliance basics</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-md text-text-secondary hover:bg-background-hover hover:text-text-primary transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={createDriver} className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Client</span>
                  <select
                    required
                    value={form.clientId}
                    onChange={(event) => updateForm('clientId', event.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-background-secondary px-3 text-sm text-text-primary outline-none focus:border-border-focus"
                  >
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>{client.companyName}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Full Name</span>
                  <input
                    required
                    value={form.fullName}
                    onChange={(event) => updateForm('fullName', event.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-background-secondary px-3 text-sm text-text-primary outline-none focus:border-border-focus"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Phone</span>
                  <input
                    value={form.phone}
                    onChange={(event) => updateForm('phone', event.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-background-secondary px-3 text-sm text-text-primary outline-none focus:border-border-focus"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateForm('email', event.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-background-secondary px-3 text-sm text-text-primary outline-none focus:border-border-focus"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Photo URL</span>
                  <input
                    type="url"
                    value={form.avatarUrl}
                    onChange={(event) => updateForm('avatarUrl', event.target.value)}
                    placeholder="https://..."
                    className="h-10 w-full rounded-md border border-border bg-background-secondary px-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-border-focus"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Telegram</span>
                  <input
                    value={form.telegram}
                    onChange={(event) => updateForm('telegram', event.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-background-secondary px-3 text-sm text-text-primary outline-none focus:border-border-focus"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Home Base</span>
                  <input
                    value={form.homeBase}
                    onChange={(event) => updateForm('homeBase', event.target.value)}
                    placeholder="Dallas, TX"
                    className="h-10 w-full rounded-md border border-border bg-background-secondary px-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-border-focus"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">CDL Number</span>
                  <input
                    value={form.cdlNumber}
                    onChange={(event) => updateForm('cdlNumber', event.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-background-secondary px-3 text-sm text-text-primary outline-none focus:border-border-focus"
                  />
                </label>

                <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">State</span>
                    <input
                      value={form.cdlState}
                      onChange={(event) => updateForm('cdlState', event.target.value)}
                      maxLength={2}
                      className="h-10 w-full rounded-md border border-border bg-background-secondary px-3 text-sm uppercase text-text-primary outline-none focus:border-border-focus"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">CDL Expiry</span>
                    <input
                      type="date"
                      value={form.cdlExpiry}
                      onChange={(event) => updateForm('cdlExpiry', event.target.value)}
                      className="h-10 w-full rounded-md border border-border bg-background-secondary px-3 text-sm text-text-primary outline-none focus:border-border-focus"
                    />
                  </label>
                </div>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Preferred Lanes</span>
                  <div className="relative">
                    <Route className="h-4 w-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={form.preferredLanes}
                      onChange={(event) => updateForm('preferredLanes', event.target.value)}
                      placeholder="TX-CA, Midwest, Southeast"
                      className="h-10 w-full rounded-md border border-border bg-background-secondary pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-border-focus"
                    />
                  </div>
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Notes</span>
                  <div className="relative">
                    <ClipboardList className="h-4 w-4 text-text-muted absolute left-3 top-3" />
                    <textarea
                      value={form.notes}
                      onChange={(event) => updateForm('notes', event.target.value)}
                      rows={3}
                      className="w-full rounded-md border border-border bg-background-secondary py-2 pl-9 pr-3 text-sm text-text-primary outline-none focus:border-border-focus"
                    />
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="h-10 rounded-md border border-border bg-background-secondary px-4 text-sm text-text-secondary hover:bg-background-hover hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                >
                  {saving ? 'Saving...' : 'Create Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
