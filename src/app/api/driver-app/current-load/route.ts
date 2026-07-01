import { NextResponse } from 'next/server';
import { getDriverAppAuthContext } from '@/lib/auth/driverApp';
import { db } from '@/lib/db';

// GET /api/driver-app/current-load — the single active load assigned to this driver
export async function GET() {
  const ctx = await getDriverAppAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const load = await db.load.findFirst({
    where: {
      driverId: ctx.driverId,
      status: { notIn: ['CLOSED', 'CANCELLED', 'PAID', 'INVOICED', 'NEW_LEAD', 'NEGOTIATING'] },
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      client: { select: { companyName: true } },
      truck: { select: { truckNumber: true, trailerType: true } },
      documents: true,
    },
  });

  const driver = await db.driver.findUnique({
    where: { id: ctx.driverId },
    select: { fullName: true, dispatcherId: true, dispatcher: { select: { fullName: true, phone: true } } },
  });

  return NextResponse.json({ load, driver });
}
