// ─────────────────────────────────────────────────────────────────────────────
// In-process realtime bus (Server-Sent Events fan-out).
//
// Why SSE and not socket.io: this app is a Next.js App Router deployment where
// a custom HTTP server (required by socket.io) is not available on serverless
// hosts. SSE works over plain HTTP, reconnects automatically in the browser
// and is proxied by the existing /api routes with full Clerk auth + RBAC.
//
// NOTE for multi-instance deployments: this bus is per-process. To fan out
// across instances, plug a Redis pub/sub (or Supabase Realtime) bridge into
// publishRealtimeEvent — subscribers' contract stays the same.
// ─────────────────────────────────────────────────────────────────────────────

export interface RealtimeEvent {
  event: string;                 // "driver.status.updated" | "driver.location.updated" | ...
  driverId?: string;
  loadId?: string | null;
  truckId?: string | null;
  clientId?: string | null;      // tenant (truck-owner company) scope
  dispatcherId?: string | null;  // row-level scope for DISPATCHER role
  payload: unknown;
  at: string;                    // ISO timestamp
}

type Listener = (event: RealtimeEvent) => void;

const globalBus = globalThis as unknown as {
  __realtimeListeners?: Set<Listener>;
};

function listeners(): Set<Listener> {
  if (!globalBus.__realtimeListeners) globalBus.__realtimeListeners = new Set();
  return globalBus.__realtimeListeners;
}

export function subscribeRealtime(listener: Listener): () => void {
  listeners().add(listener);
  return () => listeners().delete(listener);
}

export function publishRealtimeEvent(event: Omit<RealtimeEvent, 'at'> & { at?: string }): void {
  const full: RealtimeEvent = { ...event, at: event.at ?? new Date().toISOString() };
  for (const listener of Array.from(listeners())) {
    try {
      listener(full);
    } catch (err) {
      console.error('[Realtime] listener failed:', err);
    }
  }
}
