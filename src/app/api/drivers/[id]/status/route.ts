import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/rbac';
import { rateLimit } from '@/lib/rateLimit';
import {
  StatusChangeError,
  updateDriverOperationalStatus,
} from '@/lib/services/driverStatus.service';

const GeoPointSchema = z.object({
  address: z.string().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
}).optional().nullable();

const ChangeStatusSchema = z.object({
  status: z.string().min(1).max(64),
  loadId: z.string().optional().nullable(),
  truckId: z.string().optional().nullable(),
  trailerId: z.string().optional().nullable(),
  origin: GeoPointSchema,
  destination: GeoPointSchema,
  currentLocation: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    label: z.string().optional().nullable(),
  }).optional().nullable(),
  eta: z.string().datetime().optional().nullable(),
  arrivedAt: z.string().datetime().optional().nullable(),
  deliveredAt: z.string().datetime().optional().nullable(),
  changedAt: z.string().datetime().optional().nullable(),
  comment: z.string().max(2000).optional().nullable(),
  reason: z.string().max(2000).optional().nullable(),
  expectedReturnAt: z.string().datetime().optional().nullable(),
  manualOverride: z.boolean().optional(),
});

// PATCH /api/drivers/:id/status — the single entry point for driver status
// changes from the CRM. Full validation/sync/audit happens in the service.
export const PATCH = withAuth(async (req, ctx, params) => {
  const driverId = params?.id;
  if (!driverId) return NextResponse.json({ error: 'Missing driver ID' }, { status: 400 });

  if (!rateLimit(`driver-status:${ctx.userId}`, 30, 60_000)) {
    return NextResponse.json({ error: 'Too many status changes, slow down' }, { status: 429 });
  }

  let data: z.infer<typeof ChangeStatusSchema>;
  try {
    data = ChangeStatusSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request body', details: err instanceof z.ZodError ? err.flatten() : undefined }, { status: 400 });
  }

  try {
    const result = await updateDriverOperationalStatus(ctx, driverId, data, {
      source: 'CRM',
      manualOverride: data.manualOverride ?? false,
      ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    });

    return NextResponse.json({
      driver: result.driver,
      load: result.load,
      truck: result.truck,
      history: result.history,
      previousStatus: result.previousStatus,
      isManualOverride: result.isManualOverride,
      map: {
        driverId,
        latitude: result.driver.currentLat,
        longitude: result.driver.currentLng,
        status: result.driver.status,
        eta: result.driver.currentEta,
      },
    });
  } catch (err) {
    if (err instanceof StatusChangeError) {
      return NextResponse.json(
        { error: err.message, code: err.code, details: err.details ?? null },
        { status: err.httpStatus },
      );
    }
    console.error('[PATCH /drivers/:id/status]', err);
    return NextResponse.json({ error: 'Failed to change status' }, { status: 500 });
  }
}, 'drivers', 'update');
