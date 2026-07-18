'use client';

import { OpenLayersUsaMap, type OpenLayersMarker, type OpenLayersRouteArc } from '@/components/modules/map/OpenLayersUsaMap';
import type { MapRoute, MapLegend } from '@/lib/services/types';

const LEGEND_CONFIG: Array<{ key: keyof MapLegend; label: string; dot: string }> = [
  { key: 'healthy', label: 'Healthy', dot: 'bg-[#22c55e]' },
  { key: 'waiting', label: 'Waiting', dot: 'bg-[#8b5cf6]' },
  { key: 'delayed', label: 'Delayed', dot: 'bg-[#facc15]' },
  { key: 'problem', label: 'Problem', dot: 'bg-[#ef4444]' },
];

type RouteHealth = 'healthy' | 'waiting' | 'delayed' | 'problem';

const HEALTH_COLORS: Record<RouteHealth, string[]> = {
  healthy: ['#22c55e', '#16a34a', '#4ade80', '#15803d', '#86efac'],
  waiting: ['#8b5cf6', '#7c3aed', '#a78bfa', '#6d28d9', '#c4b5fd'],
  delayed: ['#facc15', '#eab308', '#f59e0b', '#fde047', '#ca8a04'],
  problem: ['#ef4444', '#dc2626', '#f87171', '#b91c1c', '#fb7185'],
};

function routeHealth(route: MapRoute): RouteHealth {
  if (route.status === 'IN_TRANSIT') return 'healthy';
  if (route.status === 'WAITING') return 'waiting';
  if (route.status === 'PROBLEM' || route.status === 'IDLE') return 'problem';
  return 'delayed';
}

function orientation(a: { lat: number; lng: number }, b: { lat: number; lng: number }, c: { lat: number; lng: number }) {
  return (b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng);
}

function routeIntersects(a: MapRoute, b: MapRoute) {
  if (!a.routeLine || !b.routeLine || a.routeLine.length < 2 || b.routeLine.length < 2) return false;
  const aStart = a.routeLine[0];
  const aEnd = a.routeLine[a.routeLine.length - 1];
  const bStart = b.routeLine[0];
  const bEnd = b.routeLine[b.routeLine.length - 1];
  const o1 = orientation(aStart, aEnd, bStart);
  const o2 = orientation(aStart, aEnd, bEnd);
  const o3 = orientation(bStart, bEnd, aStart);
  const o4 = orientation(bStart, bEnd, aEnd);

  return o1 * o2 < 0 && o3 * o4 < 0;
}

function buildRouteColorMap(routes: MapRoute[]) {
  const colorByRoute = new Map<string, string>();
  routes.forEach((route) => {
    const health = routeHealth(route);
    const palette = HEALTH_COLORS[health];
    const blockedColors = new Set<string>();
    routes.forEach((previous) => {
      if (previous.id !== route.id && routeHealth(previous) === health && routeIntersects(route, previous)) {
        const color = colorByRoute.get(previous.id);
        if (color) blockedColors.add(color);
      }
    });

    const color = palette.find((candidate) => !blockedColors.has(candidate)) ?? palette[0];
    colorByRoute.set(route.id, color);
  });
  return colorByRoute;
}

interface FleetOverviewMapProps {
  routes: MapRoute[];
  legend: MapLegend;
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
}

export function FleetOverviewMap({ routes, legend, selectedId, onSelect, loading }: FleetOverviewMapProps) {
  const colorByRoute = buildRouteColorMap(routes);
  const markers: OpenLayersMarker[] = routes
    .filter((r) => r.currentLocation)
    .map((r) => ({
      id: r.id,
      label: r.driverName,
      subtitle: `${r.loadCode} · ${r.pickup.city ?? '—'} → ${r.delivery.city ?? '—'}`,
      lat: r.currentLocation!.lat,
      lng: r.currentLocation!.lng,
      status: r.status,
      color: colorByRoute.get(r.id),
      avatarUrl: r.driverAvatar,
    }));
  const routeArcs: OpenLayersRouteArc[] = routes
    .filter((r) => r.routeLine && r.routeLine.length >= 2)
    .map((r) => ({
      id: r.id,
      from: r.routeLine![0],
      to: r.routeLine![r.routeLine!.length - 1],
      status: r.status,
      color: colorByRoute.get(r.id),
    }));

  return (
    <div className="relative">
      <OpenLayersUsaMap
        markers={markers}
        routes={routeArcs}
        selectedId={selectedId}
        onSelect={onSelect}
        loading={loading}
        emptyLabel="Map ready · no active routes"
        className="h-[360px] min-h-[360px]"
      />
      <div className="absolute left-4 bottom-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-md border border-border bg-background-card/95 px-3 py-2 text-2xs text-text-secondary shadow-xl">
        {LEGEND_CONFIG.map(({ key, label, dot }) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${dot}`} />
            {label} {legend[key]}
          </span>
        ))}
      </div>
    </div>
  );
}
