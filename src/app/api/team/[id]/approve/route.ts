import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, isAdminRole } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { publishRealtimeEvent } from '@/lib/realtime';

const ApproveSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'SENIOR_DISPATCHER', 'DISPATCHER', 'UPDATER', 'RECRUITER', 'FINANCE', 'CLIENT', 'DRIVER']),
  clientId: z.string().optional().nullable(),   // required when role = CLIENT
  driverId: z.string().optional().nullable(),   // required when role = DRIVER
});

// POST /api/team/:id/approve — Owner grants the requested (or a different)
// role to a pending registration and binds CLIENT/DRIVER accounts to their
// company / driver profile.
export const POST = withAuth(async (req, ctx, params) => {
  if (!isAdminRole(ctx.role)) {
    return NextResponse.json({ error: 'Only the Owner can approve registrations' }, { status: 403 });
  }
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });

  const user = await db.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (user.status !== 'PENDING') {
    return NextResponse.json({ error: 'This registration is not pending' }, { status: 409 });
  }

  const data = ApproveSchema.parse(await req.json());

  if (data.role === 'CLIENT') {
    if (!data.clientId) return NextResponse.json({ error: 'Select the company this client account belongs to' }, { status: 422 });
    const client = await db.client.findFirst({ where: { id: data.clientId, deletedAt: null } });
    if (!client) return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }
  if (data.role === 'DRIVER') {
    if (!data.driverId) return NextResponse.json({ error: 'Select the driver profile this account belongs to' }, { status: 422 });
    const driver = await db.driver.findFirst({ where: { id: data.driverId, deletedAt: null } });
    if (!driver) return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 });
  }

  const approved = await db.user.update({
    where: { id },
    data: {
      role: data.role,
      status: 'ACTIVE',
      approvedById: ctx.userId,
      approvedAt: new Date(),
      rejectedReason: null,
      clientId: data.role === 'CLIENT' ? data.clientId : null,
      driverId: data.role === 'DRIVER' ? data.driverId : null,
      isSenior: data.role === 'OWNER' || data.role === 'ADMIN' || data.role === 'SENIOR_DISPATCHER',
    },
    select: { id: true, fullName: true, email: true, role: true, status: true, clientId: true, driverId: true },
  });

  await db.notification.create({
    data: {
      userId: id,
      type: 'user.registration.approved',
      title: `Your registration is approved — role: ${data.role}`,
      body: 'You now have access to your workspace.',
      entityType: 'User',
      entityId: id,
    },
  });

  publishRealtimeEvent({
    event: 'user.registration.approved',
    payload: { userId: id, role: data.role, approvedBy: ctx.userId },
  });

  await audit({
    actorId: ctx.userId,
    action: 'role_approved',
    entityType: 'User',
    entityId: id,
    before: { status: 'PENDING', requestedRole: user.requestedRole },
    after: { status: 'ACTIVE', role: data.role, clientId: approved.clientId, driverId: approved.driverId },
  });

  return NextResponse.json(approved);
}, 'users', 'update');
