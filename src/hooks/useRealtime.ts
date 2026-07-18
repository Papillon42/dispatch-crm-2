'use client';

import { useEffect, useRef, useState } from 'react';

export type RealtimeConnectionState = 'connecting' | 'connected' | 'disconnected';

export interface RealtimeMessage {
  event: string;
  driverId?: string;
  loadId?: string | null;
  truckId?: string | null;
  payload: any;
  at: string;
}

interface UseRealtimeOptions {
  /** which event names to subscribe to */
  events?: string[];
  onEvent?: (message: RealtimeMessage) => void;
  enabled?: boolean;
}

/**
 * Subscribes to /api/realtime/stream (SSE). The browser's EventSource
 * reconnects automatically; we track connection state so the UI can show a
 * live/offline indicator (spec §6). Falls back gracefully — consumers should
 * still poll at a slow interval as a safety net.
 */
export function useRealtime(options: UseRealtimeOptions = {}) {
  const { events = ['driver.status.updated', 'driver.location.updated'], onEvent, enabled = true } = options;
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>('connecting');
  const [lastEventAt, setLastEventAt] = useState<Date | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const eventsKey = events.join(',');

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let source: EventSource | null = null;
    let closed = false;

    function connect() {
      if (closed) return;
      source = new EventSource('/api/realtime/stream');
      setConnectionState('connecting');

      source.addEventListener('connected', () => setConnectionState('connected'));
      source.onopen = () => setConnectionState('connected');
      source.onerror = () => {
        // EventSource auto-reconnects; surface the degraded state meanwhile
        setConnectionState('disconnected');
      };

      for (const eventName of eventsKey.split(',').filter(Boolean)) {
        source.addEventListener(eventName, (raw: MessageEvent) => {
          try {
            const message = JSON.parse(raw.data) as RealtimeMessage;
            setLastEventAt(new Date());
            onEventRef.current?.(message);
          } catch {
            // malformed frame — ignore
          }
        });
      }
    }

    connect();
    return () => {
      closed = true;
      source?.close();
    };
  }, [eventsKey, enabled]);

  return { connectionState, lastEventAt };
}
