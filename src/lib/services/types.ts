// Shared response shapes for the Dashboard service layer + API routes.
// Keeping these in one place means the UI, the API routes, and the
// service functions all agree on the same contract.

export type Trend = 'up' | 'down' | 'neutral';

export interface Metric {
  label: string;
  period: string;
  value: string | number;
  rawValue: number;
  changeValue?: number;
  changeLabel?: string;
  trend: Trend;
  sparkline: number[];
}

export interface DashboardKpis {
  grossRevenue: Metric;
  activeLoads: Metric;
  activeDrivers: Metric & { totalCount: number; activePercentage: number };
  averageRpm: Metric;
  cashFlow: Metric;
}

export type RouteStatus = 'IN_TRANSIT' | 'LOADING' | 'UNLOADING' | 'WAITING' | 'IDLE' | 'PROBLEM';

export interface MapRoute {
  id: string;
  loadId: string;
  loadCode: string;
  driverId: string;
  driverName: string;
  driverAvatar?: string | null;
  status: RouteStatus;
  pickup: { city: string | null; state: string | null; lat: number | null; lng: number | null };
  delivery: { city: string | null; state: string | null; lat: number | null; lng: number | null };
  currentLocation: { lat: number; lng: number; updatedAt: string } | null;
  routeLine?: Array<{ lat: number; lng: number }>;
  rate: number;
  eta: string | null;
  etaLabel: string | null;
}

export interface MapLegend {
  inTransit: number;
  loadingUnloading: number;
  waiting: number;
  idle: number;
}

export interface DashboardMapData {
  routes: MapRoute[];
  legend: MapLegend;
}

export interface ActiveDriverRow {
  id: string;
  name: string;
  avatar?: string | null;
  currentLoadId?: string | null;
  loadNumber?: string | null;
  route: string;
  lastUpdate: string;
  status: RouteStatus | 'AVAILABLE';
}

export interface IntegrationRow {
  id: string;
  type: string;
  name: string;
  status: string;
  isConnected: boolean;
  lastSyncAt: string | null;
}

export interface ActivityRow {
  id: string;
  title: string;
  description: string | null;
  entityType: string;
  action: string;
  createdAt: string;
}

export interface RoleSummaryRow {
  role: string;
  label: string;
  count: number;
  href: string;
}

export interface DashboardSummary {
  kpis: DashboardKpis;
  map: DashboardMapData;
  activeDrivers: ActiveDriverRow[];
  integrations: IntegrationRow[];
  recentActivity: ActivityRow[];
  roleSummary: RoleSummaryRow[];
}
