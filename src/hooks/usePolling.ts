'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface PollingOptions {
  intervalMs?: number;
  enabled?: boolean;
}

interface PollingState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdatedAt: Date | null;
  refresh: () => void;
}

/**
 * Polls a JSON API endpoint on an interval so charts/KPIs stay "live"
 * without a full page reload. Satisfies FR-M1-08 (realtime dashboards,
 * polling <=30s) without requiring a websocket layer for the MVP.
 */
export function usePolling<T = any>(url: string | null, options: PollingOptions = {}): PollingState<T> {
  const { intervalMs = 10000, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOnce = useCallback(async () => {
    if (!url) return;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const json = await res.json();
      setData(json);
      setError(null);
      setLastUpdatedAt(new Date());
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (!enabled || !url) return;
    setLoading(true);
    fetchOnce();
    timerRef.current = setInterval(fetchOnce, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [url, intervalMs, enabled, fetchOnce]);

  return { data, loading, error, lastUpdatedAt, refresh: fetchOnce };
}
