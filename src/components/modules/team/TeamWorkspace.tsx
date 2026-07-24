'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable, DataTableColumn } from '@/components/ui/DataTable';
import { LiveBadge } from '@/components/realtime/LiveBadge';
import { usePolling } from '@/hooks/usePolling';
import { formatDate } from '@/lib/utils';
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

export function TeamWorkspace() {
  const searchParams = useSearchParams();
  const [role, setRole] = useState('ALL');
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { user: currentUser } = useCurrentUser();
  const { showToast } = useToast();

  useEffect(() => {
    const fromUrl = searchParams.get('role');
    if (fromUrl) setRole(fromUrl);
  }, [searchParams]);

  const { data, loading, lastUpdatedAt, refresh } = usePolling<any>(
    `/api/team${role !== 'ALL' ? `?role=${role}` : ''}`,
    { intervalMs: 20000 },
  );
  const users = data?.users ?? [];
  const canDelete = currentUser?.role != null && ['OWNER', 'ADMIN'].includes(currentUser.role);

  async function deleteUser() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/team/${deleteTarget.id}`, { method: 'DELETE' });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error ?? 'Unable to delete user');
      showToast(`"${deleteTarget.fullName}" deleted`, 'success');
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete user', 'error');
    } finally {
      setDeleting(false);
    }
  }

  const columns: DataTableColumn<any>[] = [
    { key: 'name', header: 'Name', render: (u) => u.fullName },
    { key: 'role', header: 'Role', render: (u) => ROLE_LABELS[u.role] ?? u.role },
    { key: 'email', header: 'Email', render: (u) => u.email },
    { key: 'phone', header: 'Phone', render: (u) => u.phone ?? '—' },
    { key: 'status', header: 'Status', render: (u) => (
      <span className={`badge ${u.status === 'ACTIVE' ? 'bg-success/15 text-success' : 'bg-gray-500/15 text-gray-400'}`}>{u.status}</span>
    ) },
    { key: 'since', header: 'Since', render: (u) => formatDate(u.createdAt) },
    ...(canDelete ? [{
      key: 'actions',
      header: 'Actions',
      render: (u: any) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setDeleteTarget(u); }}
          disabled={u.id === currentUser?.id}
          className="h-8 w-8 inline-flex items-center justify-center rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label={`Delete ${u.fullName}`}
          title={u.id === currentUser?.id ? 'You cannot delete your own account' : 'Delete user'}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    } as DataTableColumn<any>] : []),
  ];

  return (
    <div className="p-6 space-y-5">
      <PageHeader title="Team" subtitle="Internal users by role" actions={<LiveBadge lastUpdatedAt={lastUpdatedAt} />} />

      {canDelete && <PendingApprovals onChanged={refresh} />}

      <div className="flex flex-wrap gap-2">
        {['ALL', ...Object.keys(ROLE_LABELS)].map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border ${role === r ? 'bg-brand-muted border-brand text-brand-light' : 'border-border text-text-secondary hover:text-text-primary'}`}
          >
            {r === 'ALL' ? 'All' : ROLE_LABELS[r]}
          </button>
        ))}
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
          title="Delete user"
          message={`Delete "${deleteTarget.fullName}"? Their historical assignments (loads, clients, drivers, commissions) are kept, but they will lose access.`}
          busy={deleting}
          onConfirm={deleteUser}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
