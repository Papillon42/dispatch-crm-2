'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArchiveRestore, Building2, Pencil, Trash2, Truck, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable, DataTableColumn } from '@/components/ui/DataTable';
import { LiveBadge } from '@/components/realtime/LiveBadge';
import { usePolling } from '@/hooks/usePolling';
import { cn, formatDate } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/components/providers/ToastProvider';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PendingApprovals } from './PendingApprovals';

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  SENIOR_DISPATCHER: 'Senior Dispatcher',
  DISPATCHER: 'Dispatcher',
  UPDATER: 'Updater',
  RECRUITER: 'Recruiter',
  FINANCE: 'Finance',
  CLIENT: 'Client',
  DRIVER: 'Driver',
};

const ROLE_BADGE: Record<string, string> = {
  OWNER: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  ADMIN: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  SENIOR_DISPATCHER: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
  DISPATCHER: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  UPDATER: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  RECRUITER: 'bg-pink-500/15 text-pink-400 border-pink-500/25',
  FINANCE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  CLIENT: 'bg-teal-500/15 text-teal-400 border-teal-500/25',
  DRIVER: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-success/15 text-success',
  PENDING: 'bg-amber-500/15 text-amber-400',
  REJECTED: 'bg-red-500/15 text-red-400',
  INACTIVE: 'bg-gray-500/15 text-gray-400',
  SUSPENDED: 'bg-gray-600/15 text-gray-500',
};

interface TeamOptions {
  clients: Array<{ id: string; companyName: string }>;
  drivers: Array<{ id: string; fullName: string; client: { companyName: string } | null }>;
  managers: Array<{ id: string; fullName: string; role: string }>;
}

export function TeamWorkspace() {
  const searchParams = useSearchParams();
  const [role, setRole] = useState('ALL');
  const [includeSuspended, setIncludeSuspended] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [options, setOptions] = useState<TeamOptions | null>(null);
  const { user: currentUser } = useCurrentUser();
  const { showToast } = useToast();

  useEffect(() => {
    const fromUrl = searchParams.get('role');
    if (fromUrl) setRole(fromUrl);
  }, [searchParams]);

  const query = new URLSearchParams();
  if (role !== 'ALL') query.set('role', role);
  if (includeSuspended) query.set('includeSuspended', '1');

  const { data, loading, lastUpdatedAt, refresh } = usePolling<any>(
    `/api/team${query.toString() ? `?${query.toString()}` : ''}`,
    { intervalMs: 20000 },
  );
  const users = data?.users ?? [];
  const roleCounts: Record<string, number> = data?.roleCounts ?? {};
  const isOwner = currentUser?.role != null && ['OWNER', 'ADMIN'].includes(currentUser.role);

  useEffect(() => {
    if (!isOwner) return;
    fetch('/api/team/options', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => payload && setOptions(payload))
      .catch(() => null);
  }, [isOwner]);

  async function deleteUser() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/team/${deleteTarget.id}`, { method: 'DELETE' });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error ?? 'Unable to delete user');
      showToast(`"${deleteTarget.fullName}" suspended`, 'success');
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete user', 'error');
    } finally {
      setDeleting(false);
    }
  }

  async function restoreUser(user: any) {
    try {
      const res = await fetch(`/api/team/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error ?? 'Unable to restore user');
      showToast(`"${user.fullName}" restored`, 'success');
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to restore user', 'error');
    }
  }

  function bindingLabel(u: any) {
    if (u.role === 'CLIENT') {
      return u.clientAccount
        ? <span className="inline-flex items-center gap-1 text-xs text-text-secondary"><Building2 className="h-3 w-3 text-text-muted" />{u.clientAccount.companyName}</span>
        : <span className="text-xs text-amber-400">not bound</span>;
    }
    if (u.role === 'DRIVER') {
      return u.driverAccount
        ? <span className="inline-flex items-center gap-1 text-xs text-text-secondary"><Truck className="h-3 w-3 text-text-muted" />{u.driverAccount.fullName}</span>
        : <span className="text-xs text-amber-400">not bound</span>;
    }
    return <span className="text-text-muted">—</span>;
  }

  const columns: DataTableColumn<any>[] = [
    {
      key: 'name', header: 'Name', render: (u) => (
        <div>
          <p className="font-medium text-text-primary">{u.fullName}</p>
          <p className="text-xs text-text-muted">{u.email}{u.phone ? ` · ${u.phone}` : ''}</p>
        </div>
      ),
    },
    {
      key: 'role', header: 'Role', render: (u) => (
        <span className={cn('badge border', ROLE_BADGE[u.role] ?? 'bg-background-hover text-text-secondary')}>
          {ROLE_LABELS[u.role] ?? u.role}{u.isSenior && !['OWNER', 'ADMIN'].includes(u.role) ? ' · Senior' : ''}
        </span>
      ),
    },
    { key: 'binding', header: 'Linked To', render: bindingLabel },
    { key: 'manager', header: 'Manager', render: (u) => u.manager?.fullName ?? '—' },
    {
      key: 'status', header: 'Status', render: (u) => (
        <span className={cn('badge', STATUS_BADGE[u.status] ?? 'bg-gray-500/15 text-gray-400')}>{u.status}</span>
      ),
    },
    { key: 'since', header: 'Since', render: (u) => formatDate(u.createdAt) },
    ...(isOwner ? [{
      key: 'actions',
      header: 'Actions',
      render: (u: any) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setEditTarget(u); }}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-background-hover transition-colors"
            aria-label={`Edit ${u.fullName}`}
            title="Edit user"
          >
            <Pencil className="h-4 w-4" />
          </button>
          {u.status === 'SUSPENDED' ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); void restoreUser(u); }}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md text-text-muted hover:text-success hover:bg-success/10 transition-colors"
              aria-label={`Restore ${u.fullName}`}
              title="Restore user"
            >
              <ArchiveRestore className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(u); }}
              disabled={u.id === currentUser?.id}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label={`Suspend ${u.fullName}`}
              title={u.id === currentUser?.id ? 'You cannot suspend your own account' : 'Suspend user'}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    } as DataTableColumn<any>] : []),
  ];

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="Team"
        subtitle={isOwner ? 'Approve registrations, grant roles, manage access' : 'Internal users by role'}
        actions={<LiveBadge lastUpdatedAt={lastUpdatedAt} />}
      />

      {isOwner && <PendingApprovals onChanged={refresh} />}

      <div className="flex flex-wrap items-center gap-2">
        {['ALL', ...Object.keys(ROLE_LABELS)].map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border ${role === r ? 'bg-brand-muted border-brand text-brand-light' : 'border-border text-text-secondary hover:text-text-primary'}`}
          >
            {r === 'ALL' ? 'All' : ROLE_LABELS[r]}
            {r !== 'ALL' && roleCounts[r] ? ` (${roleCounts[r]})` : ''}
          </button>
        ))}
        {isOwner && (
          <label className="ml-auto inline-flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={includeSuspended}
              onChange={(e) => setIncludeSuspended(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            Show suspended
          </label>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={users}
        getRowId={(u) => u.id}
        loading={loading}
        emptyMessage="No users found for this role."
        footer={<span className="text-sm text-text-secondary">{users.length} users</span>}
      />

      {deleteTarget && (
        <ConfirmDialog
          title="Suspend user"
          message={`Suspend "${deleteTarget.fullName}"? They immediately lose access; historical assignments (loads, clients, drivers, commissions) are kept. You can restore them later via "Show suspended".`}
          busy={deleting}
          onConfirm={deleteUser}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {editTarget && options && (
        <EditUserModal
          user={editTarget}
          options={options}
          isSelf={editTarget.id === currentUser?.id}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); refresh(); }}
        />
      )}
    </div>
  );
}

// ── Edit modal ───────────────────────────────────────────────────────────────

function EditUserModal({
  user, options, isSelf, onClose, onSaved,
}: {
  user: any;
  options: TeamOptions;
  isSelf: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [role, setRole] = useState<string>(user.role);
  const [status, setStatus] = useState<string>(user.status === 'SUSPENDED' ? 'SUSPENDED' : user.status);
  const [isSenior, setIsSenior] = useState<boolean>(Boolean(user.isSenior));
  const [managerId, setManagerId] = useState<string>(user.managerId ?? '');
  const [clientId, setClientId] = useState<string>(user.clientAccount?.id ?? '');
  const [driverId, setDriverId] = useState<string>(user.driverAccount?.id ?? '');
  const [fullName, setFullName] = useState<string>(user.fullName ?? '');
  const [phone, setPhone] = useState<string>(user.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsClient = role === 'CLIENT';
  const needsDriver = role === 'DRIVER';
  const isDispatcherish = ['DISPATCHER', 'UPDATER', 'RECRUITER'].includes(role);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/team/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          status,
          isSenior,
          managerId: managerId || null,
          clientId: needsClient ? (clientId || null) : null,
          driverId: needsDriver ? (driverId || null) : null,
          fullName: fullName.trim() || undefined,
          phone: phone.trim() || null,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error ?? 'Unable to save user');
      showToast(`${fullName || user.fullName} saved`, 'success');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save user');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'h-10 w-full rounded-md border border-border bg-background-secondary px-3 text-sm text-text-primary outline-none focus:border-border-focus';
  const labelCls = 'text-xs font-medium text-text-secondary uppercase tracking-wider';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-lg border border-border bg-background-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Edit user</h2>
            <p className="text-xs text-text-muted mt-0.5">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-text-secondary hover:bg-background-hover hover:text-text-primary transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1.5">
            <span className={labelCls}>Full Name</span>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
          </label>
          <label className="space-y-1.5">
            <span className={labelCls}>Phone</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
          </label>

          <label className="space-y-1.5">
            <span className={labelCls}>Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value)} disabled={isSelf} className={cn(inputCls, isSelf && 'opacity-60')}>
              {Object.entries(ROLE_LABELS).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
            {isSelf && <p className="text-2xs text-text-muted">You cannot change your own role</p>}
          </label>

          <label className="space-y-1.5">
            <span className={labelCls}>Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={isSelf} className={cn(inputCls, isSelf && 'opacity-60')}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </label>

          {needsClient && (
            <label className="space-y-1.5 md:col-span-2">
              <span className={labelCls}>Company (required for Client)</span>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls}>
                <option value="">Select company…</option>
                {options.clients.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
              </select>
            </label>
          )}

          {needsDriver && (
            <label className="space-y-1.5 md:col-span-2">
              <span className={labelCls}>Driver profile (required for Driver)</span>
              <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className={inputCls}>
                <option value="">Select driver…</option>
                {options.drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.fullName}{d.client ? ` — ${d.client.companyName}` : ''}</option>
                ))}
              </select>
            </label>
          )}

          {isDispatcherish && (
            <label className="space-y-1.5 md:col-span-2">
              <span className={labelCls}>Manager (team hierarchy)</span>
              <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className={inputCls}>
                <option value="">No manager</option>
                {options.managers.map((m) => (
                  <option key={m.id} value={m.id}>{m.fullName} ({ROLE_LABELS[m.role] ?? m.role})</option>
                ))}
              </select>
            </label>
          )}

          {role === 'DISPATCHER' && (
            <label className="inline-flex items-center gap-2 text-sm text-text-secondary md:col-span-2">
              <input type="checkbox" checked={isSenior} onChange={(e) => setIsSenior(e.target.checked)} className="h-4 w-4" />
              Senior dispatcher (team-wide visibility)
            </label>
          )}
        </div>

        {error && (
          <div className="mx-5 mb-2 rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
        )}

        <div className="flex justify-end gap-2 border-t border-border-subtle px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-md border border-border bg-background-secondary px-4 text-sm text-text-secondary hover:bg-background-hover hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || (needsClient && !clientId) || (needsDriver && !driverId)}
            className="h-10 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-dark transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
