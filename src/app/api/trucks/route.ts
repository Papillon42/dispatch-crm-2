import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, getClientFilter } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';

const CreateTruckSchema = z.object({
  clientId: z.string().min(1),
  truckNumber: z.string().min(1),
  vin: z.string().optional(),
  plate: z.string().optional(),
  plateState: z.string().optional(),
  trailerType: z.enum(['DRY_VAN', 'REEFER', 'FLATBED', 'STEP_DECK', 'LOWBOY', 'TANKER', 'CONESTOGA', 'OTHER']).optional(),
  eldProvider: z.string().optional(),
  year: z.number().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  insuranceExp: z.string().optional(),
  registrationExp: z.string().optional(),
  iftaExp: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/trucks
export const GET = withAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);
  const search = searchParams.get('search')?.trim();
  const maintenanceStatus = searchParams.get('maintenanceStatus')?.trim();

  const where: any = {
    ...getClientFilter(ctx),
    ...(maintenanceStatus && maintenanceStatus !== 'ALL' ? { maintenanceStatus } : {}),
    ...(search ? {
      OR: [
        { truckNumber: { contains: search, mode: 'insensitive' } },
        { vin: { contains: search, mode: 'insensitive' } },
        { plate: { contains: search, mode: 'insensitive' } },
        { client: { companyName: { contains: search, mode: 'insensitive' } } },
      ],
    } : {}),
  };

  const [trucks, total] = await Promise.all([
    db.truck.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        client: { select: { id: true, companyName: true } },
        currentDriver: { select: { id: true, fullName: true, status: true } },
        _count: { select: { documents: true, loads: true } },
      },
    }),
    db.truck.count({ where }),
  ]);

  return NextResponse.json({ trucks, total, page, limit });
}, 'trucks', 'read');

// POST /api/trucks
export const POST = withAuth(async (req, ctx) => {
  const body = await req.json();
  const data = CreateTruckSchema.parse(body);

  const client = await db.client.findFirst({
    where: { id: data.clientId, ...getClientFilter(ctx) },
    select: { id: true },
  });
  if (!client) return NextResponse.json({ error: 'Client not found or out of scope' }, { status: 404 });

  const truck = await db.truck.create({
    data: {
      ...data,
      insuranceExp: data.insuranceExp ? new Date(data.insuranceExp) : undefined,
      registrationExp: data.registrationExp ? new Date(data.registrationExp) : undefined,
      iftaExp: data.iftaExp ? new Date(data.iftaExp) : undefined,
    },
    include: { client: { select: { id: true, companyName: true } } },
  });

  await audit({ actorId: ctx.userId, action: 'create', entityType: 'Truck', entityId: truck.id, after: truck });

  return NextResponse.json(truck, { status: 201 });
}, 'trucks', 'create');
