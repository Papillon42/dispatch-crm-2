'use client';

import { useState } from 'react';
import {
  AlertTriangle, DollarSign, Package, UserCheck, TrendingUp, Wallet2,
} from 'lucide-react';
import { usePolling } from '@/hooks/usePolling';
import { KpiCard } from '@/components/ui/KpiCard';
import { FleetOverviewMap } from './FleetOverviewMap';
import { SelectedRoutePreview } from './SelectedRoutePreview';
import { ActiveDriversCard } from './ActiveDriversCard';
import { IntegrationsCard } from './IntegrationsCard';
import { RecentActivityCard } from './RecentActivityCard';
import { RoleCards } from './RoleCards';
import type { DashboardSummary } from '@/lib/services/types';

export function DashboardClient({
  initialData,
  databaseWarning,
}: {
  initialData: DashboardSummary;
  databaseWarning?: string;
}) {
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const { data, loading, lastUpdatedAt } = usePolling<DashboardSummary>('/api/dashboard/summary', {
    intervalMs: 15000,
  });

  const summary = data ?? initialData;
  const secondsAgo = lastUpdatedAt ? Math.floor((Date.now() - lastUpdatedAt.getTime()) / 1000) : null;
  const selectedRoute = summary.map.routes.find((r) => r.id === selectedRouteId) ?? null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">Real-time operations overview</p>
        </div>
        <div className="flex items-center gap-2 text-2xs text-text-muted">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <span className="font-medium text-success">Live updates</span>
          {secondsAgo !== null && <span>· updated {secondsAgo}s ago</span>}
        </div>
      </div>

      {databaseWarning && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
            <div>
              <p className="text-sm font-medium text-text-primary">Database connection interrupted</p>
              <p className="mt-0.5 text-xs text-text-secondary">{databaseWarning}</p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Row — 5 cards, values computed server-side from Prisma via /api/dashboard/summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <KpiCard
          label={summary.kpis.grossRevenue.label}
          period={summary.kpis.grossRevenue.period}
          value={summary.kpis.grossRevenue.value}
          delta={summary.kpis.grossRevenue.changeValue}
          deltaLabel={summary.kpis.grossRevenue.changeLabel}
          direction={summary.kpis.grossRevenue.trend}
          trend={summary.kpis.grossRevenue.sparkline}
          icon={<DollarSign className="w-4 h-4 text-brand-light" />}
          iconColor="bg-brand-muted"
          showMenu
          loading={loading && !data}
        />
        <KpiCard
          label={summary.kpis.activeLoads.label}
          period={summary.kpis.activeLoads.period}
          value={summary.kpis.activeLoads.value}
          delta={summary.kpis.activeLoads.changeValue}
          deltaLabel={summary.kpis.activeLoads.changeLabel}
          direction={summary.kpis.activeLoads.trend}
          trend={summary.kpis.activeLoads.sparkline}
          icon={<Package className="w-4 h-4 text-emerald-400" />}
          iconColor="bg-emerald-500/15"
          trendColor="#34d399"
          showMenu
          loading={loading && !data}
        />
        <KpiCard
          label={summary.kpis.activeDrivers.label}
          period={summary.kpis.activeDrivers.period}
          value={summary.kpis.activeDrivers.value}
          delta={summary.kpis.activeDrivers.changeValue}
          deltaLabel={summary.kpis.activeDrivers.changeLabel}
          direction="neutral"
          trend={summary.kpis.activeDrivers.sparkline}
          icon={<UserCheck className="w-4 h-4 text-cyan-400" />}
          iconColor="bg-cyan-500/15"
          trendColor="#22d3ee"
          showMenu
          loading={loading && !data}
        />
        <KpiCard
          label={summary.kpis.averageRpm.label}
          period={summary.kpis.averageRpm.period}
          value={summary.kpis.averageRpm.value}
          delta={summary.kpis.averageRpm.changeValue}
          deltaLabel={summary.kpis.averageRpm.changeLabel}
          direction={summary.kpis.averageRpm.trend}
          trend={summary.kpis.averageRpm.sparkline}
          icon={<TrendingUp className="w-4 h-4 text-violet-400" />}
          iconColor="bg-violet-500/15"
          trendColor="#a78bfa"
          showMenu
          loading={loading && !data}
        />
        <KpiCard
          label={summary.kpis.cashFlow.label}
          period={summary.kpis.cashFlow.period}
          value={summary.kpis.cashFlow.value}
          delta={summary.kpis.cashFlow.changeValue}
          deltaLabel={summary.kpis.cashFlow.changeLabel}
          direction={summary.kpis.cashFlow.trend}
          trend={summary.kpis.cashFlow.sparkline}
          icon={<Wallet2 className="w-4 h-4 text-amber-400" />}
          iconColor="bg-amber-500/15"
          trendColor="#fbbf24"
          showMenu
          loading={loading && !data}
        />
      </div>

      {/* Map + Active Drivers */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-background-card border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">Fleet Map</h2>
              <span className="flex items-center gap-1.5 text-2xs text-success font-medium">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                </span>
                Live
              </span>
            </div>
            <FleetOverviewMap
              routes={summary.map.routes}
              legend={summary.map.legend}
              selectedId={selectedRouteId}
              onSelect={setSelectedRouteId}
              loading={loading && !data}
            />
          </div>

          <div className="bg-background-card border border-border rounded-lg min-h-[120px]">
            <SelectedRoutePreview route={selectedRoute} onClear={() => setSelectedRouteId(null)} />
          </div>
        </div>

        <ActiveDriversCard drivers={summary.activeDrivers} />
      </div>

      {/* Integrations + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <IntegrationsCard integrations={summary.integrations} />
        <RecentActivityCard activity={summary.recentActivity} />
      </div>

      {/* Role summary */}
      <RoleCards roles={summary.roleSummary} />
    </div>
  );
}
