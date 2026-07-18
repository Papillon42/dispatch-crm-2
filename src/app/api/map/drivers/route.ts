import { NextResponse } from 'next/server';
import { withAuth, getDriverFilter } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { ACTIVE_LOAD_STATUSES } from '@/lib/driverStatus';
import { getDriverStatusConfigs } from '@/lib/services/driverStatus.service';

// GET /api/map/drivers — fleet map dataset with rich filtering.
//
// Query params:
//   status=CODE[,CODE...]  filter by driver status code(s)
//   hasLoad=1|0            only drivers with / without an active load
//   dispatcherId=...       drivers of a specific dispatcher
//   clientId=...           drivers of a specific company
//   truckId=... loadId=... focus on one truck / load
//   staleGps=1             only drivers whose GPS is older than the configured threshold
//   overdueEta=1           only drivers whose ETA is in the past but not delivered
//   search=...             name / phone / truck# / trailer# / load# / MC / DOT / company
//   bounds=minLng,minLat,maxLng,maxLat   viewport-limited loading
//   limit=N (<=2000)
export const GET = withAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get('status');
  const hasLoad = searchParams.get('hasLoad');
  const dispatcherId = searchParams.get('dispatcherId');
  const clientId = searchParams.get('clientId');
  const truckId = searchParams.get('truckId');
  const loadId = searchParams.get('loadId');
  const staleGps = searchParams.get('staleGps') === '1';
  const overdueEta = searchParams.get('overdueEta') === '1';
  const search = searchParams.get('search')?.trim();
  const bounds = searchParams.get('bounds')?.split(',').map(Number);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '1000', 10), 2000);

  const [settings, configs] = await Promise.all([
    db.companySettings.findFirst({ select: { gpsStaleMinutes: true } }),
    getDriverStatusConfigs(true),
  ]);
  const staleThreshold = new Date(Date.now() - (settings?.gpsStaleMinutes ?? 30) * 60_000);

  const statuses = statusParam && statusParam !== 'ALL'
    ? statusParam.split(',').map((s) => s.trim()).filter(Boolean)
    : null;

  const where: Record<string, unknown> = {
    ...getDriverFilter(ctx),
    deletedAt: null,
    ...(statuses ? { status: { in: statuses } } : {}),
    ...(clientId ? { clientId } : {}),
    ...(dispatcherId ? { dispatcherId } : {}),
    ...(truckId ? { currentTruckId: truckId } : {}),
    ...(loadId ? { currentLoadId: loadId } : {}),
    ...(hasLoad === '1' ? { currentLoadId: { not: null } } : {}),
    ...(hasLoad === '0' ? { currentLoadId: null } : {}),
    ...(staleGps
      ? {
        OR: [
          { currentLocationUpdatedAt: null },
          { currentLocationUpdatedAt: { lt: staleThreshold } },
        ],
      }
      : {}),
    ...(overdueEta
      ? { currentEta: { lt: new Date() }, currentLoadId: { not: null } }
      : {}),
    ...(search
      ? {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { currentTruck: { truckNumber: { contains: search, mode: 'insensitive' } } },
          { currentTrailer: { trailerNumber: { contains: search, mode: 'insensitive' } } },
          { currentLoad: { loadCode: { contains: search, mode: 'insensitive' } } },
          { client: { companyName: { contains: search, mode: 'insensitive' } } },
          { client: { mc: { contains: search, mode: 'insensitive' } } },
          { client: { dot: { contains: search, mode: 'insensitive' } } },
        ],
      }
      : {}),
    ...(bounds && bounds.length === 4 && bounds.every(Number.isFinite)
      ? {
        currentLng: { gte: bounds[0], lte: bounds[2] },
        currentLat: { gte: bounds[1], lte: bounds[3] },
      }
      : {}),
  };

  const drivers = await db.driver.findMany({
    where,
    take: limit,
    orderBy: { statusUpdatedAt: 'desc' },
    select: {
      id: true, fullName: true, phone: true, avatarUrl: true, status: true,
      statusUpdatedAt: true, statusComment: true,
      currentLat: true, currentLng: true, currentLocationLabel: true,
      currentLocationUpdatedAt: true, currentEta: true,
      client: { select: { id: true, companyName: true, mc: true, dot: true } },
      dispatcher: { select: { id: true, fullName: true } },
      updater: { select: { id: true, fullName: true } },
      statusUpdatedBy: { select: { id: true, fullName: true } },
      currentTruck: { select: { id: true, truckNumber: true, trailerType: true } },
      currentTrailer: { select: { id: true, trailerNumber: true, type: true } },
      currentLoad: {
        select: {
          id: true, loadCode: true, status: true,
          pickupAddress: true, pickupCity: true, pickupState: true, pickupLat: true, pickupLng: true,
          deliveryAddress: true, deliveryCity: true, deliveryState: true, deliveryLat: true, deliveryLng: true,
          estimatedArrivalAt: true, actualDepartureAt: true, loadedAt: true, totalMiles: true,
        },
      },
      // Fallback for drivers without denormalized position yet
      locationUpdates: {
        orderBy: { at: 'desc' },
        take: 1,
        select: { lat: true, lng: true, label: true, at: true, eta: true, etaLabel: true, speed: true, heading: true },
      },
      loads: {
        where: { status: { in: ACTIVE_LOAD_STATUSES } },
        select: { id: true, loadCode: true, status: true },
        take: 3,
      },
    },
  });

  return NextResponse.json({
    drivers,
    statuses: configs,
    gpsStaleMinutes: settings?.gpsStaleMinutes ?? 30,
    generatedAt: new Date().toISOString(),
  });
}, 'map', 'read');
