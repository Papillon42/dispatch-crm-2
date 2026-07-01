import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import {
  calcRpm, calcDispatchFee, calcCompanyRevenue,
  calcSeniorCommission, calcNetIncome, calcCashflowForecast,
} from '@/lib/finance';

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
      case 'day':  startDate = new Date(now.setHours(0, 0, 0, 0)); break;
      case 'week': startDate = new Date(now.setDate(now.getDate() - 7)); break;
      default:     startDate = new Date(now.setDate(1)); // month
    }
  }

  const [loads, invoices, settings] = await Promise.all([
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
    db.invoice.findMany({
      where: { status: { not: 'PAID' } },
      select: { amount: true, paidAmount: true, dueAt: true, status: true, issuedAt: true },
    }),
    db.companySettings.findFirst(),
  ]);

  const companySettings = settings ?? { companyPercentage: 10, seniorCommissionRate: 1.5, fixedExpenses: 0 };

  const grossTotal = loads.reduce((s, l) => s + l.rate, 0);
  const totalMiles = loads.reduce((s, l) => s + l.totalMiles, 0);
  const avgRpm = calcRpm(grossTotal, totalMiles);

  // Group by client
  const byClient: Record<string, { name: string; gross: number; dispatchFee: number }> = {};
  loads.forEach((l) => {
    if (!l.client) return;
    if (!byClient[l.clientId]) {
      byClient[l.clientId] = { name: l.client.companyName, gross: 0, dispatchFee: 0 };
    }
    byClient[l.clientId].gross += l.rate;
    byClient[l.clientId].dispatchFee += calcDispatchFee(l.rate, l.client.dispatchFeePercent);
  });

  // Group by driver
  const byDriver: Record<string, { name: string; gross: number; loads: number }> = {};
  loads.forEach((l) => {
    if (!l.driver) return;
    if (!byDriver[l.driverId!]) byDriver[l.driverId!] = { name: l.driver.fullName, gross: 0, loads: 0 };
    byDriver[l.driverId!].gross += l.rate;
    byDriver[l.driverId!].loads += 1;
  });

  const companyRevenue = calcCompanyRevenue(grossTotal, companySettings.companyPercentage);
  const seniorCommission = calcSeniorCommission(grossTotal, companySettings.seniorCommissionRate);
  const netIncome = calcNetIncome(companyRevenue, seniorCommission, companySettings.fixedExpenses);

  const cashflow7 = calcCashflowForecast(invoices as any, 7);
  const cashflow14 = calcCashflowForecast(invoices as any, 14);
  const cashflow30 = calcCashflowForecast(invoices as any, 30);

  const totalDispatchFee = Object.values(byClient).reduce((s, c) => s + c.dispatchFee, 0);

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
    },
    cashflow: { days7: cashflow7, days14: cashflow14, days30: cashflow30 },
    byClient: Object.entries(byClient)
      .map(([id, v]) => ({ clientId: id, ...v }))
      .sort((a, b) => b.gross - a.gross),
    byDriver: Object.entries(byDriver)
      .map(([id, v]) => ({ driverId: id, ...v }))
      .sort((a, b) => b.gross - a.gross)
      .slice(0, 10),
    settings: companySettings,
  });
}, 'finance', 'read');
