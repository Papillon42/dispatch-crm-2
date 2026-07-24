import { NextResponse } from 'next/server';
import type { LoadStatus } from '@prisma/client';
import { getDriverAppAuthContext } from '@/lib/auth/driverApp';
import { db } from '@/lib/db';
import { calcRpm } from '@/lib/finance';

const COMPLETED_STATUSES: LoadStatus[] = ['DELIVERED', 'POD_UPLOADED', 'INVOICED', 'PAID', 'CLOSED'];

// GET /api/driver-app/finance — the driver's PERSONAL finance & performance:
// miles, gross on their loads, average rate per mile, weekly dynamics,
// estimated personal earnings (payPerMile × loaded miles), utilization and
// on-time performance. Strictly scoped to the logged-in driver.
export async function GET() {
  const ctx = await getDriverAppAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 7 * 8);
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);

  const [driver, completedLoads, recentLoads, statusDurations] = await Promise.all([
    db.driver.findUnique({
      where: { id: ctx.driverId },
      select: { id: true, fullName: true, payPerMile: true, score: true, status: true },
    }),
    db.load.findMany({
      where: { driverId: ctx.driverId, status: { in: COMPLETED_STATUSES } },
      select: {
        id: true, rate: true, totalMiles: true, loadedMiles: true, emptyMiles: true,
        deliveryAt: true, actualDeliveryAt: true, updatedAt: true,
      },
    }),
    db.load.findMany({
      where: { driverId: ctx.driverId },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        id: true, loadCode: true, status: true, rate: true, totalMiles: true,
        pickupCity: true, pickupState: true, deliveryCity: true, deliveryState: true,
        actualDeliveryAt: true, updatedAt: true,
      },
    }),
    db.driverStatusHistory.findMany({
      where: { driverId: ctx.driverId, changedAt: { gte: monthAgo }, durationSeconds: { not: null } },
      select: { previousStatus: true, durationSeconds: true },
    }),
  ]);

  if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });

  const totalMiles = completedLoads.reduce((s, l) => s + (l.totalMiles ?? 0), 0);
  const loadedMiles = completedLoads.reduce((s, l) => s + (l.loadedMiles ?? 0), 0);
  const gross = completedLoads.reduce((s, l) => s + l.rate, 0);
  const avgRpm = calcRpm(gross, totalMiles) ?? 0;
  const estimatedEarnings = driver.payPerMile != null ? (loadedMiles || totalMiles) * driver.payPerMile : null;

  // On-time performance
  const withDates = completedLoads.filter((l) => l.deliveryAt && l.actualDeliveryAt);
  const onTime = withDates.filter((l) => l.actualDeliveryAt! <= l.deliveryAt!).length;
  const onTimePct = withDates.length ? Math.round((onTime / withDates.length) * 100) : null;

  // Weekly series (last 8 weeks by completion date)
  const weeks: Array<{ week: string; loads: number; miles: number; gross: number; rpm: number; earnings: number | null }> = [];
  for (let i = 7; i >= 0; i--) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const bucket = completedLoads.filter((l) => {
      const at = l.actualDeliveryAt ?? l.updatedAt;
      return at >= start && at < end;
    });
    const wMiles = bucket.reduce((s, l) => s + (l.totalMiles ?? 0), 0);
    const wGross = bucket.reduce((s, l) => s + l.rate, 0);
    weeks.push({
      week: `${start.getMonth() + 1}/${start.getDate()}`,
      loads: bucket.length,
      miles: Math.round(wMiles),
      gross: Math.round(wGross),
      rpm: calcRpm(wGross, wMiles) ?? 0,
      earnings: driver.payPerMile != null ? Math.round(wMiles * driver.payPerMile) : null,
    });
  }

  // Time-in-status utilization (last 30 days)
  const secondsByStatus: Record<string, number> = {};
  let totalSeconds = 0;
  for (const row of statusDurations) {
    if (!row.previousStatus || !row.durationSeconds) continue;
    secondsByStatus[row.previousStatus] = (secondsByStatus[row.previousStatus] ?? 0) + row.durationSeconds;
    totalSeconds += row.durationSeconds;
  }
  const utilization = Object.entries(secondsByStatus)
    .map(([status, seconds]) => ({
      status,
      hours: Math.round(seconds / 360) / 10,
      pct: totalSeconds ? Math.round((seconds / totalSeconds) * 100) : 0,
    }))
    .sort((a, b) => b.hours - a.hours);

  return NextResponse.json({
    driver: {
      fullName: driver.fullName,
      payPerMile: driver.payPerMile,
      score: driver.score,
      status: driver.status,
    },
    totals: {
      completedLoads: completedLoads.length,
      totalMiles: Math.round(totalMiles),
      loadedMiles: Math.round(loadedMiles),
      gross: Math.round(gross),
      avgRpm,
      estimatedEarnings: estimatedEarnings != null ? Math.round(estimatedEarnings) : null,
      onTimePct,
    },
    weeks,
    recentLoads: recentLoads.map((l) => ({
      ...l,
      rpm: calcRpm(l.rate, l.totalMiles ?? 0),
    })),
    utilization,
  });
}
