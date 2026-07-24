import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, isAdminRole } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';

const UpdateStatusSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().max(64).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  category: z.enum(['OPERATIONAL', 'UNAVAILABLE']).optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  isActive: z.boolean().optional(),
  requiresLoad: z.boolean().optional(),
  requiredFields: z.array(z.string().max(64)).optional(),
  allowedNext: z.array(z.string().max(64)).optional(),
});

// PATCH /api/statuses/:id — rename / recolor / enable / disable / re-wire
// transitions of a dictionary entry (Admin only). The status CODE is immutable
// so history rows always stay resolvable; system rows cannot be deleted.
export const PATCH = withAuth(async (req, ctx, params) => {
  if (!isAdminRole(ctx.role)) {
    return NextResponse.json({ error: 'Only admins can manage the status dictionary' }, { status: 403 });
  }
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing status ID' }, { status: 400 });

  const existing = await db.driverStatusConfig.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Status not found' }, { status: 404 });

  const data = UpdateStatusSchema.parse(await req.json());

  if (existing.isSystem && data.isActive === false && ['AVAILABLE'].includes(existing.code)) {
    return NextResponse.json({ error: 'The AVAILABLE system status cannot be disabled' }, { status: 422 });
  }

  const updated = await db.driverStatusConfig.update({ where: { id }, data });

  await audit({
    actorId: ctx.userId,
    action: 'update',
    entityType: 'DriverStatusConfig',
    entityId: id,
    before: existing,
    after: updated,
  });

  return NextResponse.json(updated);
}, 'settings', 'update');

// DELETE /api/statuses/:id — only custom (non-system) statuses, only when unused
export const DELETE = withAuth(async (req, ctx, params) => {
  if (!isAdminRole(ctx.role)) {
    return NextResponse.json({ error: 'Only admins can manage the status dictionary' }, { status: 403 });
  }
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing status ID' }, { status: 400 });

  const existing = await db.driverStatusConfig.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Status not found' }, { status: 404 });
  if (existing.isSystem) {
    return NextResponse.json({ error: 'System statuses cannot be deleted — disable them instead' }, { status: 422 });
  }

  const inUse = await db.driver.count({ where: { status: existing.code } });
  if (inUse > 0) {
    return NextResponse.json({ error: `${inUse} driver(s) are currently in this status — disable it instead` }, { status: 409 });
  }

  await db.driverStatusConfig.delete({ where: { id } });
  await audit({ actorId: ctx.userId, action: 'delete', entityType: 'DriverStatusConfig', entityId: id, before: existing });

  return NextResponse.json({ ok: true });
}, 'settings', 'update');
