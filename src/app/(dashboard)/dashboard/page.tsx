import { Suspense } from 'react';
import { db } from '@/lib/db';
import { getAuthContext } from '@/lib/auth/rbac';
import { KpiCard } from '@/components/ui/KpiCard';
import { DashboardMap } from '@/components/modules/dashboard/DashboardMap';
import { ActiveDriversList } from '@/components/modules/dashboard/ActiveDriversList';
import { IntegrationStatus } from '@/components/modules/dashboard/IntegrationStatus';
import { LoadStatusFunnel } from '@/components/modules/dashboard/LoadStatusFunnel';
import { formatCurrency, formatRpm } from '@/lib/utils';
import {
  DollarSign, Truck, Package, TrendingUp,
  AlertTriangle, Users,
} from 'lucide-react';

async function getDashboardData() {
  const [
    activeLoads, activeTrucks, totalClients,
    problemLoads, recentLoads, activeDrivers,
  ] = await Promise.all([
    db.load.count({ where: { status: { notIn: ['CLOSED', 'CANCELLED', 'PAID'] } } }),
    db.truck.count({ where: { maintenanceStatus: { notIn: ['IN_PROGRESS', 'OVERDUE'] } } }),
    db.client.count({ where: { status: 'ACTIVE' } }),
    db.load.count({ where: { status: 'PROBLEM' } }),
    db.load.findMany({
      where: { status: { notIn: ['CLOSED', 'CANCELLED'] } },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      select: { rate: true, totalMiles: true, status: true, createdAt: true },
    }),
    db.driver.findMany({
      where: { status: { in: ['AVAILABLE', 'ON_LOAD'] } },
      take: 20,
      include: {
        currentTruck: { select: { truckNumber: true } },
        locationUpdates: { orderBy: { at: 'desc' }, take: 1 },
      },
    }),
  ]);

  const grossTotal = recentLoads.reduce((sum, l) => sum + l.rate, 0);
  const totalMiles = recentLoads.reduce((sum, l) => sum + l.totalMiles, 0);
  const avgRpm = totalMiles > 0 ? grossTotal / totalMiles : 0;

  return { activeLoads, activeTrucks, totalClients, problemLoads, grossTotal, avgRpm, activeDrivers };
}

export default async function DashboardPage() {
  const ctx = await getAuthContext();
  const data = await getDashboardData();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Operations Overview</h1>
        <p className="text-sm text-text-secondary mt-1">Real-time view of your dispatch operations</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          label="Gross Revenue"
          value={formatCurrency(data.grossTotal)}
          icon={<DollarSign className="w-4 h-4 text-brand-light" />}
          iconColor="bg-brand-muted"
        />
        <KpiCard
          label="Active Loads"
          value={data.activeLoads}
          icon={<Package className="w-4 h-4 text-emerald-400" />}
          iconColor="bg-emerald-500/15"
        />
        <KpiCard
          label="Active Trucks"
          value={data.activeTrucks}
          icon={<Truck className="w-4 h-4 text-cyan-400" />}
          iconColor="bg-cyan-500/15"
        />
        <KpiCard
          label="Avg RPM"
          value={formatRpm(data.avgRpm)}
          icon={<TrendingUp className="w-4 h-4 text-violet-400" />}
          iconColor="bg-violet-500/15"
        />
        <KpiCard
          label="Clients"
          value={data.totalClients}
          icon={<Users className="w-4 h-4 text-amber-400" />}
          iconColor="bg-amber-500/15"
        />
        <KpiCard
          label="Problems"
          value={data.problemLoads}
          icon={<AlertTriangle className="w-4 h-4 text-red-400" />}
          iconColor="bg-red-500/15"
        />
      </div>

      {/* Load Funnel */}
      <Suspense fallback={<div className="h-20 bg-background-card rounded-lg animate-pulse" />}>
        <LoadStatusFunnel />
      </Suspense>

      {/* Map + Drivers side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-background-card border border-border rounded-lg overflow-hidden h-[420px]">
          <div className="px-4 py-3 border-b border-border-subtle">
            <h2 className="text-sm font-semibold text-text-primary">Fleet Map</h2>
          </div>
          <DashboardMap />
        </div>

        <div className="bg-background-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border-subtle">
            <h2 className="text-sm font-semibold text-text-primary">Active Drivers</h2>
          </div>
          <ActiveDriversList drivers={data.activeDrivers as any} />
        </div>
      </div>

      {/* Integration status */}
      <IntegrationStatus />
    </div>
  );
}
