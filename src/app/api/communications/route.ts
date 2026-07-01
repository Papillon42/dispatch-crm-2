import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { CommunicationChannel } from '@prisma/client';

// GET /api/communications?counterpart=... — full message history with one contact
export const GET = withAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const counterpart = searchParams.get('counterpart');
  if (!counterpart) return NextResponse.json({ error: 'Missing counterpart' }, { status: 400 });

  const messages = await db.communication.findMany({
    where: { OR: [{ from: counterpart }, { to: counterpart }] },
    orderBy: { at: 'asc' },
    include: {
      relatedClient: { select: { id: true, companyName: true, dispatchFeePercent: true } },
      relatedLoad: { select: { id: true, loadCode: true, status: true, pickupCity: true, deliveryCity: true } },
      relatedBroker: { select: { id: true, name: true, phone: true, email: true } },
      createdBy: { select: { id: true, fullName: true } },
    },
  });

  // Mark inbound as read on open
  await db.communication.updateMany({
    where: { OR: [{ from: counterpart }, { to: counterpart }], isRead: false, direction: 'INBOUND' },
    data: { isRead: true },
  });

  return NextResponse.json({ messages });
}, 'communications', 'read');

const CreateMessageSchema = z.object({
  counterpart: z.string().min(1),
  channel: z.nativeEnum(CommunicationChannel),
  body: z.string().min(1),
  subject: z.string().optional(),
  relatedClientId: z.string().optional(),
  relatedLoadId: z.string().optional(),
  relatedBrokerId: z.string().optional(),
});

// POST /api/communications — send an outbound message (internal simulation for
// channels not yet wired to a live provider — see TZ M8/M9/M10, stage 4)
export const POST = withAuth(async (req, ctx) => {
  const body = await req.json();
  const data = CreateMessageSchema.parse(body);

  const message = await db.communication.create({
    data: {
      channel: data.channel,
      direction: 'OUTBOUND',
      from: 'dispatch@company.com',
      to: data.counterpart,
      subject: data.subject,
      body: data.body,
      isRead: true,
      relatedClientId: data.relatedClientId,
      relatedLoadId: data.relatedLoadId,
      relatedBrokerId: data.relatedBrokerId,
      createdById: ctx.userId,
    },
  });

  await audit({ actorId: ctx.userId, action: 'create', entityType: 'Communication', entityId: message.id, after: message });

  return NextResponse.json(message, { status: 201 });
}, 'communications', 'create');
