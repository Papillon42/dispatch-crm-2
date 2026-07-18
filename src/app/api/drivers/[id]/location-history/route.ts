import { NextResponse } from 'next/server';
import { withAuth, getDriverFilter } from '@/lib/auth/rbac';
import { db } from '@/lib/db';

// GET /api/drivers/:id/location-history — GPS trail (paginated, newest first)
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
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500);
  const loadId = searchParams.get('loadId') ?? undefined;
  const since = searchParams.get('since');

  const where = {
    driverId,
    ...(loadId ? { loadId } : {}),
    ...(since ? { at: { gte: new Date(since) } } : {}),
  };

  const [entries, total] = await Promise.all([
    db.locationUpdate.findMany({
      where,
      orderBy: { at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, lat: true, lng: true, label: true, speed: true, heading: true,
        accuracy: true, source: true, eta: true, etaLabel: true, at: true, loadId: true,
      },
    }),
    db.locationUpdate.count({ where }),
  ]);

  return NextResponse.json({ entries, total, page, limit });
}, 'drivers', 'read');
