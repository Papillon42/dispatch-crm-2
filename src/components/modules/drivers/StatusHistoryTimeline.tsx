'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, Bot, History, UserRound } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { DriverStatusBadge } from '@/components/ui/StatusBadge';
import type { DriverStatusConfigRow } from '@/hooks/useDriverStatuses';

interface HistoryEntry {
  id: string;
  previousStatus: string | null;
  newStatus: string;
  comment: string | null;
  reason: string | null;
  isManualOverride: boolean;
  isAutomatic: boolean;
  source: string;
  durationSeconds: number | null;
  changedAt: string;
  originAddress: string | null;
  destinationAddress: string | null;
  currentLat: number | null;
  currentLng: number | null;
  changedBy: { id: string; fullName: string; role: string } | null;
  load: { id: string; loadCode: string } | null;
  truck: { id: string; truckNumber: string } | null;
}

function formatDuration(seconds: number | null): string | null {
  if (seconds == null) return null;
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export function StatusHistoryTimeline({
  driverId,
  statuses,
  refreshKey,
}: {
  driverId: string;
  statuses: DriverStatusConfigRow[];
  refreshKey?: number;
}) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/drivers/${driverId}/status-history?limit=100`, { cache: 'no-store' });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error ?? 'Unable to load history');
      setEntries(payload.entries);
      setTotal(payload.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load history');
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-md bg-background-hover animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-4 flex items-center gap-2 rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
        <AlertTriangle className="h-4 w-4" />
        <span>{error}</span>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="py-12 text-center">
        <History className="h-8 w-8 text-text-muted mx-auto mb-3" />
        <p className="text-sm font-medium text-text-primary">No status changes yet</p>
        <p className="text-sm text-text-secondary mt-1">Every status change will appear here as a timeline.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <p className="text-xs text-text-muted mb-4">{total} change{total === 1 ? '' : 's'} · history is append-only and cannot be deleted</p>
      <ol className="relative border-l border-border-subtle ml-2 space-y-5">
        {entries.map((entry) => (
          <li key={entry.id} className="ml-5">
            <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border border-background bg-brand" />
            <div className="flex flex-wrap items-center gap-2">
              {entry.previousStatus
                ? <DriverStatusBadge status={entry.previousStatus} configs={statuses} />
                : <span className="text-xs text-text-muted">—</span>}
              <ArrowRight className="h-3.5 w-3.5 text-text-muted" />
              <DriverStatusBadge status={entry.newStatus} configs={statuses} />
              {entry.isManualOverride && (
                <span className="badge bg-amber-500/15 text-amber-400 border border-amber-500/25">Manual override</span>
              )}
              {entry.isAutomatic && (
                <span className="badge bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 inline-flex items-center gap-1">
                  <Bot className="h-3 w-3" /> Auto
                </span>
              )}
              <span className="text-xs text-text-muted ml-auto">{formatDateTime(entry.changedAt)}</span>
            </div>

            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
              <span className="inline-flex items-center gap-1">
                <UserRound className="h-3 w-3 text-text-muted" />
                {entry.changedBy?.fullName ?? (entry.isAutomatic ? 'System (GPS)' : entry.source)}
              </span>
              {entry.load && <span>Load {entry.load.loadCode}</span>}
              {entry.truck && <span>Truck {entry.truck.truckNumber}</span>}
              {entry.currentLat != null && entry.currentLng != null && (
                <span>{entry.currentLat.toFixed(3)}, {entry.currentLng.toFixed(3)}</span>
              )}
              {formatDuration(entry.durationSeconds) && (
                <span className="text-text-muted">in previous status: {formatDuration(entry.durationSeconds)}</span>
              )}
            </div>

            {(entry.originAddress || entry.destinationAddress) && (
              <p className="mt-1 text-xs text-text-muted">
                {[entry.originAddress, entry.destinationAddress].filter(Boolean).join(' → ')}
              </p>
            )}
            {(entry.comment || entry.reason) && (
              <p className="mt-1 text-sm text-text-secondary">
                {entry.comment}
                {entry.reason && <span className="text-amber-300/90"> {entry.comment ? '· ' : ''}Reason: {entry.reason}</span>}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
