import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { ensureUserForClerkId } from '@/lib/auth/rbac';
import { publishRealtimeEvent } from '@/lib/realtime';
import { audit } from '@/lib/audit';

// Registration / role-request endpoint. Unlike every other API route this one
// must work for PENDING users (they have no granted role yet), so it uses
// Clerk auth directly instead of withAuth().

const REQUESTABLE_ROLES = ['CLIENT', 'DISPATCHER', 'RECRUITER', 'DRIVER', 'OWNER'] as const;

// GET /api/onboarding — the caller's registration state
export async function GET() {
  const { userId: clerkId } = auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await ensureUserForClerkId(clerkId);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const full = await db.user.findUnique({
    where: { id: user.id },
    select: {
      id: true, fullName: true, email: true, role: true, status: true,
      requestedRole: true, roleRequestNote: true, rejectedReason: true,
      clientId: true, driverId: true,
    },
  });

  return NextResponse.json(full);
}

const RequestRoleSchema = z.object({
  role: z.enum(REQUESTABLE_ROLES),
  fullName: z.string().min(1).max(200).optional(),
  phone: z.string().max(50).optional(),
  companyName: z.string().max(200).optional(), // for CLIENT / DRIVER context
  note: z.string().max(1000).optional(),
});

// POST /api/onboarding — request a role (goes to the Owner for approval)
export async function POST(req: Request) {
  const { userId: clerkId } = auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await ensureUserForClerkId(clerkId);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.status === 'ACTIVE') {
    return NextResponse.json({ error: 'Your account is already active' }, { status: 409 });
  }

  const data = RequestRoleSchema.parse(await req.json());
  const note = [
    data.companyName ? `Company: ${data.companyName}` : null,
    data.phone ? `Phone: ${data.phone}` : null,
    data.note?.trim() || null,
  ].filter(Boolean).join(' · ') || null;

  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      requestedRole: data.role,
      roleRequestNote: note,
      status: 'PENDING',
      rejectedReason: null,
      ...(data.fullName?.trim() ? { fullName: data.fullName.trim() } : {}),
      ...(data.phone?.trim() ? { phone: data.phone.trim() } : {}),
    },
    select: { id: true, fullName: true, email: true, requestedRole: true, status: true },
  });

  // Notify every Owner/Admin that someone is waiting for approval
  const owners = await db.user.findMany({
    where: { role: { in: ['OWNER', 'ADMIN'] }, status: 'ACTIVE' },
    select: { id: true },
  });
  if (owners.length > 0) {
    await db.notification.createMany({
      data: owners.map((o) => ({
        userId: o.id,
        type: 'user.registration.requested',
        title: `New registration: ${updated.fullName} requests the ${data.role} role`,
        body: [updated.email, note].filter(Boolean).join(' · '),
        entityType: 'User',
        entityId: updated.id,
        metadata: { requestedRole: data.role } as object,
      })),
    });
  }

  publishRealtimeEvent({
    event: 'user.registration.requested',
    payload: {
      userId: updated.id,
      fullName: updated.fullName,
      email: updated.email,
      requestedRole: data.role,
      note,
    },
  });

  await audit({
    actorId: user.id,
    action: 'role_requested',
    entityType: 'User',
    entityId: user.id,
    after: { requestedRole: data.role, note },
  });

  return NextResponse.json(updated);
}
