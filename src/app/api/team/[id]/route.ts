import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, isAdminRole } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { publishRealtimeEvent } from '@/lib/realtime';

const UpdateUserSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'SENIOR_DISPATCHER', 'DISPATCHER', 'UPDATER', 'RECRUITER', 'FINANCE', 'CLIENT', 'DRIVER']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  isSenior: z.boolean().optional(),
  managerId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),  // binding for CLIENT role
  driverId: z.string().optional().nullable(),  // binding for DRIVER role
  fullName: z.string().min(1).max(200).optional(),
  phone: z.string().max(50).optional().nullable(),
});

// PATCH /api/team/:id — Owner manages an existing user: change role, activate/
// suspend, set manager, re-bind CLIENT/DRIVER accounts. Self-demotion and
// self-suspension are blocked so the company can never lock itself out.
export const PATCH = withAuth(async (req, ctx, params) => {
  if (!isAdminRole(ctx.role)) {
    return NextResponse.json({ error: 'Only the Owner can manage team members' }, { status: 403 });
  }
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });

  const existing = await db.user.findUnique({
    where: { id },
    select: {
      id: true, fullName: true, role: true, status: true, isSenior: true,
      managerId: true, clientId: true, driverId: true,
    },
  });
  if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const data = UpdateUserSchema.parse(await req.json());

  if (id === ctx.userId) {
    if (data.role && data.role !== ctx.role) {
      return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 });
    }
    if (data.status && data.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'You cannot suspend your own account' }, { status: 400 });
    }
  }

  const targetRole = data.role ?? existing.role;

  // Keep the last Owner safe: block demoting/suspending the only active owner
  if ((existing.role === 'OWNER' || existing.role === 'ADMIN')
    && ((data.role && !['OWNER', 'ADMIN'].includes(data.role)) || (data.status && data.status !== 'ACTIVE'))) {
    const otherOwners = await db.user.count({
      where: { id: { not: id }, role: { in: ['OWNER', 'ADMIN'] }, status: 'ACTIVE' },
    });
    if (otherOwners === 0) {
      return NextResponse.json({ error: 'There must always be at least one active Owner' }, { status: 422 });
    }
  }

  // Role bindings
  let clientId = data.clientId !== undefined ? data.clientId : existing.clientId;
  let driverId = data.driverId !== undefined ? data.driverId : existing.driverId;
  if (targetRole === 'CLIENT') {
    if (!clientId) return NextResponse.json({ error: 'CLIENT accounts must be bound to a company' }, { status: 422 });
    const client = await db.client.findFirst({ where: { id: clientId, deletedAt: null } });
    if (!client) return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    driverId = null;
  } else if (targetRole === 'DRIVER') {
    if (!driverId) return NextResponse.json({ error: 'DRIVER accounts must be bound to a driver profile' }, { status: 422 });
    const driver = await db.driver.findFirst({ where: { id: driverId, deletedAt: null } });
    if (!driver) return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 });
    clientId = null;
  } else {
    clientId = null;
    driverId = null;
  }

  if (data.managerId) {
    const manager = await db.user.findFirst({
      where: { id: data.managerId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN', 'SENIOR_DISPATCHER'] } },
    });
    if (!manager) return NextResponse.json({ error: 'Manager must be an active Owner/Admin/Senior Dispatcher' }, { status: 422 });
  }

  const updated = await db.user.update({
    where: { id },
    data: {
      ...(data.role ? { role: data.role } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.isSenior !== undefined ? { isSenior: data.isSenior } : {}),
      ...(data.managerId !== undefined ? { managerId: data.managerId } : {}),
      ...(data.fullName ? { fullName: data.fullName.trim() } : {}),
      ...(data.phone !== undefined ? { phone: data.phone?.trim() || null } : {}),
      clientId,
      driverId,
    },
    select: {
      id: true, fullName: true, email: true, phone: true, role: true, isSenior: true,
      status: true, managerId: true, clientId: true, driverId: true,
    },
  });

  // Tell the affected person what changed
  if (data.role && data.role !== existing.role) {
    await db.notification.create({
      data: {
        userId: id,
        type: 'user.role.changed',
        title: `Your role was changed to ${data.role}`,
        entityType: 'User',
        entityId: id,
      },
    }).catch(() => null);
  }

  publishRealtimeEvent({
    event: 'user.updated',
    payload: { userId: id, role: updated.role, status: updated.status, updatedBy: ctx.userId },
  });

  await audit({
    actorId: ctx.userId,
    action: 'update',
    entityType: 'User',
    entityId: id,
    before: existing,
    after: updated,
  });

  return NextResponse.json(updated);
}, 'users', 'update');

// DELETE /api/team/:id — soft delete a dispatcher/updater/finance/admin
// account by setting status = SUSPENDED (reuses the existing UserStatus enum
// rather than adding a redundant deletedAt column). Suspended users vanish
// from the active team list and role summary, but their historical
// assignments (dispatcherId on Loads/Clients/Drivers, audit log entries,
// commissions) are left untouched.
export const DELETE = withAuth(async (req, ctx, params) => {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });

  if (id === ctx.userId) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (existing.status === 'SUSPENDED') return NextResponse.json({ error: 'User already deleted' }, { status: 409 });

  const deleted = await db.user.update({
    where: { id },
    data: { status: 'SUSPENDED' },
  });

  await audit({ actorId: ctx.userId, action: 'delete', entityType: 'User', entityId: id, before: existing, after: deleted });

  return NextResponse.json({ ok: true });
}, 'users', 'delete');
