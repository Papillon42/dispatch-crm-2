import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { calcRpm } from '@/lib/finance';
import { z } from 'zod';

// GET /api/loads/:id — full detail for the right-hand load panel
export const GET = withAuth(async (req, ctx, params) => {
  const loadId = params?.id;
  if (!loadId) return NextResponse.json({ error: 'Missing load ID' }, { status: 400 });

  const load = await db.load.findUnique({
    where: { id: loadId },
    include: {
      client: { select: { id: true, companyName: true, dispatchFeePercent: true } },
      broker: { select: { id: true, name: true, phone: true, email: true } },
      driver: { select: { id: true, fullName: true, phone: true, status: true } },
      truck: { select: { id: true, truckNumber: true, trailerType: true } },
      dispatcher: { select: { id: true, fullName: true } },
      updater: { select: { id: true, fullName: true } },
      documents: { orderBy: { uploadedAt: 'desc' } },
      issues: { orderBy: { at: 'desc' }, include: { driver: { select: { fullName: true } } } },
      statusHistory: { orderBy: { at: 'desc' }, include: { changedBy: { select: { fullName: true } } } },
      locationUpdates: { orderBy: { at: 'desc' }, take: 1 },
    },
  });

  if (!load) return NextResponse.json({ error: 'Load not found' }, { status: 404 });

  if (ctx.role === 'DISPATCHER' && load.dispatcherId !== ctx.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(load);
}, 'loads', 'read');

const UpdateLoadSchema = z.object({
  notes: z.string().optional(),
  driverId: z.string().nullable().optional(),
  truckId: z.string().nullable().optional(),
  rate: z.number().min(0).optional(),
  totalMiles: z.number().min(0).optional(),
  loadedMiles: z.number().min(0).optional(),
  emptyMiles: z.number().min(0).optional(),
});

// PATCH /api/loads/:id — general field updates (assign driver, edit notes/rate, etc.)
export const PATCH = withAuth(async (req, ctx, params) => {
  const loadId = params?.id;
  if (!loadId) return NextResponse.json({ error: 'Missing load ID' }, { status: 400 });

  const body = await req.json();
  const data = UpdateLoadSchema.parse(body);

  const existing = await db.load.findUnique({
    where: { id: loadId },
    select: { id: true, dispatcherId: true, rate: true, totalMiles: true },
  });
  if (!existing) return NextResponse.json({ error: 'Load not found' }, { status: 404 });
  if (ctx.role === 'DISPATCHER' && existing.dispatcherId !== ctx.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const nextRate = data.rate ?? existing.rate;
  const nextMiles = data.totalMiles ?? existing.totalMiles;
  const rpm = calcRpm(nextRate, nextMiles);

  const updated = await db.load.update({
    where: { id: loadId },
    data: { ...data, rpm },
  });

  await audit({
    actorId: ctx.userId,
    action: 'update',
    entityType: 'Load',
    entityId: loadId,
    before: existing,
    after: updated,
  });

  return NextResponse.json(updated);
}, 'loads', 'update');
