import { NextResponse } from 'next/server';
import { withAuth, getDispatcherFilter } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { ACTIVE_LOAD_STATUSES } from '@/lib/driverStatus';

// GET /api/map/loads — active loads with route geometry for the fleet map
export const GET = withAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '500', 10), 1000);
  const clientId = searchParams.get('clientId');

  const loads = await db.load.findMany({
    where: {
      ...getDispatcherFilter(ctx),
      status: { in: ACTIVE_LOAD_STATUSES },
      ...(clientId ? { clientId } : {}),
    },
    take: limit,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true, loadCode: true, status: true,
      pickupAddress: true, pickupCity: true, pickupState: true, pickupLat: true, pickupLng: true, pickupAt: true,
      deliveryAddress: true, deliveryCity: true, deliveryState: true, deliveryLat: true, deliveryLng: true, deliveryAt: true,
      estimatedArrivalAt: true, actualDepartureAt: true, loadedAt: true,
      currentLat: true, currentLng: true, totalMiles: true,
      driver: { select: { id: true, fullName: true, status: true, currentLat: true, currentLng: true } },
      truck: { select: { id: true, truckNumber: true } },
      trailer: { select: { id: true, trailerNumber: true, type: true } },
      client: { select: { id: true, companyName: true } },
    },
  });

  return NextResponse.json({ loads, generatedAt: new Date().toISOString() });
}, 'map', 'read');
