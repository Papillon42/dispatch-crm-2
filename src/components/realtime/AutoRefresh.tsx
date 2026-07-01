'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AutoRefreshProps {
  /** How often to re-run the server component's data fetch. Spec allows up to 30s; default is snappier. */
  intervalMs?: number;
  /** Optional label shown next to the live indicator, e.g. "Live" / "Обновление в реальном времени". */
  label?: string;
  className?: string;
}

/**
 * Drop into any server-rendered page to make it "live": calls router.refresh()
 * on an interval, which re-executes the page's server-side Prisma queries
 * and streams fresh data down without a full navigation/reload.
 */
export function AutoRefresh({ intervalMs = 10000, label = 'Live', className }: AutoRefreshProps) {
  const router = useRouter();
  const [secondsAgo, setSecondsAgo] = useState(0);
  const lastRefresh = useRef(Date.now());

  useEffect(() => {
    const refreshTimer = setInterval(() => {
      router.refresh();
      lastRefresh.current = Date.now();
      setSecondsAgo(0);
    }, intervalMs);

    const tickTimer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastRefresh.current) / 1000));
    }, 1000);

    return () => {
      clearInterval(refreshTimer);
      clearInterval(tickTimer);
    };
  }, [router, intervalMs]);

  return (
    <div className={className ?? 'flex items-center gap-2 text-2xs text-text-muted'}>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
      <span className="font-medium text-success">{label}</span>
      <span>· updated {secondsAgo}s ago</span>
    </div>
  );
}
