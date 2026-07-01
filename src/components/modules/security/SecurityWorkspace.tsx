'use client';

import { useState } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { usePolling } from '@/hooks/usePolling';
import { LiveBadge } from '@/components/realtime/LiveBadge';
import { timeAgo } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function SecurityWorkspace() {
  const { data: auditData, lastUpdatedAt } = usePolling<any>('/api/audit-log?limit=40', { intervalMs: 15000 });
  const { data: exportData, refresh: refreshExports } = usePolling<any>('/api/export-requests', { intervalMs: 15000 });

  const logs = auditData?.logs ?? [];
  const requests = exportData?.requests ?? [];

  async function decide(id: string, decision: 'APPROVED' | 'REJECTED') {
    await fetch(`/api/export-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    });
    refreshExports();
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Security &amp; Access</h1>
          <p className="text-sm text-text-secondary mt-1">Audit log, export approvals, and access control (§13)</p>
        </div>
        <LiveBadge lastUpdatedAt={lastUpdatedAt} />
      </div>

      <div className="bg-background-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-brand-light" />
          <h3 className="text-sm font-semibold text-text-primary">Export Approval Queue</h3>
        </div>
        <div className="divide-y divide-border-subtle">
          {requests.length === 0 && <p className="p-4 text-sm text-text-muted">No export requests.</p>}
          {requests.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm text-text-primary">{r.scope} export requested by {r.requestedBy?.fullName}</p>
                <p className="text-2xs text-text-muted">{timeAgo(r.at)} {r.reason ? `· ${r.reason}` : ''}</p>
              </div>
              {r.status === 'PENDING' ? (
                <div className="flex gap-2">
                  <button onClick={() => decide(r.id, 'APPROVED')} className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-success/15 text-success text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button onClick={() => decide(r.id, 'REJECTED')} className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-danger/15 text-danger text-xs font-medium">
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              ) : (
                <span className={cn('badge', r.status === 'APPROVED' ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger')}>{r.status}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-background-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-light" />
          <h3 className="text-sm font-semibold text-text-primary">Audit Log</h3>
        </div>
        <table className="w-full data-table">
          <thead>
            <tr className="border-b border-border-subtle"><th>Actor</th><th>Action</th><th>Entity</th><th>When</th></tr>
          </thead>
          <tbody>
            {logs.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-text-muted">No audit entries yet.</td></tr>}
            {logs.map((log: any) => (
              <tr key={log.id}>
                <td>{log.actor?.fullName ?? 'System'}</td>
                <td className="capitalize">{log.action.replaceAll('_', ' ')}</td>
                <td>{log.entityType}</td>
                <td>{timeAgo(log.at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
