import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/rbac';
import { db } from '@/lib/db';

// GET /api/team — internal users, optionally filtered by role, with headline counts by role
export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role');

  const where: any = {
    status: { not: 'SUSPENDED' },
    ...(role && role !== 'ALL' ? { role } : {}),
  };

  const [users, grouped] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
      select: { id: true, fullName: true, email: true, phone: true, role: true, isSenior: true, status: true, createdAt: true },
    }),
    db.user.groupBy({ by: ['role'], where: { status: { not: 'SUSPENDED' } }, _count: { _all: true } }),
  ]);

  const roleCounts: Record<string, number> = {};
  grouped.forEach((g) => { roleCounts[g.role] = g._count._all; });

  return NextResponse.json({ users, roleCounts });
}, 'users', 'read');
