import { NextResponse } from 'next/server';
import { withAuth, isAdminRole } from '@/lib/auth/rbac';
import { db } from '@/lib/db';

// GET /api/team/pending — registrations waiting for the Owner's approval,
// plus the lookup lists needed to bind CLIENT/DRIVER accounts.
export const GET = withAuth(async (req, ctx) => {
  if (!isAdminRole(ctx.role)) {
    return NextResponse.json({ error: 'Only the Owner can review registrations' }, { status: 403 });
  }

  const [pending, clients, drivers] = await Promise.all([
    db.user.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, fullName: true, email: true, phone: true,
        requestedRole: true, roleRequestNote: true, createdAt: true,
      },
    }),
    db.client.findMany({
      where: { deletedAt: null },
      orderBy: { companyName: 'asc' },
      select: { id: true, companyName: true },
    }),
    db.driver.findMany({
      where: { deletedAt: null },
      orderBy: { fullName: 'asc' },
      select: { id: true, fullName: true, client: { select: { companyName: true } } },
    }),
  ]);

  return NextResponse.json({ pending, clients, drivers });
}, 'users', 'read');
