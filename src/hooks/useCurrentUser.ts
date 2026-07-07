'use client';

import { usePolling } from './usePolling';

export interface CurrentUser {
  id: string | null;
  fullName: string | null;
  role: string | null;
  isSenior: boolean;
}

/**
 * Thin wrapper around /api/me for client components that need to gate UI
 * by role (e.g. "only Owner sees Delete"). Server-side RBAC in each route
 * handler remains the real enforcement point — this is purely so the UI
 * doesn't show controls a role can't actually use.
 */
export function useCurrentUser() {
  const { data, loading } = usePolling<CurrentUser>('/api/me', { intervalMs: 60000 });
  return { user: data, loading };
}
