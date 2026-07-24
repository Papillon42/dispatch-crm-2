import { NextResponse } from 'next/server';
import { withAuth, getDriverFilter } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { ACTIVE_LOAD_STATUSES } from '@/lib/driverStatus';

// GET /api/drivers/:id — full driver card (status block, load, truck, trailer,
// live location, dispatcher/updater, latest history preview)
export const GET = withAuth(async (req, ctx, params) => {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing driver ID' }, { status: 400 });

  const driver = await db.driver.findFirst({
    where: { id, deletedAt: null, ...getDriverFilter(ctx) },
    include: {
      client: { select: { id: true, companyName: true, mc: true, dot: true } },
      dispatcher: { select: { id: true, fullName: true } },
      updater: { select: { id: true, fullName: true } },
      statusUpdatedBy: { select: { id: true, fullName: true } },
      currentTruck: { select: { id: true, truckNumber: true, trailerType: true, maintenanceStatus: true } },
      currentTrailer: { select: { id: true, trailerNumber: true, type: true, plate: true } },
      currentLoad: {
        select: {
          id: true, loadCode: true, status: true,
          pickupAddress: true, pickupCity: true, pickupState: true, pickupLat: true, pickupLng: true, pickupAt: true,
          deliveryAddress: true, deliveryCity: true, deliveryState: true, deliveryLat: true, deliveryLng: true, deliveryAt: true,
          estimatedArrivalAt: true, actualDepartureAt: true, actualDeliveryAt: true, loadedAt: true,
          currentLat: true, currentLng: true, rate: true, totalMiles: true,
        },
      },
      locationUpdates: { orderBy: { at: 'desc' }, take: 1 },
      loads: {
        where: { status: { in: ACTIVE_LOAD_STATUSES } },
        select: { id: true, loadCode: true, status: true },
        orderBy: { updatedAt: 'desc' },
      },
      _count: { select: { loads: true, issues: true, documents: true, statusHistory: true } },
    },
  });

  if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
  return NextResponse.json(driver);
}, 'drivers', 'read');

// PATCH /api/drivers/:id — limited profile update (currently: personal pay
// rate per mile, dispatcher/updater assignment). Owner/Admin only for pay.
export const PATCH = withAuth(async (req, ctx, params) => {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing driver ID' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const payPerMile = body?.payPerMile;

  if (payPerMile !== undefined) {
    if (!['OWNER', 'ADMIN'].includes(ctx.role)) {
      return NextResponse.json({ error: 'Only the Owner can change a driver pay rate' }, { status: 403 });
    }
    if (payPerMile !== null && (typeof payPerMile !== 'number' || payPerMile < 0 || payPerMile > 20)) {
      return NextResponse.json({ error: 'payPerMile must be a number between 0 and 20' }, { status: 422 });
    }
  }

  const existing = await db.driver.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });

  const updated = await db.driver.update({
    where: { id },
    data: {
      ...(payPerMile !== undefined ? { payPerMile } : {}),
    },
  });

  await audit({
    actorId: ctx.userId,
    action: 'update',
    entityType: 'Driver',
    entityId: id,
    before: { payPerMile: existing.payPerMile },
    after: { payPerMile: updated.payPerMile },
  });

  return NextResponse.json(updated);
}, 'drivers', 'update');

// DELETE /api/drivers/:id — soft delete (sets deletedAt). Historical Loads,
// LocationUpdates, Documents, Issues stay intact for reporting/audit trail;
// the driver just stops appearing in active lists and pickers.
export const DELETE = withAuth(async (req, ctx, params) => {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing driver ID' }, { status: 400 });

  const existing = await db.driver.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
  if (existing.deletedAt) return NextResponse.json({ error: 'Driver already deleted' }, { status: 409 });

  const deleted = await db.driver.update({
    where: { id },
    data: { deletedAt: new Date(), status: 'INACTIVE' },
  });

  await audit({ actorId: ctx.userId, action: 'delete', entityType: 'Driver', entityId: id, before: existing, after: deleted });

  return NextResponse.json({ ok: true });
}, 'drivers', 'delete');
