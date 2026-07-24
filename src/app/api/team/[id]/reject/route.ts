import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, isAdminRole } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { publishRealtimeEvent } from '@/lib/realtime';

const RejectSchema = z.object({
  reason: z.string().min(1).max(1000),
});

// POST /api/team/:id/reject — Owner rejects a pending registration
export const POST = withAuth(async (req, ctx, params) => {
  if (!isAdminRole(ctx.role)) {
    return NextResponse.json({ error: 'Only the Owner can reject registrations' }, { status: 403 });
  }
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });

  const user = await db.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (user.status !== 'PENDING') {
    return NextResponse.json({ error: 'This registration is not pending' }, { status: 409 });
  }

  const { reason } = RejectSchema.parse(await req.json());

  const rejected = await db.user.update({
    where: { id },
    data: { status: 'REJECTED', rejectedReason: reason },
    select: { id: true, fullName: true, status: true },
  });

  await db.notification.create({
    data: {
      userId: id,
      type: 'user.registration.rejected',
      title: 'Your registration was declined',
      body: reason,
      entityType: 'User',
      entityId: id,
    },
  });

  publishRealtimeEvent({
    event: 'user.registration.rejected',
    payload: { userId: id, reason, rejectedBy: ctx.userId },
  });

  await audit({
    actorId: ctx.userId,
    action: 'role_rejected',
    entityType: 'User',
    entityId: id,
    before: { status: 'PENDING', requestedRole: user.requestedRole },
    after: { status: 'REJECTED', reason },
  });

  return NextResponse.json(rejected);
}, 'users', 'update');
