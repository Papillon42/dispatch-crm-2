import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { z } from 'zod';

const LocationUpdateSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  label: z.string().optional(),
  eta: z.string().datetime().optional(),
  etaLabel: z.string().optional(),
  notes: z.string().optional(),
  loadId: z.string().optional(),
});

// POST /api/map/drivers/[driverId]/location
export const POST = withAuth(async (req, ctx, params) => {
  const driverId = params?.driverId;
  if (!driverId) return NextResponse.json({ error: 'Missing driver ID' }, { status: 400 });

  const body = await req.json();
  const data = LocationUpdateSchema.parse(body);

  const locationUpdate = await db.locationUpdate.create({
    data: {
      driverId,
      loadId: data.loadId,
      lat: data.lat,
      lng: data.lng,
      label: data.label,
      eta: data.eta ? new Date(data.eta) : undefined,
      etaLabel: data.etaLabel,
      source: 'MANUAL',
      updatedById: ctx.userId,
    },
  });

  await audit({
    actorId: ctx.userId,
    action: 'location_update',
    entityType: 'Driver',
    entityId: driverId,
    after: { lat: data.lat, lng: data.lng, eta: data.eta },
  });

  return NextResponse.json(locationUpdate);
}, 'map', 'update');
