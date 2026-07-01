import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDriverAppAuthContext } from '@/lib/auth/driverApp';
import { db } from '@/lib/db';

// GET /api/driver-app/chat — thread with the assigned dispatcher
export async function GET() {
  const ctx = await getDriverAppAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const driver = await db.driver.findUnique({ where: { id: ctx.driverId }, select: { fullName: true, dispatcherId: true, dispatcher: { select: { fullName: true } } } });

  const messages = await db.communication.findMany({
    where: { relatedDriverId: ctx.driverId, channel: 'INTERNAL' },
    orderBy: { at: 'asc' },
    take: 100,
  });

  return NextResponse.json({ messages, dispatcherName: driver?.dispatcher?.fullName ?? 'Dispatcher' });
}

const BodySchema = z.object({ body: z.string().min(1) });

// POST /api/driver-app/chat — driver sends a message to their dispatcher
export async function POST(req: Request) {
  const ctx = await getDriverAppAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { body: text } = BodySchema.parse(body);

  const driver = await db.driver.findUnique({ where: { id: ctx.driverId }, select: { fullName: true } });

  const message = await db.communication.create({
    data: {
      channel: 'INTERNAL',
      direction: 'INBOUND',
      from: driver?.fullName ?? 'Driver',
      to: 'dispatch',
      body: text,
      isRead: false,
      relatedDriverId: ctx.driverId,
    },
  });

  return NextResponse.json(message, { status: 201 });
}
