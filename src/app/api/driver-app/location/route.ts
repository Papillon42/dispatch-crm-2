import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDriverAppAuthContext } from '@/lib/auth/driverApp';
import { recordDriverLocation } from '@/lib/services/driverStatus.service';

const BodySchema = z.object({
  loadId: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  label: z.string().optional(),
});

// POST /api/driver-app/location — manual location ping (FR-M13-07; source stays an
// attribute so a future GPS/ELD feed can post here without changing the API shape)
export async function POST(req: Request) {
  const ctx = await getDriverAppAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const data = BodySchema.parse(body);

  // Shared location service: writes history + denormalized driver/load position,
  // publishes the realtime event and computes geofence status suggestions.
  const result = await recordDriverLocation({ userId: null, role: 'SYSTEM' }, ctx.driverId, {
    latitude: data.lat,
    longitude: data.lng,
    label: data.label,
    loadId: data.loadId,
    source: 'GPS',
  });

  return NextResponse.json(result.locationUpdate, { status: 201 });
}
