import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/rbac';
import { db } from '@/lib/db';

// GET /api/notifications — the caller's in-app notifications (newest first)
export const GET = withAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get('unread') === '1';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '30', 10), 100);

  const where = { userId: ctx.userId, ...(unreadOnly ? { readAt: null } : {}) };
  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit }),
    db.notification.count({ where: { userId: ctx.userId, readAt: null } }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
});

const MarkReadSchema = z.object({
  ids: z.array(z.string()).optional(), // omit = mark all read
});

// PATCH /api/notifications — mark own notifications as read
export const PATCH = withAuth(async (req, ctx) => {
  const { ids } = MarkReadSchema.parse(await req.json().catch(() => ({})));
  await db.notification.updateMany({
    where: {
      userId: ctx.userId,
      readAt: null,
      ...(ids?.length ? { id: { in: ids } } : {}),
    },
    data: { readAt: new Date() },
  });
  const unreadCount = await db.notification.count({ where: { userId: ctx.userId, readAt: null } });
  return NextResponse.json({ ok: true, unreadCount });
});
