import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/rbac';
import { db } from '@/lib/db';

// GET /api/communications/threads — inbox list grouped by counterpart contact
export const GET = withAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const channel = searchParams.get('channel');
  const unreadOnly = searchParams.get('unread') === '1';
  const search = searchParams.get('search')?.trim();

  const comms = await db.communication.findMany({
    where: {
      ...(channel && channel !== 'ALL' ? { channel: channel as any } : {}),
      ...(unreadOnly ? { isRead: false } : {}),
      ...(search ? {
        OR: [
          { from: { contains: search, mode: 'insensitive' } },
          { to: { contains: search, mode: 'insensitive' } },
          { body: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    },
    orderBy: { at: 'desc' },
    take: 300,
    include: {
      relatedClient: { select: { id: true, companyName: true } },
    },
  });

  const threads = new Map<string, any>();
  for (const c of comms) {
    const counterpart = c.direction === 'INBOUND' ? (c.from ?? 'Unknown') : (c.to ?? 'Unknown');
    if (!threads.has(counterpart)) {
      threads.set(counterpart, {
        counterpart,
        displayName: c.relatedClient?.companyName ?? counterpart,
        channel: c.channel,
        lastMessage: c.body ?? c.subject ?? '(no content)',
        lastAt: c.at,
        unreadCount: 0,
        relatedClientId: c.relatedClientId,
      });
    }
    const thread = threads.get(counterpart);
    if (!c.isRead && c.direction === 'INBOUND') thread.unreadCount += 1;
  }

  return NextResponse.json({ threads: Array.from(threads.values()) });
}, 'communications', 'read');
