import { NextResponse } from 'next/server';
import { withAuth, getDriverFilter } from '@/lib/auth/rbac';
import { db } from '@/lib/db';

// GET /api/drivers/:id/status-history — timeline of driver status changes.
// History is append-only: there is intentionally no DELETE endpoint.
export const GET = withAuth(async (req, ctx, params) => {
  const driverId = params?.id;
  if (!driverId) return NextResponse.json({ error: 'Missing driver ID' }, { status: 400 });

  const driver = await db.driver.findFirst({
    where: { id: driverId, ...getDriverFilter(ctx) },
    select: { id: true },
  });
  if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10), 1);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);

  const [entries, total] = await Promise.all([
    db.driverStatusHistory.findMany({
      where: { driverId },
      orderBy: { changedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        changedBy: { select: { id: true, fullName: true, role: true } },
        load: { select: { id: true, loadCode: true } },
        truck: { select: { id: true, truckNumber: true } },
      },
    }),
    db.driverStatusHistory.count({ where: { driverId } }),
  ]);

  return NextResponse.json({ entries, total, page, limit });
}, 'drivers', 'read');
