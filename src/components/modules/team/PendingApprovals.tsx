'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Clock, UserPlus, X } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import { useToast } from '@/components/providers/ToastProvider';
import { useRealtime } from '@/hooks/useRealtime';

interface PendingUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  requestedRole: string | null;
  roleRequestNote: string | null;
  createdAt: string;
}

interface PendingResponse {
  pending: PendingUser[];
  clients: Array<{ id: string; companyName: string }>;
  drivers: Array<{ id: string; fullName: string; client: { companyName: string } | null }>;
}

const GRANTABLE_ROLES = ['OWNER', 'SENIOR_DISPATCHER', 'DISPATCHER', 'UPDATER', 'RECRUITER', 'FINANCE', 'CLIENT', 'DRIVER'];

export function PendingApprovals({ onChanged }: { onChanged?: () => void }) {
  const [data, setData] = useState<PendingResponse | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [roleById, setRoleById] = useState<Record<string, string>>({});
  const [clientById, setClientById] = useState<Record<string, string>>({});
  const [driverById, setDriverById] = useState<Record<string, string>>({});
  const [rejectTarget, setRejectTarget] = useState<PendingUser | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const { showToast } = useToast();

  const load = useCallback(async () => {
    const res = await fetch('/api/team/pending', { cache: 'no-store' });
    if (!res.ok) return; // non-owner: section simply stays hidden
    const payload = (await res.json()) as PendingResponse;
    setData(payload);
    setRoleById((current) => {
      const next = { ...current };
      payload.pending.forEach((u) => {
        if (!next[u.id]) next[u.id] = u.requestedRole ?? 'DISPATCHER';
      });
      return next;
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtime({
    events: ['user.registration.requested', 'user.registration.approved', 'user.registration.rejected'],
    onEvent: () => void load(),
  });

  async function approve(user: PendingUser) {
    const role = roleById[user.id];
    setBusyId(user.id);
    try {
      const res = await fetch(`/api/team/${user.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          clientId: role === 'CLIENT' ? clientById[user.id] || null : null,
          driverId: role === 'DRIVER' ? driverById[user.id] || null : null,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error ?? 'Unable to approve');
      showToast(`${user.fullName} approved as ${role}`, 'success');
      await load();
      onChanged?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to approve', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function reject() {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    try {
      const res = await fetch(`/api/team/${rejectTarget.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason.trim() || 'Rejected by the Owner' }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error ?? 'Unable to reject');
      showToast(`${rejectTarget.fullName} rejected`, 'info');
      setRejectTarget(null);
      setRejectReason('');
      await load();
      onChanged?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to reject', 'error');
    } finally {
      setBusyId(null);
    }
  }

  if (!data || data.pending.length === 0) return null;

  const selectCls = 'h-9 rounded-md border border-border bg-background-secondary px-2 text-xs text-text-primary outline-none focus:border-border-focus';

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 overflow-hidden">
      <div className="px-4 py-3 border-b border-amber-500/20 flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-amber-400" />
        <h2 className="text-sm font-semibold text-text-primary">
          Pending registrations
          <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500/20 px-1.5 text-xs text-amber-300">
            {data.pending.length}
          </span>
        </h2>
        <p className="text-xs text-text-muted ml-auto">Only the Owner can grant roles</p>
      </div>

      <div className="divide-y divide-border-subtle">
        {data.pending.map((user) => {
          const role = roleById[user.id] ?? 'DISPATCHER';
          const needsClient = role === 'CLIENT';
          const needsDriver = role === 'DRIVER';
          const bindingMissing = (needsClient && !clientById[user.id]) || (needsDriver && !driverById[user.id]);

          return (
            <div key={user.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
              <div className="min-w-[220px]">
                <p className="text-sm font-medium text-text-primary">{user.fullName}</p>
                <p className="text-xs text-text-muted">{user.email}{user.phone ? ` · ${user.phone}` : ''}</p>
                {user.roleRequestNote && <p className="text-xs text-text-secondary mt-1">{user.roleRequestNote}</p>}
              </div>

              <span className="inline-flex items-center gap-1 text-xs text-amber-300">
                <Clock className="h-3.5 w-3.5" />
                requested {user.requestedRole ?? '—'} · {timeAgo(user.createdAt)}
              </span>

              <div className="flex items-center gap-2 ml-auto">
                <select
                  value={role}
                  onChange={(e) => setRoleById({ ...roleById, [user.id]: e.target.value })}
                  className={selectCls}
                >
                  {GRANTABLE_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>

                {needsClient && (
                  <select
                    value={clientById[user.id] ?? ''}
                    onChange={(e) => setClientById({ ...clientById, [user.id]: e.target.value })}
                    className={selectCls}
                  >
                    <option value="">Select company…</option>
                    {data.clients.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                  </select>
                )}

                {needsDriver && (
                  <select
                    value={driverById[user.id] ?? ''}
                    onChange={(e) => setDriverById({ ...driverById, [user.id]: e.target.value })}
                    className={selectCls}
                  >
                    <option value="">Select driver profile…</option>
                    {data.drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.fullName}{d.client ? ` — ${d.client.companyName}` : ''}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => void approve(user)}
                  disabled={busyId === user.id || bindingMissing}
                  className={cn(
                    'h-9 inline-flex items-center gap-1.5 rounded-md px-3 text-xs font-medium text-white transition-colors',
                    'bg-success hover:bg-success/80 disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                >
                  <Check className="h-3.5 w-3.5" /> Approve
                </button>
                <button
                  type="button"
                  onClick={() => setRejectTarget(user)}
                  disabled={busyId === user.id}
                  className="h-9 inline-flex items-center gap-1.5 rounded-md border border-border px-3 text-xs text-text-secondary hover:text-danger hover:border-danger/40 transition-colors"
                >
                  <X className="h-3.5 w-3.5" /> Reject
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-background-card p-5">
            <h3 className="text-base font-semibold text-text-primary">Reject registration</h3>
            <p className="text-sm text-text-secondary mt-1">{rejectTarget.fullName} · {rejectTarget.email}</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Reason (the person will see it)"
              className="mt-3 w-full rounded-md border border-border bg-background-secondary py-2 px-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-border-focus"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setRejectTarget(null); setRejectReason(''); }}
                className="h-9 rounded-md border border-border bg-background-secondary px-3 text-sm text-text-secondary hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void reject()}
                disabled={busyId === rejectTarget.id}
                className="h-9 rounded-md bg-danger px-3 text-sm font-medium text-white hover:bg-danger/80 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
