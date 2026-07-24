import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, isAdminRole } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { getDriverStatusConfigs } from '@/lib/services/driverStatus.service';

// GET /api/statuses — driver status dictionary (auto-seeds system defaults).
// ?all=1 includes disabled statuses (admin dictionary management view).
export const GET = withAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const includeInactive = searchParams.get('all') === '1' && isAdminRole(ctx.role);
  const statuses = await getDriverStatusConfigs(!includeInactive);
  return NextResponse.json({ statuses });
}, 'drivers', 'read');

const CreateStatusSchema = z.object({
  code: z.string().min(2).max(64).regex(/^[A-Z][A-Z0-9_]*$/, 'Code must be UPPER_SNAKE_CASE'),
  label: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon: z.string().max(64).optional(),
  description: z.string().max(500).optional(),
  category: z.enum(['OPERATIONAL', 'UNAVAILABLE']).default('OPERATIONAL'),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  requiresLoad: z.boolean().default(false),
  requiredFields: z.array(z.string().max(64)).default([]),
  allowedNext: z.array(z.string().max(64)).default([]),
});

// POST /api/statuses — add a custom status (Admin only)
export const POST = withAuth(async (req, ctx) => {
  if (!isAdminRole(ctx.role)) {
    return NextResponse.json({ error: 'Only admins can manage the status dictionary' }, { status: 403 });
  }

  const data = CreateStatusSchema.parse(await req.json());
  const existing = await db.driverStatusConfig.findUnique({ where: { code: data.code } });
  if (existing) {
    return NextResponse.json({ error: `Status code "${data.code}" already exists` }, { status: 409 });
  }

  const maxOrder = await db.driverStatusConfig.aggregate({ _max: { sortOrder: true } });
  const status = await db.driverStatusConfig.create({
    data: {
      ...data,
      sortOrder: data.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 10,
      isSystem: false,
      isActive: true,
    },
  });

  await audit({
    actorId: ctx.userId,
    action: 'create',
    entityType: 'DriverStatusConfig',
    entityId: status.id,
    after: status,
  });

  return NextResponse.json(status, { status: 201 });
}, 'settings', 'update');
