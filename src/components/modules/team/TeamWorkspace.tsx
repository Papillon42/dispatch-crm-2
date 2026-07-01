'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable, DataTableColumn } from '@/components/ui/DataTable';
import { LiveBadge } from '@/components/realtime/LiveBadge';
import { usePolling } from '@/hooks/usePolling';
import { formatDate } from '@/lib/utils';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin / Owner',
  SENIOR_DISPATCHER: 'Senior Dispatcher',
  DISPATCHER: 'Dispatcher',
  UPDATER: 'Updater',
  RECRUITER: 'Recruiter',
  FINANCE: 'Finance',
};

export function TeamWorkspace() {
  const searchParams = useSearchParams();
  const [role, setRole] = useState('ALL');

  useEffect(() => {
    const fromUrl = searchParams.get('role');
    if (fromUrl) setRole(fromUrl);
  }, [searchParams]);

  const { data, loading, lastUpdatedAt } = usePolling<any>(
    `/api/team${role !== 'ALL' ? `?role=${role}` : ''}`,
    { intervalMs: 20000 },
  );
  const users = data?.users ?? [];

  const columns: DataTableColumn<any>[] = [
    { key: 'name', header: 'Name', render: (u) => u.fullName },
    { key: 'role', header: 'Role', render: (u) => ROLE_LABELS[u.role] ?? u.role },
    { key: 'email', header: 'Email', render: (u) => u.email },
    { key: 'phone', header: 'Phone', render: (u) => u.phone ?? '—' },
    { key: 'status', header: 'Status', render: (u) => (
      <span className={`badge ${u.status === 'ACTIVE' ? 'bg-success/15 text-success' : 'bg-gray-500/15 text-gray-400'}`}>{u.status}</span>
    ) },
    { key: 'since', header: 'Since', render: (u) => formatDate(u.createdAt) },
  ];

  return (
    <div className="p-6 space-y-5">
      <PageHeader title="Team" subtitle="Internal users by role" actions={<LiveBadge lastUpdatedAt={lastUpdatedAt} />} />

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
    </div>
  );
}
