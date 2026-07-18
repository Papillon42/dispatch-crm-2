import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/rbac';
import { rateLimit } from '@/lib/rateLimit';
import { recordDriverLocation, StatusChangeError } from '@/lib/services/driverStatus.service';

const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  label: z.string().max(255).optional().nullable(),
  speed: z.number().min(0).max(200).optional().nullable(),
  heading: z.number().min(0).max(360).optional().nullable(),
  accuracy: z.number().min(0).optional().nullable(),
  eta: z.string().datetime().optional().nullable(),
  etaLabel: z.string().max(255).optional().nullable(),
  loadId: z.string().optional().nullable(),
  source: z.enum(['MANUAL', 'GPS', 'ELD']).optional(),
});

// PATCH /api/drivers/:id/location — manual/GPS location update.
// Writes LocationUpdate history + denormalized driver/load position, then
// publishes a realtime event and (optionally) a geofence status suggestion.
export const PATCH = withAuth(async (req, ctx, params) => {
  const driverId = params?.id;
  if (!driverId) return NextResponse.json({ error: 'Missing driver ID' }, { status: 400 });

  if (!rateLimit(`driver-location:${ctx.userId}:${driverId}`, 12, 60_000)) {
    return NextResponse.json({ error: 'Too many location updates' }, { status: 429 });
  }

  let data: z.infer<typeof LocationSchema>;
  try {
    data = LocationSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request body', details: err instanceof z.ZodError ? err.flatten() : undefined }, { status: 400 });
  }

  try {
    const result = await recordDriverLocation(ctx, driverId, data);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof StatusChangeError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.httpStatus });
    }
    console.error('[PATCH /drivers/:id/location]', err);
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
  }
}, 'map', 'update');
