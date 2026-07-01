import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import {
  calcRpm, calcDispatchFee, calcCompanyRevenue,
  calcSeniorCommission, calcNetIncome, calcCashflowForecast, calcAgingBucket,
} from '@/lib/finance';

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

// GET /api/finance/dashboard
export const GET = withAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') ?? 'month'; // day | week | month | custom
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const now = new Date();
  let startDate: Date;
  let endDate = now;

  if (from && to) {
    startDate = new Date(from);
    endDate = new Date(to);
  } else {
    switch (period) {
      case 'day':  startDate = new Date(new Date().setHours(0, 0, 0, 0)); break;
      case 'week': startDate = new Date(new Date().setDate(now.getDate() - 7)); break;
      default:     startDate = new Date(new Date().setDate(1)); // month
    }
  }

  const trendStart = new Date(now);
  trendStart.setDate(trendStart.getDate() - 42); // last 6 weeks for the trend chart

  const [loads, trendLoads, invoices, unpaidInvoices, settings, recentInvoices] = await Promise.all([
    db.load.findMany({
      where: {
        status: { in: ['DELIVERED', 'POD_UPLOADED', 'INVOICED', 'PAID', 'CLOSED'] },
        updatedAt: { gte: startDate, lte: endDate },
      },
      include: {
        client: { select: { id: true, companyName: true, dispatchFeePercent: true } },
        driver: { select: { id: true, fullName: true } },
        dispatcher: { select: { id: true, fullName: true, isSenior: true } },
      },
    }),
    db.load.findMany({
      where: {
        status: { in: ['DELIVERED', 'POD_UPLOADED', 'INVOICED', 'PAID', 'CLOSED'] },
        updatedAt: { gte: trendStart },
      },
      select: {
        rate: true, updatedAt: true, clientId: true,
        client: { select: { dispatchFeePercent: true } },
        pickupState: true, deliveryState: true, totalMiles: true,
      },
    }),
    db.invoice.findMany({
      select: { amount: true, paidAmount: true, dueAt: true, issuedAt: true, status: true },
    }),
    db.invoice.findMany({
      where: { status: { not: 'PAID' } },
      select: { amount: true, paidAmount: true, dueAt: true, status: true, issuedAt: true },
    }),
    db.companySettings.findFirst(),
    db.invoice.findMany({
      orderBy: { issuedAt: 'desc' },
      take: 8,
      include: { client: { select: { companyName: true } } },
    }),
  ]);

  const companySettings = settings ?? { companyPercentage: 10, seniorCommissionRate: 1.5, fixedExpenses: 0, targetRpm: 2.5 };

  const grossTotal = loads.reduce((s, l) => s + l.rate, 0);
  const totalMiles = loads.reduce((s, l) => s + l.totalMiles, 0);
  const avgRpm = calcRpm(grossTotal, totalMiles);

  // Group by client (donut)
  const byClient: Record<string, { name: string; gross: number; dispatchFee: number }> = {};
  loads.forEach((l) => {
    if (!l.client) return;
    if (!byClient[l.clientId]) {
      byClient[l.clientId] = { name: l.client.companyName, gross: 0, dispatchFee: 0 };
    }
    byClient[l.clientId].gross += l.rate;
    byClient[l.clientId].dispatchFee += calcDispatchFee(l.rate, l.client.dispatchFeePercent);
  });

  // Group by driver (top 5)
  const byDriver: Record<string, { name: string; gross: number; loads: number }> = {};
  loads.forEach((l) => {
    if (!l.driver) return;
    if (!byDriver[l.driverId!]) byDriver[l.driverId!] = { name: l.driver.fullName, gross: 0, loads: 0 };
    byDriver[l.driverId!].gross += l.rate;
    byDriver[l.driverId!].loads += 1;
  });

  // Top lanes by RPM
  const byLane: Record<string, { lane: string; gross: number; miles: number; loads: number }> = {};
  loads.forEach((l: any) => {
    if (!l.pickupState || !l.deliveryState) return;
    const lane = `${l.pickupCity ?? l.pickupState}, ${l.pickupState} → ${l.deliveryCity ?? l.deliveryState}, ${l.deliveryState}`;
    if (!byLane[lane]) byLane[lane] = { lane, gross: 0, miles: 0, loads: 0 };
    byLane[lane].gross += l.rate;
    byLane[lane].miles += l.totalMiles;
    byLane[lane].loads += 1;
  });
  const topLanes = Object.values(byLane)
    .map((l) => ({ ...l, rpm: calcRpm(l.gross, l.miles) ?? 0 }))
    .sort((a, b) => b.rpm - a.rpm)
    .slice(0, 6);

  // Weekly revenue trend (last 6 weeks): gross + dispatch fee
  const weekBuckets: Record<string, { weekStart: Date; gross: number; dispatchFee: number }> = {};
  trendLoads.forEach((l: any) => {
    const wk = startOfWeek(l.updatedAt);
    const key = wk.toISOString();
    if (!weekBuckets[key]) weekBuckets[key] = { weekStart: wk, gross: 0, dispatchFee: 0 };
    weekBuckets[key].gross += l.rate;
    weekBuckets[key].dispatchFee += calcDispatchFee(l.rate, l.client?.dispatchFeePercent ?? 10);
  });
  const trend = Object.values(weekBuckets)
    .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
    .slice(-6)
    .map((w) => ({
      week: `${w.weekStart.getMonth() + 1}/${w.weekStart.getDate()}`,
      gross: Math.round(w.gross),
      dispatchFee: Math.round(w.dispatchFee),
    }));

  // Paid vs pending
  const paidTotal = invoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + i.amount, 0);
  const pendingTotal = invoices.filter((i) => i.status !== 'PAID').reduce((s, i) => s + (i.amount - i.paidAmount), 0);

  // Aging buckets
  const aging: Record<'0-30' | '31-60' | '61-90' | '90+', number> = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  unpaidInvoices.forEach((inv) => {
    const bucket = calcAgingBucket(inv.issuedAt, inv.dueAt);
    aging[bucket] += inv.amount - inv.paidAmount;
  });

  const companyRevenue = calcCompanyRevenue(grossTotal, companySettings.companyPercentage);
  const seniorCommission = calcSeniorCommission(grossTotal, companySettings.seniorCommissionRate);
  const netIncome = calcNetIncome(companyRevenue, seniorCommission, companySettings.fixedExpenses);

  const cashflow7 = calcCashflowForecast(unpaidInvoices as any, 7);
  const cashflow14 = calcCashflowForecast(unpaidInvoices as any, 14);
  const cashflow30 = calcCashflowForecast(unpaidInvoices as any, 30);

  const totalDispatchFee = Object.values(byClient).reduce((s, c) => s + c.dispatchFee, 0);

  // Insights & alerts
  const insights: { type: 'warning' | 'danger' | 'info'; title: string; message: string }[] = [];
  if (avgRpm !== null && avgRpm < companySettings.targetRpm) {
    insights.push({
      type: 'warning',
      title: 'Low RPM',
      message: `Average RPM is below target ($${companySettings.targetRpm.toFixed(2)}). Current: $${avgRpm.toFixed(2)}.`,
    });
  }
  const overdueCount = unpaidInvoices.filter((i) => i.status === 'OVERDUE').length;
  const overdueAmount = unpaidInvoices.filter((i) => i.status === 'OVERDUE').reduce((s, i) => s + (i.amount - i.paidAmount), 0);
  if (overdueCount > 0) {
    insights.push({
      type: 'danger',
      title: 'Overdue Payments',
      message: `${overdueCount} invoices overdue totaling $${overdueAmount.toLocaleString()}.`,
    });
  }
  const unpaidShare = invoices.length ? (pendingTotal / (paidTotal + pendingTotal || 1)) * 100 : 0;
  if (unpaidShare > 15) {
    insights.push({
      type: 'warning',
      title: 'High Unpaid Share',
      message: `${unpaidShare.toFixed(1)}% of invoices are still unpaid.`,
    });
  }

  return NextResponse.json({
    period: { from: startDate, to: endDate },
    summary: {
      grossTotal,
      totalMiles,
      avgRpm,
      companyRevenue,
      seniorCommission,
      netIncome,
      totalDispatchFee,
      loadCount: loads.length,
      paidTotal,
      pendingTotal,
    },
    cashflow: { days7: cashflow7, days14: cashflow14, days30: cashflow30 },
    trend,
    byClient: Object.entries(byClient)
      .map(([id, v]) => ({ clientId: id, ...v }))
      .sort((a, b) => b.gross - a.gross),
    byDriver: Object.entries(byDriver)
      .map(([id, v]) => ({ driverId: id, ...v }))
      .sort((a, b) => b.gross - a.gross)
      .slice(0, 5),
    topLanes,
    aging,
    recentInvoices,
    insights,
    settings: companySettings,
    generatedAt: new Date().toISOString(),
  });
}, 'finance', 'read');
