import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDriverAppAuthContext } from '@/lib/auth/driverApp';
import { db } from '@/lib/db';

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

  const update = await db.locationUpdate.create({
    data: {
      driverId: ctx.driverId,
      loadId: data.loadId,
      lat: data.lat,
      lng: data.lng,
      label: data.label,
      source: 'GPS',
    },
  });

  return NextResponse.json(update, { status: 201 });
}
