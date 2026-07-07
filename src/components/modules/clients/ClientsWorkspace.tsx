'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  Building2,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Truck,
  UserRound,
  X,
  Trash2,
} from 'lucide-react';
import { cn, formatDate, formatNumber } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/components/providers/ToastProvider';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type ClientStatus = 'ACTIVE' | 'WARNING' | 'INACTIVE' | 'AT_RISK';

type ClientRow = {
  id: string;
  companyName: string;
  mc: string | null;
  dot: string | null;
  status: ClientStatus;
  dispatchFeePercent: number;
  city: string | null;
  state: string | null;
  createdAt: string;
  dispatcher: { id: string; fullName: string } | null;
  contacts: Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: string | null;
    isPrimary: boolean;
  }>;
  _count: {
    trucks: number;
    drivers: number;
    loads: number;
  };
};

type ClientsResponse = {
  clients: ClientRow[];
  total: number;
  page: number;
  limit: number;
};

type CreateClientForm = {
  companyName: string;
  mc: string;
  dot: string;
  dispatchFeePercent: string;
  city: string;
  state: string;
  notes: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactRole: string;
};

const STATUS_OPTIONS: Array<{ value: 'ALL' | ClientStatus; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'AT_RISK', label: 'At Risk' },
  { value: 'INACTIVE', label: 'Inactive' },
];

const STATUS_STYLES: Record<ClientStatus, string> = {
  ACTIVE: 'bg-green-500/15 text-green-400',
  WARNING: 'bg-amber-500/15 text-amber-400',
  INACTIVE: 'bg-gray-500/15 text-gray-400',
  AT_RISK: 'bg-red-500/15 text-red-400',
};

const STATUS_LABELS: Record<ClientStatus, string> = {
  ACTIVE: 'Active',
  WARNING: 'Warning',
  INACTIVE: 'Inactive',
  AT_RISK: 'At Risk',
};

const EMPTY_FORM: CreateClientForm = {
  companyName: '',
  mc: '',
  dot: '',
  dispatchFeePercent: '10',
  city: '',
  state: '',
  notes: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  contactRole: '',
};

function ClientStatusPill({ status }: { status: ClientStatus }) {
  return (
    <span className={cn('badge', STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function compactLocation(client: ClientRow) {
  return [client.city, client.state].filter(Boolean).join(', ') || '—';
}

export function ClientsWorkspace() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | ClientStatus>('ALL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClientRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { user } = useCurrentUser();
  const { showToast } = useToast();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('new') === '1') setIsCreateOpen(true);
  }, [searchParams]);
  const [form, setForm] = useState<CreateClientForm>(EMPTY_FORM);

  const query = useMemo(() => {
    const params = new URLSearchParams({ limit: '100' });
    if (search.trim()) params.set('search', search.trim());
    if (status !== 'ALL') params.set('status', status);
    return params.toString();
  }, [search, status]);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/clients?${query}`, { cache: 'no-store' });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error ?? 'Unable to load clients');
      }

      const data = payload as ClientsResponse;
      setClients(data.clients);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load clients');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadClients();
    }, 180);

    return () => window.clearTimeout(timer);
  }, [loadClients]);

  function updateForm<K extends keyof CreateClientForm>(key: K, value: CreateClientForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function createClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const contacts = form.contactName.trim()
      ? [{
          name: form.contactName.trim(),
          email: form.contactEmail.trim() || undefined,
          phone: form.contactPhone.trim() || undefined,
          role: form.contactRole.trim() || undefined,
          isPrimary: true,
        }]
      : undefined;

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: form.companyName.trim(),
          mc: form.mc.trim() || undefined,
          dot: form.dot.trim() || undefined,
          dispatchFeePercent: Number(form.dispatchFeePercent || 10),
          city: form.city.trim() || undefined,
          state: form.state.trim() || undefined,
          notes: form.notes.trim() || undefined,
          contacts,
        }),
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(payload?.error ?? 'Unable to create client');
      }

      setForm(EMPTY_FORM);
      setIsCreateOpen(false);
      await loadClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create client');
    } finally {
      setSaving(false);
    }
  }

  const activeCount = clients.filter((client) => client.status === 'ACTIVE').length;
  const trucksCount = clients.reduce((sum, client) => sum + client._count.trucks, 0);
  async function deleteClient() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/clients/${deleteTarget.id}`, { method: 'DELETE' });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error ?? 'Unable to delete client');
      showToast(`Client "${deleteTarget.companyName}" deleted`, 'success');
      setDeleteTarget(null);
      await loadClients();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete client', 'error');
    } finally {
      setDeleting(false);
    }
  }

  const canDelete = user?.role === 'ADMIN';

  const loadsCount = clients.reduce((sum, client) => sum + client._count.loads, 0);

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Clients</h1>
          <p className="text-sm text-text-secondary mt-1">{formatNumber(total)} total accounts</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadClients()}
            className="h-10 w-10 inline-flex items-center justify-center rounded-md border border-border bg-background-secondary text-text-secondary hover:text-text-primary hover:bg-background-hover transition-colors"
            aria-label="Refresh clients"
            title="Refresh"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="h-10 inline-flex items-center gap-2 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-dark transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Client
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="kpi-card">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Visible</p>
            <Building2 className="h-4 w-4 text-brand-light" />
          </div>
          <p className="text-2xl font-bold text-text-primary">{formatNumber(total)}</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Active</p>
            <UserRound className="h-4 w-4 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-text-primary">{formatNumber(activeCount)}</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Trucks</p>
            <Truck className="h-4 w-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-text-primary">{formatNumber(trucksCount)}</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Loads</p>
            <SlidersHorizontal className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-text-primary">{formatNumber(loadsCount)}</p>
        </div>
      </div>

      <div className="bg-background-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border-subtle flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative max-w-md w-full">
            <Search className="h-4 w-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search company, MC, DOT, contact"
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

        <div className="overflow-x-auto">
          <table className="data-table w-full min-w-[980px]">
            <thead>
              <tr>
                <th>Company</th>
                <th>Status</th>
                <th>Primary Contact</th>
                <th>MC / DOT</th>
                <th>Fleet</th>
                <th>Fee</th>
                <th>Dispatcher</th>
                <th>Added</th>
                {canDelete && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={canDelete ? 9 : 8}>
                      <div className="h-8 rounded bg-background-hover animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={canDelete ? 9 : 8}>
                    <div className="py-12 text-center">
                      <Building2 className="h-8 w-8 text-text-muted mx-auto mb-3" />
                      <p className="text-sm font-medium text-text-primary">No clients found</p>
                      <p className="text-sm text-text-secondary mt-1">Add a client or adjust the current filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                clients.map((client) => {
                  const contact = client.contacts[0];

                  return (
                    <tr key={client.id}>
                      <td>
                        <div>
                          <p className="font-medium text-text-primary">{client.companyName}</p>
                          <p className="text-xs text-text-muted">{compactLocation(client)}</p>
                        </div>
                      </td>
                      <td><ClientStatusPill status={client.status} /></td>
                      <td>
                        {contact ? (
                          <div className="space-y-1">
                            <p className="font-medium text-text-primary">{contact.name}</p>
                            <div className="flex flex-col gap-0.5 text-xs text-text-muted">
                              {contact.email && (
                                <span className="inline-flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {contact.email}
                                </span>
                              )}
                              {contact.phone && (
                                <span className="inline-flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {contact.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <div className="text-xs text-text-secondary">
                          <p>MC {client.mc ?? '—'}</p>
                          <p>DOT {client.dot ?? '—'}</p>
                        </div>
                      </td>
                      <td>
                        <div className="text-xs text-text-secondary">
                          <p>{formatNumber(client._count.trucks)} trucks</p>
                          <p>{formatNumber(client._count.drivers)} drivers</p>
                        </div>
                      </td>
                      <td>{client.dispatchFeePercent.toFixed(1)}%</td>
                      <td>{client.dispatcher?.fullName ?? '—'}</td>
                      <td>{formatDate(client.createdAt)}</td>
                      {canDelete && (
                        <td>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(client)}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                            aria-label={`Delete ${client.companyName}`}
                            title="Delete client"
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
          title="Delete client"
          message={`Delete "${deleteTarget.companyName}"? They will be removed from active lists; historical trucks, drivers, and loads are kept.`}
          busy={deleting}
          onConfirm={deleteClient}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-lg border border-border bg-background-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-text-primary">New Client</h2>
                <p className="text-xs text-text-muted mt-0.5">Truck owner account</p>
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

            <form onSubmit={createClient} className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Company</span>
                  <input
                    required
                    value={form.companyName}
                    onChange={(event) => updateForm('companyName', event.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-background-secondary px-3 text-sm text-text-primary outline-none focus:border-border-focus"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">MC</span>
                  <input
                    value={form.mc}
                    onChange={(event) => updateForm('mc', event.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-background-secondary px-3 text-sm text-text-primary outline-none focus:border-border-focus"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">DOT</span>
                  <input
                    value={form.dot}
                    onChange={(event) => updateForm('dot', event.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-background-secondary px-3 text-sm text-text-primary outline-none focus:border-border-focus"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">City</span>
                  <input
                    value={form.city}
                    onChange={(event) => updateForm('city', event.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-background-secondary px-3 text-sm text-text-primary outline-none focus:border-border-focus"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">State</span>
                  <input
                    value={form.state}
                    onChange={(event) => updateForm('state', event.target.value)}
                    maxLength={2}
                    className="h-10 w-full rounded-md border border-border bg-background-secondary px-3 text-sm text-text-primary outline-none focus:border-border-focus uppercase"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Dispatch Fee</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={form.dispatchFeePercent}
                    onChange={(event) => updateForm('dispatchFeePercent', event.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-background-secondary px-3 text-sm text-text-primary outline-none focus:border-border-focus"
                  />
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Notes</span>
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateForm('notes', event.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-md border border-border bg-background-secondary px-3 py-2 text-sm text-text-primary outline-none focus:border-border-focus"
                  />
                </label>
              </div>

              <div className="border-t border-border-subtle pt-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Contact Name</span>
                    <input
                      value={form.contactName}
                      onChange={(event) => updateForm('contactName', event.target.value)}
                      className="h-10 w-full rounded-md border border-border bg-background-secondary px-3 text-sm text-text-primary outline-none focus:border-border-focus"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Role</span>
                    <input
                      value={form.contactRole}
                      onChange={(event) => updateForm('contactRole', event.target.value)}
                      className="h-10 w-full rounded-md border border-border bg-background-secondary px-3 text-sm text-text-primary outline-none focus:border-border-focus"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Email</span>
                    <input
                      type="email"
                      value={form.contactEmail}
                      onChange={(event) => updateForm('contactEmail', event.target.value)}
                      className="h-10 w-full rounded-md border border-border bg-background-secondary px-3 text-sm text-text-primary outline-none focus:border-border-focus"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Phone</span>
                    <input
                      value={form.contactPhone}
                      onChange={(event) => updateForm('contactPhone', event.target.value)}
                      className="h-10 w-full rounded-md border border-border bg-background-secondary px-3 text-sm text-text-primary outline-none focus:border-border-focus"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border-subtle pt-5">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="h-10 rounded-md border border-border bg-background-secondary px-4 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-background-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 inline-flex items-center gap-2 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60 transition-colors"
                >
                  {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
                  Create Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
