import { NextResponse } from 'next/server';
import { withAuth, canScope } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { subscribeRealtime, type RealtimeEvent } from '@/lib/realtime';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/realtime/stream — Server-Sent Events feed of driver status / GPS
// events, filtered by the caller's RBAC scope (tenant + row-level).
// The browser EventSource reconnects automatically; a heartbeat every 25s
// keeps proxies from closing the connection.
export const GET = withAuth(async (req, ctx) => {
  const mapScope = canScope(ctx.role, 'read', 'map');
  if (mapScope === 'none' && ctx.role !== 'DRIVER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Row-level visibility:
  //   dispatcher scope — events of their own drivers only
  //   CLIENT scope     — events of their own company only
  //   DRIVER scope     — events about themselves only
  //   null             — all (owner / admin / updater / finance-with-map)
  let visibleDispatcherIds: string[] | null = null;
  const visibleClientId = ctx.role === 'CLIENT' ? (ctx.clientId ?? '__none__') : null;
  const visibleDriverId = ctx.role === 'DRIVER' ? (ctx.driverId ?? '__none__') : null;
  if (ctx.role === 'DISPATCHER') {
    visibleDispatcherIds = [ctx.userId];
  } else if (ctx.role === 'SENIOR_DISPATCHER') {
    const team = await db.user.findMany({
      where: { managerId: ctx.userId },
      select: { id: true },
    });
    visibleDispatcherIds = [ctx.userId, ...team.map((u) => u.id)];
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          // controller already closed
        }
      };

      send(`event: connected\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);

      unsubscribe = subscribeRealtime((event: RealtimeEvent) => {
        if (visibleDispatcherIds !== null) {
          if (!event.dispatcherId || !visibleDispatcherIds.includes(event.dispatcherId)) return;
        }
        if (visibleClientId !== null && event.clientId !== visibleClientId) return;
        if (visibleDriverId !== null && event.driverId !== visibleDriverId) return;
        send(`event: ${event.event}\ndata: ${JSON.stringify(event)}\n\n`);
      });

      heartbeat = setInterval(() => {
        send(`: heartbeat ${Date.now()}\n\n`);
      }, 25_000);

      req.signal.addEventListener('abort', () => {
        if (heartbeat) clearInterval(heartbeat);
        unsubscribe?.();
        try { controller.close(); } catch { /* already closed */ }
      });
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      unsubscribe?.();
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
});
