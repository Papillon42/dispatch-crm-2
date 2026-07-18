import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getClientFilter, canScope } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { z } from 'zod';

const CreateClientSchema = z.object({
  companyName: z.string().min(1),
  mc: z.string().optional(),
  dot: z.string().optional(),
  dispatchFeePercent: z.number().min(0).max(100).default(10),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  notes: z.string().optional(),
  dispatcherId: z.string().optional(),
  contacts: z.array(z.object({
    name: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    telegram: z.string().optional(),
    role: z.string().optional(),
    isPrimary: z.boolean().default(false),
  })).optional(),
});

// GET /api/clients
export const GET = withAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
  const search = searchParams.get('search');
  const status = searchParams.get('status');

  const scopeFilter = getClientFilter(ctx);

  const where: any = {
    ...scopeFilter,
    deletedAt: null,
    ...(status && { status: status as any }),
    ...(search && {
      OR: [
        { companyName: { contains: search, mode: 'insensitive' } },
        { mc: { contains: search, mode: 'insensitive' } },
        { dot: { contains: search, mode: 'insensitive' } },
        { contacts: { some: { email: { contains: search, mode: 'insensitive' } } } },
        { contacts: { some: { phone: { contains: search, mode: 'insensitive' } } } },
      ],
    }),
  };

  const [clients, total] = await Promise.all([
    db.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        contacts: { where: { isPrimary: true }, take: 1 },
        dispatcher: { select: { id: true, fullName: true } },
        _count: { select: { trucks: true, drivers: true, loads: true } },
      },
    }),
    db.client.count({ where }),
  ]);

  return NextResponse.json({ clients, total, page, limit });
}, 'clients', 'read');

// POST /api/clients
export const POST = withAuth(async (req, ctx) => {
  const body = await req.json();
  const { contacts, ...data } = CreateClientSchema.parse(body);

  const client = await db.client.create({
    data: {
      ...data,
      dispatcherId: ctx.role === 'ADMIN' ? data.dispatcherId ?? ctx.userId : ctx.userId,
      contacts: contacts ? { create: contacts } : undefined,
    },
    include: {
      contacts: { where: { isPrimary: true }, take: 1 },
      dispatcher: { select: { id: true, fullName: true } },
      _count: { select: { trucks: true, drivers: true, loads: true } },
    },
  });

  await audit({
    actorId: ctx.userId,
    action: 'create',
    entityType: 'Client',
    entityId: client.id,
    after: client,
  });

  return NextResponse.json(client, { status: 201 });
}, 'clients', 'create');
