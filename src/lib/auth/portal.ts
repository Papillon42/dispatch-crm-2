import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export interface PortalAuthContext {
  portalUserId: string;
  clientId: string;
  clerkId: string;
}

/**
 * Client Portal auth — completely separate from the internal RBAC matrix.
 * A portal session only ever resolves to a single clientId, and every portal
 * query MUST filter by it (FR-M12-06: hard data isolation for truck owners).
 */
export async function getPortalAuthContext(): Promise<PortalAuthContext | null> {
  const { userId: clerkId } = auth();
  if (!clerkId) return null;

  const portalUser = await db.portalUser.findUnique({
    where: { clerkId },
    select: { id: true, clientId: true, clerkId: true },
  });

  if (!portalUser) return null;

  return { portalUserId: portalUser.id, clientId: portalUser.clientId, clerkId: portalUser.clerkId };
}
