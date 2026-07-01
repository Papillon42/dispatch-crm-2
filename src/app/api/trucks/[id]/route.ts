import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';

export const GET = withAuth(async (req, ctx, params) => {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing truck ID' }, { status: 400 });

  const truck = await db.truck.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, companyName: true } },
      currentDriver: { select: { id: true, fullName: true, phone: true, status: true } },
      trailers: true,
      documents: { orderBy: { uploadedAt: 'desc' } },
      loads: {
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: { id: true, loadCode: true, status: true, pickupCity: true, deliveryCity: true, rate: true },
      },
    },
  });

  if (!truck) return NextResponse.json({ error: 'Truck not found' }, { status: 404 });
  return NextResponse.json(truck);
}, 'trucks', 'read');

const UpdateTruckSchema = z.object({
  maintenanceStatus: z.enum(['OK', 'SCHEDULED', 'IN_PROGRESS', 'OVERDUE']).optional(),
  currentDriverId: z.string().nullable().optional(),
  notes: z.string().optional(),
  insuranceExp: z.string().optional(),
  registrationExp: z.string().optional(),
  iftaExp: z.string().optional(),
});

export const PATCH = withAuth(async (req, ctx, params) => {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing truck ID' }, { status: 400 });

  const body = await req.json();
  const data = UpdateTruckSchema.parse(body);

  const before = await db.truck.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: 'Truck not found' }, { status: 404 });

  const truck = await db.truck.update({
    where: { id },
    data: {
      ...data,
      insuranceExp: data.insuranceExp ? new Date(data.insuranceExp) : undefined,
      registrationExp: data.registrationExp ? new Date(data.registrationExp) : undefined,
      iftaExp: data.iftaExp ? new Date(data.iftaExp) : undefined,
    },
  });

  await audit({ actorId: ctx.userId, action: 'update', entityType: 'Truck', entityId: id, before, after: truck });

  return NextResponse.json(truck);
}, 'trucks', 'update');
