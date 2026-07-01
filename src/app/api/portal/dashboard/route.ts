import { NextResponse } from 'next/server';
import { getPortalAuthContext } from '@/lib/auth/portal';
import { db } from '@/lib/db';
import { calcRpm } from '@/lib/finance';

// GET /api/portal/dashboard — everything the truck-owner home screen needs,
// strictly scoped to the logged-in PortalUser's clientId.
export async function GET() {
  const ctx = await getPortalAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [client, activeLoads, completedThisWeek, drivers, recentLoads, weekLoads, survey, dispatcher] = await Promise.all([
    db.client.findUnique({ where: { id: ctx.clientId } }),
    db.load.count({ where: { clientId: ctx.clientId, status: { notIn: ['CLOSED', 'CANCELLED', 'PAID'] } } }),
    db.load.count({ where: { clientId: ctx.clientId, status: { in: ['DELIVERED', 'POD_UPLOADED', 'INVOICED', 'PAID', 'CLOSED'] }, updatedAt: { gte: weekAgo } } }),
    db.driver.count({ where: { clientId: ctx.clientId, status: { not: 'INACTIVE' } } }),
    db.load.findMany({
      where: { clientId: ctx.clientId },
      orderBy: { updatedAt: 'desc' },
      take: 6,
      include: { driver: { select: { fullName: true } } },
    }),
    db.load.findMany({
      where: { clientId: ctx.clientId, updatedAt: { gte: weekAgo } },
      select: { rate: true, totalMiles: true, status: true, updatedAt: true },
    }),
    db.survey.findFirst({ where: { clientId: ctx.clientId }, orderBy: { at: 'desc' } }),
    db.client.findUnique({ where: { id: ctx.clientId }, select: { dispatcher: { select: { id: true, fullName: true, phone: true, email: true } } } }),
  ]);

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const gross = weekLoads.reduce((s, l) => s + l.rate, 0);
  const miles = weekLoads.reduce((s, l) => s + l.totalMiles, 0);
  const avgRpm = calcRpm(gross, miles) ?? 0;
  const deliveredCount = weekLoads.filter((l) => ['DELIVERED', 'POD_UPLOADED', 'INVOICED', 'PAID', 'CLOSED'].includes(l.status)).length;

  // Daily breakdown for the week (efficiency + gross charts)
  const days: { date: string; loads: number; deliveries: number; rpm: number; gross: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const dayLoads = weekLoads.filter((l) => new Date(l.updatedAt) >= d && new Date(l.updatedAt) < next);
    const dayGross = dayLoads.reduce((s, l) => s + l.rate, 0);
    const dayMiles = dayLoads.reduce((s, l) => s + l.totalMiles, 0);
    days.push({
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      loads: dayLoads.length,
      deliveries: dayLoads.filter((l) => ['DELIVERED', 'POD_UPLOADED', 'INVOICED', 'PAID', 'CLOSED'].includes(l.status)).length,
      rpm: calcRpm(dayGross, dayMiles) ?? 0,
      gross: Math.round(dayGross),
    });
  }

  return NextResponse.json({
    client: { companyName: client.companyName, mc: client.mc, dot: client.dot },
    kpi: {
      loadsThisWeek: weekLoads.length,
      grossThisWeek: gross,
      avgRpm,
      activeDrivers: drivers,
      deliveredThisWeek: deliveredCount,
      qualityScore: survey?.rating ?? 4.8,
    },
    activeLoads,
    completedThisWeek,
    recentLoads,
    days,
    support: {
      dispatcher: dispatcher?.dispatcher ?? null,
    },
    generatedAt: new Date().toISOString(),
  });
}
