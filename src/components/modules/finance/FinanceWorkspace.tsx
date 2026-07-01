'use client';

import {
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import {
  DollarSign, FileText, TrendingUp, Wallet, Clock, AlertTriangle,
  TrendingDown, Award, Info,
} from 'lucide-react';
import { KpiCard } from '@/components/ui/KpiCard';
import { LiveBadge } from '@/components/realtime/LiveBadge';
import { InvoiceStatusBadge } from '@/components/ui/StatusBadge';
import { usePolling } from '@/hooks/usePolling';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

const DONUT_COLORS = ['#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6', '#06B6D4', '#6B7280'];
const AGING_COLORS: Record<string, string> = { '0-30': '#22C55E', '31-60': '#F59E0B', '61-90': '#F97316', '90+': '#EF4444' };

function ChartCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-background-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export function FinanceWorkspace() {
  const { data, loading, lastUpdatedAt } = usePolling<any>('/api/finance/dashboard?period=month', { intervalMs: 15000 });

  const summary = data?.summary ?? {};
  const cashflow = data?.cashflow ?? {};
  const trend = data?.trend ?? [];
  const byClient = data?.byClient ?? [];
  const byDriver = data?.byDriver ?? [];
  const topLanes = data?.topLanes ?? [];
  const aging = data?.aging ?? { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  const recentInvoices = data?.recentInvoices ?? [];
  const insights = data?.insights ?? [];

  const pieData = [
    { name: 'Paid', value: summary.paidTotal ?? 0 },
    { name: 'Pending', value: summary.pendingTotal ?? 0 },
  ];
  const agingData = Object.entries(aging).map(([bucket, amount]) => ({ bucket, amount }));
  const cashflowData = [
    { label: '7 days', amount: cashflow.days7 ?? 0 },
    { label: '14 days', amount: cashflow.days14 ?? 0 },
    { label: '30 days', amount: cashflow.days30 ?? 0 },
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Finance &amp; Analytics</h1>
          <p className="text-sm text-text-secondary mt-1">Gross, RPM, dispatch fee and cashflow — updated live</p>
        </div>
        <LiveBadge lastUpdatedAt={lastUpdatedAt} />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <KpiCard label="Gross Revenue" value={formatCurrency(summary.grossTotal ?? 0)} icon={<DollarSign className="w-4 h-4 text-brand-light" />} delta={12.4} loading={loading} />
        <KpiCard label="Dispatch Fee" value={formatCurrency(summary.totalDispatchFee ?? 0)} icon={<FileText className="w-4 h-4 text-violet-400" />} iconColor="bg-violet-500/15" delta={15.7} loading={loading} />
        <KpiCard label="Avg RPM" value={summary.avgRpm ? `$${summary.avgRpm.toFixed(2)}` : '—'} icon={<TrendingUp className="w-4 h-4 text-cyan-400" />} iconColor="bg-cyan-500/15" delta={5.3} loading={loading} />
        <KpiCard label="Paid Invoices" value={formatCurrency(summary.paidTotal ?? 0)} icon={<Wallet className="w-4 h-4 text-emerald-400" />} iconColor="bg-emerald-500/15" loading={loading} />
        <KpiCard label="Unpaid Invoices" value={formatCurrency(summary.pendingTotal ?? 0)} icon={<Clock className="w-4 h-4 text-amber-400" />} iconColor="bg-amber-500/15" loading={loading} />
        <KpiCard label="Cashflow (30d)" value={formatCurrency(cashflow.days30 ?? 0)} icon={<TrendingUp className="w-4 h-4 text-blue-400" />} iconColor="bg-blue-500/15" loading={loading} />
        <KpiCard label="Net Company Income" value={formatCurrency(summary.netIncome ?? 0)} icon={<Award className="w-4 h-4 text-lime-400" />} iconColor="bg-lime-500/15" delta={14.6} loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Revenue Trend (weekly)">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2128" vertical={false} />
              <XAxis dataKey="week" stroke="#545C6B" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#545C6B" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ background: '#1C1F28', border: '1px solid #2A2D36', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatCurrency(v)} />
              <Area type="monotone" dataKey="gross" name="Gross Revenue" stroke="#3B82F6" fill="url(#grossGrad)" strokeWidth={2} />
              <Line type="monotone" dataKey="dispatchFee" name="Dispatch Fee" stroke="#8B5CF6" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue by Client">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={byClient} dataKey="gross" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
                {byClient.map((_: any, i: number) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1C1F28', border: '1px solid #2A2D36', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-1 max-h-24 overflow-y-auto">
            {byClient.slice(0, 5).map((c: any, i: number) => (
              <div key={c.clientId} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-text-secondary truncate">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  {c.name}
                </span>
                <span className="text-text-primary">{formatCurrency(c.gross)}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Revenue by Driver (Top 5)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byDriver} layout="vertical" margin={{ left: 8 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={110} stroke="#8A91A0" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#1C1F28', border: '1px solid #2A2D36', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="gross" fill="#3B82F6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Top Lanes by RPM">
          <div className="space-y-2">
            {topLanes.length === 0 && <p className="text-sm text-text-muted text-center py-6">Not enough data yet.</p>}
            {topLanes.map((lane: any) => (
              <div key={lane.lane} className="flex items-center justify-between text-sm px-2 py-1.5 rounded-md hover:bg-background-hover">
                <span className="text-text-secondary truncate max-w-[60%]">{lane.lane}</span>
                <span className="text-text-muted text-xs">{lane.loads} loads</span>
                <span className="text-text-primary font-medium">${lane.rpm.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Paid vs Pending">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={3}>
                <Cell fill="#22C55E" />
                <Cell fill="#F59E0B" />
              </Pie>
              <Tooltip contentStyle={{ background: '#1C1F28', border: '1px solid #2A2D36', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatCurrency(v)} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Accounts Receivable Aging">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={agingData}>
              <XAxis dataKey="bucket" stroke="#545C6B" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#545C6B" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ background: '#1C1F28', border: '1px solid #2A2D36', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {agingData.map((d: any) => <Cell key={d.bucket} fill={AGING_COLORS[d.bucket]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Cashflow Forecast">
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={cashflowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2128" vertical={false} />
              <XAxis dataKey="label" stroke="#545C6B" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#545C6B" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ background: '#1C1F28', border: '1px solid #2A2D36', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatCurrency(v)} />
              <Line type="monotone" dataKey="amount" stroke="#22C55E" strokeWidth={2} dot={{ r: 4, fill: '#22C55E' }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="lg:col-span-2 bg-background-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Insights &amp; Alerts</h3>
          <div className="space-y-2">
            {insights.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Info className="w-4 h-4" /> No alerts — finances look healthy.
              </div>
            )}
            {insights.map((insight: any, i: number) => (
              <div
                key={i}
                className={cn(
                  'flex items-start gap-2.5 px-3 py-2.5 rounded-md border',
                  insight.type === 'danger' && 'bg-danger/10 border-danger/30',
                  insight.type === 'warning' && 'bg-warning/10 border-warning/30',
                  insight.type === 'info' && 'bg-info/10 border-info/30',
                )}
              >
                {insight.type === 'danger' ? (
                  <TrendingDown className="w-4 h-4 text-danger mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className={cn('w-4 h-4 mt-0.5 flex-shrink-0', insight.type === 'warning' ? 'text-warning' : 'text-info')} />
                )}
                <div>
                  <p className="text-sm font-medium text-text-primary">{insight.title}</p>
                  <p className="text-xs text-text-secondary">{insight.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-background-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">Recent Invoices</h3>
          <span className="text-xs text-text-muted">{recentInvoices.length} shown</span>
        </div>
        <table className="w-full data-table">
          <thead>
            <tr className="border-b border-border-subtle">
              <th>Invoice #</th>
              <th>Client</th>
              <th>Issued</th>
              <th>Due</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentInvoices.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-text-muted">No invoices yet.</td></tr>
            )}
            {recentInvoices.map((inv: any) => (
              <tr key={inv.id}>
                <td className="text-brand-light font-medium">{inv.number}</td>
                <td>{inv.client?.companyName ?? '—'}</td>
                <td>{formatDate(inv.issuedAt)}</td>
                <td>{formatDate(inv.dueAt)}</td>
                <td>{formatCurrency(inv.amount)}</td>
                <td><InvoiceStatusBadge status={inv.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
