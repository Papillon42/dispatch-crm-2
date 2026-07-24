import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export interface DriverAppAuthContext {
  mobileUserId: string;
  driverId: string;
  clerkId: string;
}

/** Driver Mobile App auth — resolves to exactly one driverId (FR-M13, row-level isolation). */
export async function getDriverAppAuthContext(): Promise<DriverAppAuthContext | null> {
  const { userId: clerkId } = auth();
  if (!clerkId) return null;

  const mobileUser = await db.mobileUser.findUnique({
    where: { clerkId },
    select: { id: true, driverId: true, clerkId: true },
  });
  if (mobileUser) {
    return { mobileUserId: mobileUser.id, driverId: mobileUser.driverId, clerkId: mobileUser.clerkId };
  }

  // DRIVER-role accounts created through the registration/approval flow are
  // bound to a Driver profile via User.driverId — same row-level isolation.
  const driverUser = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, role: true, status: true, driverId: true },
  });
  if (driverUser?.role === 'DRIVER' && driverUser.status === 'ACTIVE' && driverUser.driverId) {
    return { mobileUserId: driverUser.id, driverId: driverUser.driverId, clerkId };
  }

  return null;
}

export async function requireDriverAppContext(): Promise<DriverAppAuthContext> {
  const { redirect } = await import('next/navigation');
  const ctx = await getDriverAppAuthContext();
  if (!ctx) redirect('/driver-app/login');
  return ctx as DriverAppAuthContext;
}
