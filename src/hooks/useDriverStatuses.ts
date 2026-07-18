'use client';

import { useCallback, useEffect, useState } from 'react';

export interface DriverStatusConfigRow {
  id: string;
  code: string;
  label: string;
  color: string;
  icon: string | null;
  description: string | null;
  category: 'OPERATIONAL' | 'UNAVAILABLE' | string;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
  requiresLoad: boolean;
  requiredFields: string[];
  allowedNext: string[];
}

/** Loads the driver status dictionary (admin-editable) from /api/statuses. */
export function useDriverStatuses(includeInactive = false) {
  const [statuses, setStatuses] = useState<DriverStatusConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await fetch(`/api/statuses${includeInactive ? '?all=1' : ''}`, { cache: 'no-store' });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error ?? 'Unable to load statuses');
      setStatuses(payload.statuses as DriverStatusConfigRow[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load statuses');
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { statuses, loading, error, reload };
}
