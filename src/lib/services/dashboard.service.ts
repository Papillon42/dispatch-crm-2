// Orchestrates the whole dashboard payload. This is the only place
// that should be imported by /api/dashboard/summary and by the dashboard
// page's initial server-render — keeps Prisma query composition out of
// both the route handlers and the React components.

import { db } from '@/lib/db';
import type { AuthContext } from '@/lib/auth/rbac';
import { canScope } from '@/lib/auth/rbac';
import {
  getGrossRevenueMetric, getActiveLoadsMetric, getActiveDriversMetric,
  getAverageRpmMetric, getCashFlowMetric,
} from './metrics.service';
import { getDashboardMapData } from './map.service';
import { getRecentActivity, getIntegrations, getActiveDriversForDashboard } from './activity.service';
import type { DashboardSummary, RoleSummaryRow } from './types';

const ROLE_SUMMARY_CONFIG: Array<{ role: string; label: string; href: string }> = [
  { role: 'ADMIN', label: 'Admin / Owner', href: '/team?role=ADMIN' },
  { role: 'DISPATCHER', label: 'Dispatcher', href: '/team?role=DISPATCHER' },
  { role: 'UPDATER', label: 'Updater', href: '/team?role=UPDATER' },
  { role: 'FINANCE', label: 'Finance / Accounting', href: '/team?role=FINANCE' },
  { role: 'CLIENT', label: 'Client', href: '/clients' },
  { role: 'DRIVER', label: 'Driver', href: '/drivers' },
];

const emptySparkline = [0, 0, 0, 0, 0, 0, 0];

export function getEmptyDashboardSummary(): DashboardSummary {
  return {
    kpis: {
      grossRevenue: {
        label: 'Gross Revenue',
        period: 'This month',
        value: '$0',
        rawValue: 0,
        changeValue: 0,
        changeLabel: 'No database connection',
        trend: 'neutral',
        sparkline: emptySparkline,
      },
      activeLoads: {
        label: 'Active Loads',
        period: 'Now',
        value: 0,
        rawValue: 0,
        changeValue: 0,
        changeLabel: 'No database connection',
        trend: 'neutral',
        sparkline: emptySparkline,
      },
      activeDrivers: {
        label: 'Active Drivers',
        period: 'Now',
        value: 0,
        rawValue: 0,
        totalCount: 0,
        activePercentage: 0,
        changeValue: 0,
        changeLabel: 'No database connection',
        trend: 'neutral',
        sparkline: emptySparkline,
      },
      averageRpm: {
        label: 'Average RPM',
        period: 'This month',
        value: '$0.00',
        rawValue: 0,
        changeValue: 0,
        changeLabel: 'No database connection',
        trend: 'neutral',
        sparkline: emptySparkline,
      },
      cashFlow: {
        label: 'Cash Flow',
        period: 'This month',
        value: '$0',
        rawValue: 0,
        changeValue: 0,
        changeLabel: 'No database connection',
        trend: 'neutral',
        sparkline: emptySparkline,
      },
    },
    map: {
      routes: [],
      legend: {
        healthy: 0,
        waiting: 0,
        delayed: 0,
        problem: 0,
      },
    },
    activeDrivers: [],
    integrations: [],
    recentActivity: [],
    roleSummary: [],
  };
}

export async function getRoleSummary(): Promise<RoleSummaryRow[]> {
  const [grouped, clients, drivers] = await Promise.all([
    db.user.groupBy({ by: ['role'], _count: { _all: true } }),
    db.client.count(),
    db.driver.count(),
  ]);
  const byRole: Record<string, number> = {};
  grouped.forEach((g: any) => { byRole[g.role] = g._count._all; });

  const counts: Record<string, number> = {
    ADMIN: byRole.ADMIN ?? 0,
    DISPATCHER: (byRole.DISPATCHER ?? 0) + (byRole.SENIOR_DISPATCHER ?? 0),
    UPDATER: byRole.UPDATER ?? 0,
    FINANCE: byRole.FINANCE ?? 0,
    CLIENT: clients,
    DRIVER: drivers,
  };

  return ROLE_SUMMARY_CONFIG.map((r) => ({ ...r, count: counts[r.role] ?? 0 }));
}

export async function getDashboardSummary(ctx: AuthContext | null): Promise<DashboardSummary> {
  const canSeeTeam = ctx ? canScope(ctx.role, 'read', 'users') !== 'none' : false;

  const [
    grossRevenue, activeLoads, activeDrivers, averageRpm, cashFlow,
    map, activeDriversList, integrations, recentActivity, roleSummary,
  ] = await Promise.all([
    getGrossRevenueMetric(),
    getActiveLoadsMetric(),
    getActiveDriversMetric(),
    getAverageRpmMetric(),
    getCashFlowMetric(),
    getDashboardMapData(),
    getActiveDriversForDashboard(15),
    getIntegrations(),
    getRecentActivity(10),
    canSeeTeam ? getRoleSummary() : Promise.resolve([]),
  ]);

  return {
    kpis: { grossRevenue, activeLoads, activeDrivers, averageRpm, cashFlow },
    map,
    activeDrivers: activeDriversList,
    integrations,
    recentActivity,
    roleSummary,
  };
}
