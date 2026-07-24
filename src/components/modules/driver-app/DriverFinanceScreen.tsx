'use client';

import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  CircleDollarSign, Clock, Gauge, MapPin, Package, Route, TrendingUp,
} from 'lucide-react';
import { usePolling } from '@/hooks/usePolling';
import { useChartColors } from '@/lib/chartColors';
import { LiveBadge } from '@/components/realtime/LiveBadge';
import { DriverStatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { statusMeta } from '@/lib/driverStatus';

export function DriverFinanceScreen() {
  const { data, loading, lastUpdatedAt } = usePolling<any>('/api/driver-app/finance', { intervalMs: 30000 });
  const colors = useChartColors();

  if (loading && !data) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-background-hover animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="p-8 text-center text-sm text-text-secondary">
        {data?.error ?? 'Unable to load your finance data.'}
      </div>
    );
  }

  const { driver, totals, weeks, recentLoads, utilization } = data;

  const tiles = [
    {
      icon: <CircleDollarSign className="h-4 w-4 text-success" />,
      label: driver.payPerMile != null ? 'My Earnings (est.)' : 'Gross on My Loads',
      value: driver.payPerMile != null && totals.estimatedEarnings != null
        ? formatCurrency(totals.estimatedEarnings)
        : formatCurrency(totals.gross),
      hint: driver.payPerMile != null ? `$${driver.payPerMile.toFixed(2)}/mi × ${formatNumber(totals.loadedMiles || totals.totalMiles)} mi` : 'total rate of completed loads',
    },
    {
      icon: <Gauge className="h-4 w-4 text-brand-light" />,
      label: 'Average Rate / Mile',
      value: `$${(totals.avgRpm ?? 0).toFixed(2)}`,
      hint: 'across completed loads',
    },
    {
      icon: <Route className="h-4 w-4 text-amber-400" />,
      label: 'Miles Driven',
      value: formatNumber(totals.totalMiles),
      hint: `${formatNumber(totals.loadedMiles)} loaded`,
    },
    {
      icon: <Package className="h-4 w-4 text-purple-400" />,
      label: 'Completed Loads',
      value: formatNumber(totals.completedLoads),
      hint: totals.onTimePct != null ? `${totals.onTimePct}% on time` : 'on-time: n/a',
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-text-primary">{driver.fullName}</p>
          <div className="mt-1"><DriverStatusBadge status={driver.status} /></div>
        </div>
        <LiveBadge lastUpdatedAt={lastUpdatedAt} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg border border-border bg-background-card p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-2xs uppercase tracking-wider text-text-muted">{tile.label}</p>
              {tile.icon}
            </div>
            <p className="text-xl font-bold text-text-primary mt-1.5">{tile.value}</p>
            <p className="text-2xs text-text-muted mt-0.5">{tile.hint}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-background-card p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-text-muted" />
          <p className="text-sm font-medium text-text-primary">Weekly {driver.payPerMile != null ? 'earnings' : 'gross'}</p>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={weeks} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
            <CartesianGrid stroke={colors.gridLine} vertical={false} />
            <XAxis dataKey="week" stroke={colors.textMuted} fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke={colors.textMuted} fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: colors.textSecondary }}
            />
            <Bar
              dataKey={driver.payPerMile != null ? 'earnings' : 'gross'}
              fill={colors.brand}
              radius={[3, 3, 0, 0]}
              name={driver.payPerMile != null ? 'Earnings $' : 'Gross $'}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border border-border bg-background-card p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <Gauge className="h-4 w-4 text-text-muted" />
          <p className="text-sm font-medium text-text-primary">Rate per mile by week</p>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={weeks} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
            <CartesianGrid stroke={colors.gridLine} vertical={false} />
            <XAxis dataKey="week" stroke={colors.textMuted} fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke={colors.textMuted} fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: colors.textSecondary }}
              formatter={(value: number) => [`$${Number(value).toFixed(2)}/mi`, 'RPM']}
            />
            <Line type="monotone" dataKey="rpm" stroke={colors.success} strokeWidth={2} dot={false} name="RPM" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {utilization.length > 0 && (
        <div className="rounded-lg border border-border bg-background-card p-3.5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-text-muted" />
            <p className="text-sm font-medium text-text-primary">My time, last 30 days</p>
          </div>
          <div className="space-y-2">
            {utilization.slice(0, 6).map((u: { status: string; hours: number; pct: number }) => {
              const meta = statusMeta(u.status);
              return (
                <div key={u.status}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">{meta.label}</span>
                    <span className="text-text-muted">{u.hours}h · {u.pct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-background-hover overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${u.pct}%`, backgroundColor: meta.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-background-card overflow-hidden">
        <div className="flex items-center gap-2 px-3.5 py-3 border-b border-border-subtle">
          <MapPin className="h-4 w-4 text-text-muted" />
          <p className="text-sm font-medium text-text-primary">Recent loads</p>
        </div>
        <div className="divide-y divide-border-subtle">
          {recentLoads.length === 0 && (
            <p className="p-4 text-sm text-text-secondary">No loads yet.</p>
          )}
          {recentLoads.map((load: any) => (
            <div key={load.id} className="px-3.5 py-2.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-text-primary">{load.loadCode}</p>
                <p className="text-sm font-semibold text-text-primary">{formatCurrency(load.rate)}</p>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-xs text-text-muted truncate">
                  {[load.pickupCity, load.pickupState].filter(Boolean).join(', ')} → {[load.deliveryCity, load.deliveryState].filter(Boolean).join(', ')}
                </p>
                <p className="text-xs text-text-muted flex-shrink-0 ml-2">
                  {load.rpm != null ? `$${load.rpm.toFixed(2)}/mi` : '—'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
