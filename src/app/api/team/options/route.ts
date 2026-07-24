import { NextResponse } from 'next/server';
import { withAuth, isAdminRole } from '@/lib/auth/rbac';
import { db } from '@/lib/db';

// GET /api/team/options — lookup lists for the Owner's team management UI:
// companies (CLIENT binding), driver profiles (DRIVER binding) and possible
// managers (team hierarchy for dispatchers).
export const GET = withAuth(async (req, ctx) => {
  if (!isAdminRole(ctx.role)) {
    return NextResponse.json({ error: 'Only the Owner can manage the team' }, { status: 403 });
  }

  const [clients, drivers, managers] = await Promise.all([
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
    db.user.findMany({
      where: { status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN', 'SENIOR_DISPATCHER'] } },
      orderBy: { fullName: 'asc' },
      select: { id: true, fullName: true, role: true },
    }),
  ]);

  return NextResponse.json({ clients, drivers, managers });
}, 'users', 'read');
