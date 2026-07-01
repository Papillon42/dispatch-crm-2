import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { z } from 'zod';

// GET /api/map/drivers - all active drivers with latest location
export const GET = withAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId');
  const dispatcherId = searchParams.get('dispatcherId');
  const status = searchParams.get('status');
  const state = searchParams.get('state');

  const where: any = {
    status: status ? status as any : { in: ['ON_LOAD', 'AVAILABLE'] },
    ...(clientId && { clientId }),
    ...(dispatcherId && { dispatcherId }),
  };

  const drivers = await db.driver.findMany({
    where,
    include: {
      currentTruck: { select: { truckNumber: true, trailerType: true } },
      client: { select: { id: true, companyName: true } },
      locationUpdates: {
        orderBy: { at: 'desc' },
        take: 1,
      },
      loads: {
        where: { status: { notIn: ['CLOSED', 'CANCELLED', 'PAID'] } },
        take: 1,
        orderBy: { updatedAt: 'desc' },
        include: {
          issues: { where: { status: { not: 'RESOLVED' } }, select: { id: true, type: true } },
        },
      },
      dispatcher: { select: { id: true, fullName: true } },
      updater: { select: { id: true, fullName: true } },
    },
  });

  // Filter by state if provided (based on last location label)
  const filtered = state
    ? drivers.filter((d) => d.locationUpdates[0]?.label?.includes(state))
    : drivers;

  return NextResponse.json({ drivers: filtered });
}, 'map', 'read');

// Note: per-driver location POST lives in a separate route file:
// src/app/api/map/drivers/[driverId]/location/route.ts
// (kept out of this file because this file has no [driverId] param)
