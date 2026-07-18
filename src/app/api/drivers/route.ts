import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, getClientFilter, getDriverFilter } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';

const CreateDriverSchema = z.object({
  clientId: z.string().min(1),
  fullName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  telegram: z.string().optional(),
  cdlNumber: z.string().optional(),
  cdlState: z.string().optional(),
  cdlExpiry: z.string().optional(),
  homeBase: z.string().optional(),
  preferredLanes: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const GET = withAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);
  const search = searchParams.get('search')?.trim();
  const status = searchParams.get('status')?.trim();
  const clientId = searchParams.get('clientId')?.trim();

  const where: any = {
    ...getDriverFilter(ctx),
    deletedAt: null,
    ...(clientId ? { clientId } : {}),
    ...(status && status !== 'ALL' ? { status } : {}),
    ...(search ? {
      OR: [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { telegram: { contains: search, mode: 'insensitive' } },
        { cdlNumber: { contains: search, mode: 'insensitive' } },
        { homeBase: { contains: search, mode: 'insensitive' } },
        { client: { companyName: { contains: search, mode: 'insensitive' } } },
        { currentTruck: { truckNumber: { contains: search, mode: 'insensitive' } } },
      ],
    } : {}),
  };

  const [drivers, total] = await Promise.all([
    db.driver.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        client: { select: { id: true, companyName: true } },
        dispatcher: { select: { id: true, fullName: true } },
        updater: { select: { id: true, fullName: true } },
        currentTruck: { select: { id: true, truckNumber: true, trailerType: true } },
        locationUpdates: { orderBy: { at: 'desc' }, take: 1 },
        _count: { select: { loads: true, issues: true, documents: true } },
      },
    }),
    db.driver.count({ where }),
  ]);

  return NextResponse.json({ drivers, total, page, limit });
}, 'drivers', 'read');

export const POST = withAuth(async (req, ctx) => {
  const body = await req.json();
  const data = CreateDriverSchema.parse(body);

  const client = await db.client.findFirst({
    where: { id: data.clientId, ...getClientFilter(ctx) },
    select: { id: true, dispatcherId: true },
  });

  if (!client) {
    return NextResponse.json({ error: 'Client not found or out of scope' }, { status: 404 });
  }

  const driver = await db.driver.create({
    data: {
      clientId: client.id,
      fullName: data.fullName.trim(),
      phone: data.phone?.trim() || undefined,
      email: data.email?.trim() || undefined,
      avatarUrl: data.avatarUrl?.trim() || undefined,
      telegram: data.telegram?.trim() || undefined,
      cdlNumber: data.cdlNumber?.trim() || undefined,
      cdlState: data.cdlState?.trim().toUpperCase() || undefined,
      cdlExpiry: data.cdlExpiry ? new Date(data.cdlExpiry) : undefined,
      homeBase: data.homeBase?.trim() || undefined,
      preferredLanes: data.preferredLanes?.map((lane) => lane.trim()).filter(Boolean) ?? [],
      notes: data.notes?.trim() || undefined,
      dispatcherId: client.dispatcherId ?? ctx.userId,
    },
    include: {
      client: { select: { id: true, companyName: true } },
      dispatcher: { select: { id: true, fullName: true } },
      updater: { select: { id: true, fullName: true } },
      currentTruck: { select: { id: true, truckNumber: true, trailerType: true } },
      locationUpdates: { orderBy: { at: 'desc' }, take: 1 },
      _count: { select: { loads: true, issues: true, documents: true } },
    },
  });

  await audit({
    actorId: ctx.userId,
    action: 'create',
    entityType: 'Driver',
    entityId: driver.id,
    after: driver,
  });

  return NextResponse.json(driver, { status: 201 });
}, 'drivers', 'create');
