import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getDispatcherFilter, canScope } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { calcRpm } from '@/lib/finance';
import { z } from 'zod';

const CreateLoadSchema = z.object({
  clientId: z.string(),
  brokerId: z.string().optional(),
  brokerContact: z.string().optional(),
  brokerEmail: z.string().optional(),
  brokerPhone: z.string().optional(),
  driverId: z.string().optional(),
  truckId: z.string().optional(),
  pickupAddress: z.string().optional(),
  pickupCity: z.string().optional(),
  pickupState: z.string().optional(),
  pickupZip: z.string().optional(),
  pickupAt: z.string().datetime().optional(),
  deliveryAddress: z.string().optional(),
  deliveryCity: z.string().optional(),
  deliveryState: z.string().optional(),
  deliveryZip: z.string().optional(),
  deliveryAt: z.string().datetime().optional(),
  rate: z.number().min(0),
  loadedMiles: z.number().min(0).default(0),
  emptyMiles: z.number().min(0).default(0),
  totalMiles: z.number().min(0).default(0),
  commodity: z.string().optional(),
  weight: z.number().optional(),
  equipmentType: z.enum(['DRY_VAN', 'REEFER', 'FLATBED', 'STEP_DECK', 'LOWBOY', 'TANKER', 'CONESTOGA', 'OTHER']).optional(),
  lumper: z.number().default(0),
  detention: z.number().default(0),
  layover: z.number().default(0),
  tonu: z.number().default(0),
  notes: z.string().optional(),
  referenceNumber: z.string().optional(),
  poNumber: z.string().optional(),
});

// GET /api/loads
export const GET = withAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
  const status = searchParams.get('status');
  const clientId = searchParams.get('clientId');
  const driverId = searchParams.get('driverId');
  const search = searchParams.get('search');

  const scopeFilter = getDispatcherFilter(ctx);

  const where: any = {
    ...scopeFilter,
    ...(status && { status: status as any }),
    ...(clientId && { clientId }),
    ...(driverId && { driverId }),
    ...(search && {
      OR: [
        { loadCode: { contains: search, mode: 'insensitive' } },
        { broker: { name: { contains: search, mode: 'insensitive' } } },
        { client: { companyName: { contains: search, mode: 'insensitive' } } },
        { driver: { fullName: { contains: search, mode: 'insensitive' } } },
        { pickupCity: { contains: search, mode: 'insensitive' } },
        { deliveryCity: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [loads, total] = await Promise.all([
    db.load.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        client: { select: { id: true, companyName: true } },
        broker: { select: { id: true, name: true } },
        driver: { select: { id: true, fullName: true } },
        truck: { select: { id: true, truckNumber: true } },
        dispatcher: { select: { id: true, fullName: true } },
        documents: { select: { docType: true, id: true } },
        issues: { where: { status: { not: 'RESOLVED' } }, select: { id: true, type: true } },
        _count: { select: { documents: true } },
      },
    }),
    db.load.count({ where }),
  ]);

  return NextResponse.json({ loads, total, page, limit, pages: Math.ceil(total / limit) });
}, 'loads', 'read');

// POST /api/loads
export const POST = withAuth(async (req, ctx) => {
  const body = await req.json();
  const data = CreateLoadSchema.parse(body);

  // Verify client belongs to this dispatcher
  const clientScope = canScope(ctx.role, 'read', 'clients');
  if (clientScope === 'own') {
    const client = await db.client.findUnique({
      where: { id: data.clientId },
      select: { dispatcherId: true },
    });
    if (!client || client.dispatcherId !== ctx.userId) {
      return NextResponse.json({ error: 'Client not found or not assigned to you' }, { status: 403 });
    }
  }

  const rpm = calcRpm(data.rate, data.totalMiles);

  const load = await db.load.create({
    data: {
      ...data,
      rpm,
      dispatcherId: ctx.userId,
      pickupAt: data.pickupAt ? new Date(data.pickupAt) : undefined,
      deliveryAt: data.deliveryAt ? new Date(data.deliveryAt) : undefined,
      statusHistory: {
        create: {
          toStatus: 'NEW_LEAD',
          changedById: ctx.userId,
          source: 'CRM',
        },
      },
    },
  });

  await audit({
    actorId: ctx.userId,
    action: 'create',
    entityType: 'Load',
    entityId: load.id,
    after: load,
  });

  return NextResponse.json(load, { status: 201 });
}, 'loads', 'create');
