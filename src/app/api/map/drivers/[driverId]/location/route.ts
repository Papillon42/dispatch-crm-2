import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/rbac';
import { z } from 'zod';
import { rateLimit } from '@/lib/rateLimit';
import { recordDriverLocation, StatusChangeError } from '@/lib/services/driverStatus.service';

const LocationUpdateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  label: z.string().optional(),
  speed: z.number().min(0).max(200).optional(),
  heading: z.number().min(0).max(360).optional(),
  accuracy: z.number().min(0).optional(),
  eta: z.string().datetime().optional(),
  etaLabel: z.string().optional(),
  notes: z.string().optional(),
  loadId: z.string().optional(),
});

// POST /api/map/drivers/[driverId]/location
// Kept for backwards compatibility with the existing map UI; delegates to the
// shared location service (history + denormalized position + realtime event).
export const POST = withAuth(async (req, ctx, params) => {
  const driverId = params?.driverId;
  if (!driverId) return NextResponse.json({ error: 'Missing driver ID' }, { status: 400 });

  if (!rateLimit(`driver-location:${ctx.userId}:${driverId}`, 12, 60_000)) {
    return NextResponse.json({ error: 'Too many location updates' }, { status: 429 });
  }

  const body = await req.json();
  const data = LocationUpdateSchema.parse(body);

  try {
    const result = await recordDriverLocation(ctx, driverId, {
      latitude: data.lat,
      longitude: data.lng,
      label: data.label,
      speed: data.speed,
      heading: data.heading,
      accuracy: data.accuracy,
      eta: data.eta,
      etaLabel: data.etaLabel,
      loadId: data.loadId,
      source: 'MANUAL',
    });
    return NextResponse.json(result.locationUpdate);
  } catch (err) {
    if (err instanceof StatusChangeError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.httpStatus });
    }
    console.error('[POST /map/drivers/:id/location]', err);
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
  }
}, 'map', 'update');
