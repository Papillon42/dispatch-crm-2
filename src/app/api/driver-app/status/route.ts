import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDriverAppAuthContext } from '@/lib/auth/driverApp';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { isValidStatusTransition } from '@/lib/auth/rbac';
import { LoadStatus } from '@prisma/client';

const DRIVER_ALLOWED_STATUSES: LoadStatus[] = [
  'EN_ROUTE_TO_PICKUP', 'AT_PICKUP', 'LOADED', 'IN_TRANSIT', 'AT_DELIVERY', 'DELIVERED', 'PROBLEM',
];

const BodySchema = z.object({
  loadId: z.string(),
  status: z.nativeEnum(LoadStatus),
});

// POST /api/driver-app/status — one-tap status update from the driver app (FR-M13-03)
export async function POST(req: Request) {
  const ctx = await getDriverAppAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { loadId, status } = BodySchema.parse(body);

  if (!DRIVER_ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Drivers can only set operational statuses' }, { status: 403 });
  }

  const load = await db.load.findUnique({ where: { id: loadId }, select: { id: true, driverId: true, status: true } });
  if (!load || load.driverId !== ctx.driverId) {
    return NextResponse.json({ error: 'Load not found or not assigned to you' }, { status: 403 });
  }

  if (!isValidStatusTransition(load.status, status)) {
    return NextResponse.json({ error: `Cannot go from ${load.status} to ${status}` }, { status: 422 });
  }

  const [updated] = await db.$transaction([
    db.load.update({ where: { id: loadId }, data: { status } }),
    db.loadStatusHistory.create({
      data: { loadId, fromStatus: load.status, toStatus: status, source: 'APP', notes: 'Updated from driver app' },
    }),
  ]);

  await audit({ action: 'status_change', entityType: 'Load', entityId: loadId, before: { status: load.status }, after: { status } });

  return NextResponse.json(updated);
}
