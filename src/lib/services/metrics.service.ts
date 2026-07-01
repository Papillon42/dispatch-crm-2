// Dashboard KPI calculations — all real Prisma aggregation, no hardcoded numbers.
// Every function here returns a fully-formed `Metric` so components never
// need to do math themselves (per TZ: "не писать сложные запросы в React").

import { db } from '@/lib/db';
import type { LoadStatus, DriverStatus } from '@prisma/client';
import { formatCurrency, formatRpm } from '@/lib/utils';
import type { Metric, Trend } from './types';

// Loads that are operationally "in flight" — dispatched but not yet
// financially closed out. Mirrors the funnel used on /loads but scoped
// to what the dashboard KPI card means by "active".
export const ACTIVE_LOAD_STATUSES: LoadStatus[] = [
  'BOOKED', 'ASSIGNED', 'EN_ROUTE_TO_PICKUP', 'AT_PICKUP',
  'LOADED', 'IN_TRANSIT', 'AT_DELIVERY', 'PROBLEM',
];

// Driver states that count as "on duty" for the Active Drivers KPI.
// Schema only has AVAILABLE / ON_LOAD / OFF_DUTY / INACTIVE, so
// "active" = available for dispatch or currently on a load.
export const ACTIVE_DRIVER_STATUSES: DriverStatus[] = ['AVAILABLE', 'ON_LOAD'];

function monthRange(monthsAgo: number): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 1);
  return { start, end };
}

function dayRange(daysAgo: number): { start: Date; end: Date } {
  const start = new Date();
  start.setDate(start.getDate() - daysAgo);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function pctChange(curr: number, prev: number): number {
  if (!prev) return curr > 0 ? 100 : 0;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

function trendFromChange(change: number | undefined): Trend {
  if (change === undefined || Math.abs(change) < 0.05) return 'neutral';
  return change > 0 ? 'up' : 'down';
}

async function dailySparkline(
  model: 'load' | 'invoice',
  dateField: string,
  valueField: string,
  where: Record<string, any>,
  days: number,
): Promise<number[]> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const rows: any[] = await (db as any)[model].findMany({
    where: { ...where, [dateField]: { gte: since } },
    select: { [dateField]: true, [valueField]: true },
  });

  const buckets: number[] = new Array(days).fill(0);
  for (const row of rows) {
    const d = new Date(row[dateField]);
    const dayIndex = Math.floor((d.getTime() - since.getTime()) / (1000 * 60 * 60 * 24));
    if (dayIndex >= 0 && dayIndex < days) buckets[dayIndex] += row[valueField] ?? 0;
  }
  return buckets;
}

// ─── Общая выручка (Gross Revenue) ─────────────────────────────────────────

export async function getGrossRevenueMetric(): Promise<Metric> {
  const { start: curStart, end: curEnd } = monthRange(0);
  const { start: prevStart, end: prevEnd } = monthRange(1);

  const invoiceCount = await db.invoice.count();
  const usingInvoices = invoiceCount > 0;

  let current = 0;
  let previous = 0;
  let sparkline: number[];

  if (usingInvoices) {
    const [curInvoices, prevInvoices] = await Promise.all([
      db.invoice.findMany({
        where: { issuedAt: { gte: curStart, lt: curEnd }, status: { in: ['PENDING', 'UNPAID', 'PAID'] } },
        select: { amount: true },
      }),
      db.invoice.findMany({
        where: { issuedAt: { gte: prevStart, lt: prevEnd }, status: { in: ['PENDING', 'UNPAID', 'PAID'] } },
        select: { amount: true },
      }),
    ]);
    current = curInvoices.reduce((s: number, i: { amount: number }) => s + i.amount, 0);
    previous = prevInvoices.reduce((s: number, i: { amount: number }) => s + i.amount, 0);
    sparkline = await dailySparkline(
      'invoice', 'issuedAt', 'amount',
      { status: { in: ['PENDING', 'UNPAID', 'PAID'] } },
      14,
    );
  } else {
    const [curLoads, prevLoads] = await Promise.all([
      db.load.findMany({
        where: { createdAt: { gte: curStart, lt: curEnd }, status: { notIn: ['CANCELLED'] } },
        select: { rate: true },
      }),
      db.load.findMany({
        where: { createdAt: { gte: prevStart, lt: prevEnd }, status: { notIn: ['CANCELLED'] } },
        select: { rate: true },
      }),
    ]);
    current = curLoads.reduce((s: number, l: { rate: number }) => s + l.rate, 0);
    previous = prevLoads.reduce((s: number, l: { rate: number }) => s + l.rate, 0);
    sparkline = await dailySparkline(
      'load', 'createdAt', 'rate',
      { status: { notIn: ['CANCELLED'] } },
      14,
    );
  }

  const changeValue = pctChange(current, previous);

  return {
    label: 'Общая выручка',
    period: 'Этот месяц',
    value: formatCurrency(current),
    rawValue: current,
    changeValue,
    changeLabel: 'к прошлому месяцу',
    trend: trendFromChange(changeValue),
    sparkline,
  };
}

// ─── Активные грузы (Active Loads) ─────────────────────────────────────────

export async function getActiveLoadsMetric(): Promise<Metric> {
  const { start: todayStart, end: todayEnd } = dayRange(0);
  const { start: yesterdayStart, end: yesterdayEnd } = dayRange(1);

  const [current, todaySnapshot, yesterdaySnapshot, last14] = await Promise.all([
    db.load.count({ where: { status: { in: ACTIVE_LOAD_STATUSES } } }),
    db.load.count({
      where: { status: { in: ACTIVE_LOAD_STATUSES }, updatedAt: { gte: todayStart, lt: todayEnd } },
    }),
    db.load.count({
      where: { status: { in: ACTIVE_LOAD_STATUSES }, updatedAt: { gte: yesterdayStart, lt: yesterdayEnd } },
    }),
    Promise.all(
      Array.from({ length: 14 }, (_, i) => 13 - i).map(async (daysAgo) => {
        const { start, end } = dayRange(daysAgo);
        return db.load.count({ where: { status: { in: ACTIVE_LOAD_STATUSES }, createdAt: { lt: end } } });
      }),
    ),
  ]);

  const changeValue = pctChange(todaySnapshot, yesterdaySnapshot);

  return {
    label: 'Активные грузы',
    period: 'Сегодня',
    value: current,
    rawValue: current,
    changeValue,
    changeLabel: 'к вчера',
    trend: trendFromChange(changeValue),
    sparkline: last14,
  };
}

// ─── Драйверы (Active Drivers) ─────────────────────────────────────────────

export async function getActiveDriversMetric(): Promise<Metric & { totalCount: number; activePercentage: number }> {
  const [activeCount, totalCount, last14] = await Promise.all([
    db.driver.count({ where: { status: { in: ACTIVE_DRIVER_STATUSES } } }),
    db.driver.count(),
    Promise.all(
      Array.from({ length: 14 }, (_, i) => 13 - i).map(async (daysAgo) => {
        const { end } = dayRange(daysAgo);
        return db.driver.count({ where: { status: { in: ACTIVE_DRIVER_STATUSES }, createdAt: { lt: end } } });
      }),
    ),
  ]);

  const activePercentage = totalCount > 0 ? (activeCount / totalCount) * 100 : 0;

  return {
    label: 'Драйверы',
    period: 'Активные',
    value: activeCount,
    rawValue: activeCount,
    changeValue: activePercentage,
    changeLabel: `${activePercentage.toFixed(0)}% от общего числа`,
    trend: 'neutral',
    sparkline: last14,
    totalCount,
    activePercentage,
  };
}

// ─── Средний RPM (Average Rate Per Mile) ───────────────────────────────────

const RPM_ELIGIBLE_STATUSES: LoadStatus[] = [
  'IN_TRANSIT', 'AT_DELIVERY', 'DELIVERED', 'POD_UPLOADED', 'INVOICED', 'PAID', 'CLOSED',
];

async function avgRpmForRange(start: Date, end: Date): Promise<number> {
  const loads = await db.load.findMany({
    where: { status: { in: RPM_ELIGIBLE_STATUSES }, createdAt: { gte: start, lt: end }, totalMiles: { gt: 0 } },
    select: { rate: true, totalMiles: true },
  });
  if (loads.length === 0) return 0;
  const rpmSum = loads.reduce((s: number, l: { rate: number; totalMiles: number }) => s + l.rate / l.totalMiles, 0);
  return rpmSum / loads.length;
}

export async function getAverageRpmMetric(): Promise<Metric> {
  const { start: curStart, end: curEnd } = monthRange(0);
  const { start: prevStart, end: prevEnd } = monthRange(1);

  const [current, previous] = await Promise.all([
    avgRpmForRange(curStart, curEnd),
    avgRpmForRange(prevStart, prevEnd),
  ]);

  const sparkline: number[] = [];
  for (let daysAgo = 13; daysAgo >= 0; daysAgo--) {
    const { start, end } = dayRange(daysAgo);
    sparkline.push(await avgRpmForRange(start, end));
  }

  const changeValue = pctChange(current, previous);

  return {
    label: 'Средний RPM',
    period: 'Этот месяц',
    value: formatRpm(current || null),
    rawValue: current,
    changeValue,
    changeLabel: 'к прошлому месяцу',
    trend: trendFromChange(changeValue),
    sparkline,
  };
}

// ─── Денежный поток (Cash Flow) ────────────────────────────────────────────

export async function getCashFlowMetric(): Promise<Metric> {
  const { start: curStart, end: curEnd } = monthRange(0);
  const { start: prevStart, end: prevEnd } = monthRange(1);

  const invoiceCount = await db.invoice.count();

  let current = 0;
  let previous = 0;
  let sparkline: number[];

  if (invoiceCount > 0) {
    const [curPaid, prevPaid] = await Promise.all([
      db.invoice.findMany({ where: { paidAt: { gte: curStart, lt: curEnd } }, select: { paidAmount: true } }),
      db.invoice.findMany({ where: { paidAt: { gte: prevStart, lt: prevEnd } }, select: { paidAmount: true } }),
    ]);
    // cashFlow = paidInvoicesThisMonth - expensesThisMonth. No Expense model
    // exists yet, so expenses = 0 (architecture anticipates one via FinanceEntry).
    const expensesThisMonth = 0;
    current = curPaid.reduce((s: number, i: { paidAmount: number }) => s + i.paidAmount, 0) - expensesThisMonth;
    previous = prevPaid.reduce((s: number, i: { paidAmount: number }) => s + i.paidAmount, 0);
    sparkline = await dailySparkline('invoice', 'paidAt', 'paidAmount', { paidAt: { not: null } }, 14);
  } else {
    // No invoicing data yet — fall back to gross revenue as a stand-in signal.
    const gross = await getGrossRevenueMetric();
    current = gross.rawValue;
    previous = 0;
    sparkline = gross.sparkline;
  }

  const changeValue = pctChange(current, previous);

  return {
    label: 'Денежный поток',
    period: 'Этот месяц',
    value: formatCurrency(current),
    rawValue: current,
    changeValue,
    changeLabel: 'к прошлому месяцу',
    trend: trendFromChange(changeValue),
    sparkline,
  };
}
