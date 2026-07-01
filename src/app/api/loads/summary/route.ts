import { NextResponse } from 'next/server';
import { withAuth, getDispatcherFilter } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { FUNNEL_ORDER } from '@/lib/loadFunnel';

// GET /api/loads/summary — funnel counts + $ per stage, plus header KPIs
export const GET = withAuth(async (req, ctx) => {
  const scopeFilter = getDispatcherFilter(ctx);

  const [grouped, bookedToday, overdue, activeAgg] = await Promise.all([
    db.load.groupBy({
      by: ['status'],
      where: scopeFilter as any,
      _count: { _all: true },
      _sum: { rate: true },
    }),
    db.load.aggregate({
      where: { ...(scopeFilter as any), createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      _sum: { rate: true },
      _count: { _all: true },
    }),
    db.load.count({
      where: {
        ...(scopeFilter as any),
        status: { notIn: ['DELIVERED', 'POD_UPLOADED', 'INVOICED', 'PAID', 'CLOSED', 'CANCELLED'] },
        deliveryAt: { lt: new Date() },
      },
    }),
    db.load.aggregate({
      where: { ...(scopeFilter as any), status: { notIn: ['CLOSED', 'CANCELLED'] } },
      _count: { _all: true },
      _avg: { rpm: true },
    }),
  ]);

  const byStatus: Record<string, { count: number; sum: number }> = {};
  grouped.forEach((g) => {
    byStatus[g.status] = { count: g._count._all, sum: g._sum.rate ?? 0 };
  });

  const funnel = FUNNEL_ORDER.map((status) => ({
    status,
    count: byStatus[status]?.count ?? 0,
    sum: byStatus[status]?.sum ?? 0,
  }));

  return NextResponse.json({
    funnel,
    kpi: {
      bookedTodayAmount: bookedToday._sum.rate ?? 0,
      bookedTodayCount: bookedToday._count._all,
      activeLoads: activeAgg._count._all,
      avgRpm: activeAgg._avg.rpm ?? 0,
      overdueLoads: overdue,
    },
    generatedAt: new Date().toISOString(),
  });
}, 'loads', 'read');
