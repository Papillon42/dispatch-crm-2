'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Search, SlidersHorizontal, RefreshCw, Plus, FileText,
  DollarSign, Package, TrendingUp, Gauge, AlertTriangle,
} from 'lucide-react';
import { KpiCard } from '@/components/ui/KpiCard';
import { LoadStatusBadge } from '@/components/ui/StatusBadge';
import { LiveBadge } from '@/components/realtime/LiveBadge';
import { usePolling } from '@/hooks/usePolling';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import { LoadDetailPanel } from './LoadDetailPanel';

const FUNNEL_LABELS: Record<string, string> = {
  NEW_LEAD: 'New Lead',
  NEGOTIATING: 'Negotiating',
  BOOKED: 'Booked',
  ASSIGNED: 'Assigned',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  INVOICED: 'Invoiced',
};

const FUNNEL_COLORS: Record<string, string> = {
  NEW_LEAD: 'border-purple-500/40 text-purple-300',
  NEGOTIATING: 'border-violet-500/40 text-violet-300',
  BOOKED: 'border-blue-500/40 text-blue-300',
  ASSIGNED: 'border-sky-500/40 text-sky-300',
  IN_TRANSIT: 'border-emerald-500/40 text-emerald-300',
  DELIVERED: 'border-green-500/40 text-green-300',
  INVOICED: 'border-yellow-500/40 text-yellow-300',
};

const STATUS_OPTIONS = [
  'ALL', 'NEW_LEAD', 'NEGOTIATING', 'BOOKED', 'RATE_CONFIRMATION_RECEIVED', 'ASSIGNED',
  'EN_ROUTE_TO_PICKUP', 'AT_PICKUP', 'LOADED', 'IN_TRANSIT', 'AT_DELIVERY', 'DELIVERED',
  'POD_UPLOADED', 'INVOICED', 'PAID', 'CLOSED', 'CANCELLED', 'PROBLEM',
];

export function LoadsWorkspace() {
  const [loads, setLoads] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const limit = 25;

  const { data: summary, lastUpdatedAt: summaryUpdatedAt } = usePolling<any>('/api/loads/summary', { intervalMs: 12000 });

  const fetchLoads = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (status !== 'ALL') params.set('status', status);
    fetch(`/api/loads?${params.toString()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        setLoads(data.loads ?? []);
        setTotal(data.total ?? 0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(fetchLoads, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, status]);

  // Light polling so the table reflects updater/driver changes without manual refresh
  useEffect(() => {
    const interval = setInterval(fetchLoads, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, status]);

  const pages = Math.max(1, Math.ceil(total / limit));
  const maxFunnelSum = useMemo(() => {
    if (!summary?.funnel) return 1;
    return Math.max(...summary.funnel.map((f: any) => f.count), 1);
  }, [summary]);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Loads</h1>
          <p className="text-sm text-text-secondary mt-1">Manage loads and track real-time status</p>
        </div>
        <div className="flex items-center gap-3">
          <LiveBadge lastUpdatedAt={summaryUpdatedAt} />
          <button className="flex items-center gap-2 px-4 py-2 rounded-md bg-brand hover:bg-brand-dark text-white text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Create Load
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Booked Today"
          value={formatCurrency(summary?.kpi?.bookedTodayAmount ?? 0)}
          icon={<DollarSign className="w-4 h-4 text-brand-light" />}
          delta={14.6}
        />
        <KpiCard
          label="Active Loads"
          value={summary?.kpi?.activeLoads ?? 0}
          icon={<Package className="w-4 h-4 text-emerald-400" />}
          iconColor="bg-emerald-500/15"
          delta={8.7}
        />
        <KpiCard
          label="Avg Rate"
          value={formatCurrency((summary?.kpi?.bookedTodayAmount ?? 0) / Math.max(summary?.kpi?.bookedTodayCount ?? 1, 1))}
          suffix="/load"
          icon={<TrendingUp className="w-4 h-4 text-violet-400" />}
          iconColor="bg-violet-500/15"
          delta={3.5}
        />
        <KpiCard
          label="Avg RPM"
          value={`$${(summary?.kpi?.avgRpm ?? 0).toFixed(2)}`}
          suffix="/mi"
          icon={<Gauge className="w-4 h-4 text-cyan-400" />}
          iconColor="bg-cyan-500/15"
          delta={2.8}
        />
        <KpiCard
          label="Overdue Loads"
          value={summary?.kpi?.overdueLoads ?? 0}
          icon={<AlertTriangle className="w-4 h-4 text-red-400" />}
          iconColor="bg-red-500/15"
          delta={summary?.kpi?.overdueLoads > 0 ? summary.kpi.overdueLoads : 0}
          deltaLabel="vs yesterday"
        />
      </div>

      {/* Funnel */}
      <div className="grid grid-cols-4 lg:grid-cols-7 gap-3">
        {(summary?.funnel ?? Object.keys(FUNNEL_LABELS).map((status) => ({ status, count: 0, sum: 0 }))).map((stage: any) => (
          <button
            key={stage.status}
            onClick={() => setStatus(stage.status)}
            className={cn(
              'bg-background-card border rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-background-hover',
              status === stage.status ? FUNNEL_COLORS[stage.status] : 'border-border',
            )}
          >
            <p className="text-2xs text-text-muted truncate">{FUNNEL_LABELS[stage.status]}</p>
            <p className="text-lg font-bold text-text-primary">{stage.count}</p>
            <p className="text-2xs text-text-muted">{formatCurrency(stage.sum)}</p>
            <div className="h-1 mt-1.5 bg-background-hover rounded-full overflow-hidden">
              <div
                className="h-full bg-brand transition-all duration-500"
                style={{ width: `${Math.max((stage.count / maxFunnelSum) * 100, 4)}%` }}
              />
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-background-card border border-border rounded-lg px-4 py-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            placeholder="Search by ID, broker, client, driver…"
            className="w-full pl-9 pr-3 py-2 rounded-md bg-background-hover border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setPage(1); setStatus(e.target.value); }}
          className="px-3 py-2 rounded-md bg-background-hover border border-border text-sm text-text-primary"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s.replaceAll('_', ' ')}</option>
          ))}
        </select>
        <button
          onClick={() => { setStatus('ALL'); setSearch(''); setPage(1); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md text-text-secondary hover:text-text-primary text-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reset
        </button>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-text-secondary hover:text-text-primary text-sm">
          <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
        </button>
      </div>

      {/* Table + panel */}
      <div className="flex gap-4 items-start">
        <div className="flex-1 bg-background-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th>Load ID</th>
                  <th>Broker</th>
                  <th>Client</th>
                  <th>Driver</th>
                  <th>Pickup</th>
                  <th>Delivery</th>
                  <th>Rate</th>
                  <th>Miles</th>
                  <th>RPM</th>
                  <th>Status</th>
                  <th>Docs</th>
                  <th>Dispatcher</th>
                </tr>
              </thead>
              <tbody>
                {loading && loads.length === 0 && (
                  <tr><td colSpan={12} className="text-center py-8 text-text-muted">Loading loads…</td></tr>
                )}
                {!loading && loads.length === 0 && (
                  <tr><td colSpan={12} className="text-center py-8 text-text-muted">No loads match your filters.</td></tr>
                )}
                {loads.map((load) => (
                  <tr
                    key={load.id}
                    onClick={() => setSelectedId(load.id)}
                    className={cn('cursor-pointer', selectedId === load.id && 'bg-background-hover')}
                  >
                    <td className="font-medium text-brand-light">{load.loadCode}</td>
                    <td>{load.broker?.name ?? '—'}</td>
                    <td>{load.client?.companyName ?? '—'}</td>
                    <td>{load.driver?.fullName ?? '—'}</td>
                    <td>{load.pickupCity ? `${load.pickupCity}, ${load.pickupState}` : '—'}</td>
                    <td>{load.deliveryCity ? `${load.deliveryCity}, ${load.deliveryState}` : '—'}</td>
                    <td>{formatCurrency(load.rate)}</td>
                    <td>{formatNumber(load.totalMiles)}</td>
                    <td>{load.rpm ? `$${load.rpm.toFixed(2)}` : '—'}</td>
                    <td><LoadStatusBadge status={load.status} /></td>
                    <td>
                      <span className="flex items-center gap-1 text-2xs text-text-muted">
                        <FileText className="w-3 h-3" /> {load._count?.documents ?? 0}/3
                      </span>
                    </td>
                    <td>{load.dispatcher?.fullName ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle text-sm text-text-secondary">
            <span>Showing {loads.length ? (page - 1) * limit + 1 : 0}–{(page - 1) * limit + loads.length} of {total}</span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-md hover:bg-background-hover disabled:opacity-40"
              >
                Prev
              </button>
              <span className="px-2">{page} / {pages}</span>
              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                className="px-2.5 py-1 rounded-md hover:bg-background-hover disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {selectedId && (
          <LoadDetailPanel
            loadId={selectedId}
            onClose={() => setSelectedId(null)}
            onChanged={fetchLoads}
          />
        )}
      </div>
    </div>
  );
}
