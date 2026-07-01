'use client';

import { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  Package, DollarSign, TrendingUp, Users, CheckCircle2, Star, Phone, MessageSquare, Clock,
} from 'lucide-react';
import { KpiCard } from '@/components/ui/KpiCard';
import { LoadStatusBadge } from '@/components/ui/StatusBadge';
import { LiveBadge } from '@/components/realtime/LiveBadge';
import { usePolling } from '@/hooks/usePolling';
import { formatCurrency } from '@/lib/utils';

export function PortalDashboard() {
  const { data, loading, lastUpdatedAt } = usePolling<any>('/api/portal/dashboard', { intervalMs: 15000 });
  const kpi = data?.kpi ?? {};
  const days = data?.days ?? [];
  const recentLoads = data?.recentLoads ?? [];
  const support = data?.support ?? {};

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Client Portal</h1>
        <LiveBadge lastUpdatedAt={lastUpdatedAt} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Loads This Week" value={kpi.loadsThisWeek ?? 0} icon={<Package className="w-4 h-4 text-brand-light" />} delta={12} loading={loading} />
        <KpiCard label="Gross Revenue" value={formatCurrency(kpi.grossThisWeek ?? 0)} icon={<DollarSign className="w-4 h-4 text-emerald-400" />} iconColor="bg-emerald-500/15" delta={15} loading={loading} />
        <KpiCard label="Avg RPM" value={`$${(kpi.avgRpm ?? 0).toFixed(2)}`} icon={<TrendingUp className="w-4 h-4 text-violet-400" />} iconColor="bg-violet-500/15" delta={6} loading={loading} />
        <KpiCard label="Active Drivers" value={kpi.activeDrivers ?? 0} icon={<Users className="w-4 h-4 text-cyan-400" />} iconColor="bg-cyan-500/15" delta={9} loading={loading} />
        <KpiCard label="Quality Score" value={`${(kpi.qualityScore ?? 4.8).toFixed(1)} / 5`} icon={<Star className="w-4 h-4 text-amber-400" />} iconColor="bg-amber-500/15" delta={0.3} loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-background-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Efficiency This Week</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={days}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2128" vertical={false} />
              <XAxis dataKey="date" stroke="#545C6B" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#545C6B" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#1C1F28', border: '1px solid #2A2D36', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="loads" name="Loads" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="deliveries" name="Deliveries" stroke="#22C55E" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="rpm" name="RPM" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-background-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Gross Revenue</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={days}>
              <XAxis dataKey="date" stroke="#545C6B" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#545C6B" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ background: '#1C1F28', border: '1px solid #2A2D36', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="gross" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-background-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Recent Loads</h3>
            <a href="/portal/loads" className="text-xs text-brand-light hover:underline">View all</a>
          </div>
          <table className="w-full data-table">
            <thead>
              <tr className="border-b border-border-subtle">
                <th>Route</th><th>Driver</th><th>Rate</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentLoads.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-text-muted">No loads yet.</td></tr>
              )}
              {recentLoads.map((l: any) => (
                <tr key={l.id}>
                  <td>{l.pickupCity ?? '—'}, {l.pickupState} → {l.deliveryCity ?? '—'}, {l.deliveryState}</td>
                  <td>{l.driver?.fullName ?? '—'}</td>
                  <td>{formatCurrency(l.rate)}</td>
                  <td><LoadStatusBadge status={l.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4">
          <QualitySurvey />

          <div className="bg-background-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Support Team</h3>
            {support.dispatcher ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-text-muted">Dispatcher</p>
                  <p className="text-sm font-medium text-text-primary">{support.dispatcher.fullName}</p>
                </div>
                <div className="flex gap-2">
                  <a href={`tel:${support.dispatcher.phone ?? ''}`} className="w-8 h-8 rounded-md bg-background-hover flex items-center justify-center text-text-secondary hover:text-text-primary"><Phone className="w-4 h-4" /></a>
                  <a href={`mailto:${support.dispatcher.email ?? ''}`} className="w-8 h-8 rounded-md bg-background-hover flex items-center justify-center text-text-secondary hover:text-text-primary"><MessageSquare className="w-4 h-4" /></a>
                </div>
              </div>
            ) : (
              <p className="text-xs text-text-muted">No dispatcher assigned yet.</p>
            )}
            <div className="flex items-center gap-1.5 mt-3 text-2xs text-text-muted">
              <Clock className="w-3.5 h-3.5" /> Support hours: Mon–Fri 08:00–20:00 (CST)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QualitySurvey() {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!rating) return;
    setBusy(true);
    try {
      await fetch('/api/portal/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment }),
      });
      setSubmitted(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-background-card border border-border rounded-lg p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-2">Weekly Service Quality</h3>
      <p className="text-xs text-text-secondary mb-3">Rate your dispatcher&apos;s work this week</p>
      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)}>
            <Star className={`w-6 h-6 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-text-muted'}`} />
          </button>
        ))}
      </div>
      {!submitted ? (
        <>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional comment…"
            rows={2}
            className="w-full rounded-md bg-background-hover border border-border px-3 py-2 text-sm text-text-primary placeholder:text-text-muted resize-none mb-2"
          />
          <button
            onClick={submit}
            disabled={!rating || busy}
            className="w-full py-2 rounded-md bg-brand hover:bg-brand-dark text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" /> Submit Rating
          </button>
        </>
      ) : (
        <p className="text-sm text-success">Thanks! Your feedback helps us improve.</p>
      )}
    </div>
  );
}
