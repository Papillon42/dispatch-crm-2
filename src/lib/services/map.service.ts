// Fleet map dashboard data: builds route + legend data from
// Load + Driver + LocationUpdate. Reuses the existing LocationUpdate model
// for "current position" instead of introducing a duplicate history table.

import { db } from '@/lib/db';
import type { LoadStatus } from '@prisma/client';
import { geocode } from '@/lib/geo';
import type { DashboardMapData, MapRoute, MapLegend, RouteStatus } from './types';

const IN_FLIGHT_STATUSES: LoadStatus[] = [
  'ASSIGNED', 'EN_ROUTE_TO_PICKUP', 'AT_PICKUP', 'LOADED', 'IN_TRANSIT', 'AT_DELIVERY', 'PROBLEM',
];

// Maps operational Load status -> the 6 map/legend buckets the reference UI uses.
export function toRouteStatus(loadStatus: string): RouteStatus {
  switch (loadStatus) {
    case 'IN_TRANSIT':
    case 'EN_ROUTE_TO_PICKUP':
      return 'IN_TRANSIT';
    case 'AT_PICKUP':
    case 'LOADED':
      return 'LOADING';
    case 'AT_DELIVERY':
      return 'UNLOADING';
    case 'ASSIGNED':
      return 'WAITING';
    case 'PROBLEM':
      return 'PROBLEM';
    default:
      return 'IDLE';
  }
}

function routeHealth(status: RouteStatus) {
  if (status === 'IN_TRANSIT') return 'healthy';
  if (status === 'WAITING') return 'waiting';
  if (status === 'PROBLEM' || status === 'IDLE') return 'problem';
  return 'delayed';
}

export async function getDashboardMapData(): Promise<DashboardMapData> {
  const loads = await db.load.findMany({
    where: { status: { in: IN_FLIGHT_STATUSES }, driverId: { not: null } },
    select: {
      id: true, loadCode: true, status: true, driverId: true,
      pickupCity: true, pickupState: true, pickupLat: true, pickupLng: true,
      deliveryCity: true, deliveryState: true, deliveryLat: true, deliveryLng: true,
      rate: true,
      driver: { select: { id: true, fullName: true, avatarUrl: true } },
    },
    take: 200,
  });

  const driverIds = loads.map((l: any) => l.driverId!).filter(Boolean);
  const latestLocations = driverIds.length
    ? await db.locationUpdate.findMany({
        where: { driverId: { in: driverIds } },
        orderBy: { at: 'desc' },
        distinct: ['driverId'],
      })
    : [];
  const locationByDriver = new Map(latestLocations.map((loc: any) => [loc.driverId, loc]));

  const routes: MapRoute[] = loads.map((load: any) => {
    const pickup = {
      city: load.pickupCity,
      state: load.pickupState,
      lat: load.pickupLat ?? geocode(load.pickupCity, load.pickupState)?.lat ?? null,
      lng: load.pickupLng ?? geocode(load.pickupCity, load.pickupState)?.lng ?? null,
    };
    const delivery = {
      city: load.deliveryCity,
      state: load.deliveryState,
      lat: load.deliveryLat ?? geocode(load.deliveryCity, load.deliveryState)?.lat ?? null,
      lng: load.deliveryLng ?? geocode(load.deliveryCity, load.deliveryState)?.lng ?? null,
    };
    const loc: any = load.driverId ? locationByDriver.get(load.driverId) : null;
    const currentLocation = loc
      ? { lat: loc.lat, lng: loc.lng, updatedAt: loc.at.toISOString() }
      : pickup.lat && pickup.lng
        ? { lat: pickup.lat, lng: pickup.lng, updatedAt: new Date().toISOString() }
        : null;

    return {
      id: load.id,
      loadId: load.id,
      loadCode: load.loadCode,
      driverId: load.driverId!,
      driverName: load.driver?.fullName ?? 'Unassigned',
      driverAvatar: load.driver?.avatarUrl ?? null,
      status: toRouteStatus(load.status),
      pickup,
      delivery,
      currentLocation,
      routeLine: pickup.lat && pickup.lng && delivery.lat && delivery.lng
        ? [{ lat: pickup.lat, lng: pickup.lng }, { lat: delivery.lat, lng: delivery.lng }]
        : undefined,
      rate: load.rate,
      eta: loc?.eta ? loc.eta.toISOString() : null,
      etaLabel: loc?.etaLabel ?? null,
    };
  });

  const legend: MapLegend = {
    healthy: routes.filter((r: MapRoute) => routeHealth(r.status) === 'healthy').length,
    waiting: routes.filter((r: MapRoute) => routeHealth(r.status) === 'waiting').length,
    delayed: routes.filter((r: MapRoute) => routeHealth(r.status) === 'delayed').length,
    problem: routes.filter((r: MapRoute) => routeHealth(r.status) === 'problem').length,
  };

  return { routes, legend };
}
