'use client';

import { useState } from 'react';
import { FileBarChart, Download, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const REPORT_TYPES = [
  { key: 'daily_operations', label: 'Daily Operations', desc: 'Loads booked, delivered, and in-transit today' },
  { key: 'weekly_client', label: 'Weekly Client Report', desc: 'Per-client gross, RPM, and load counts' },
  { key: 'driver_performance', label: 'Driver Performance', desc: 'Score, on-time rate, incidents per driver' },
  { key: 'owner_profitability', label: 'Truck Owner Profitability', desc: 'Gross and dispatch fee by owner' },
  { key: 'dispatcher_performance', label: 'Dispatcher Performance', desc: 'Gross and load count by dispatcher' },
  { key: 'updater_quality', label: 'Updater Quality', desc: 'ETA accuracy and update frequency' },
  { key: 'cashflow', label: 'Cashflow Report', desc: '7/14/30-day forecast vs actuals' },
  { key: 'problem_report', label: 'Problem Report', desc: 'Open issues by type and resolution time' },
];

export function ReportsWorkspace() {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ key: string; data: any } | null>(null);

  async function generate(key: string) {
    setLoadingKey(key);
    setPreview(null);
    try {
      // MVP preview pulls from existing live endpoints; full PDF/Excel export
      // engine + scheduling is post-MVP (roadmap stage 3-7, FR-M14-02/03).
      let data: any = null;
      if (key === 'cashflow' || key === 'weekly_client' || key === 'dispatcher_performance') {
        data = await fetch('/api/finance/dashboard?period=month', { cache: 'no-store' }).then((r) => r.json());
      } else if (key === 'daily_operations') {
        data = await fetch('/api/loads/summary', { cache: 'no-store' }).then((r) => r.json());
      } else {
        data = { note: 'Live preview for this report will use dedicated aggregation once scheduling (FR-M14-02) ships.' };
      }
      setPreview({ key, data });
    } finally {
      setLoadingKey(null);
    }
  }

  const activeType = REPORT_TYPES.find((r) => r.key === preview?.key);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Reports</h1>
        <p className="text-sm text-text-secondary mt-1">Generate and preview operational reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORT_TYPES.map((r) => (
          <div key={r.key} className="bg-background-card border border-border rounded-lg p-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-md bg-brand-muted flex items-center justify-center flex-shrink-0">
                <FileBarChart className="w-4 h-4 text-brand-light" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">{r.label}</p>
                <p className="text-xs text-text-secondary">{r.desc}</p>
              </div>
            </div>
            <button
              onClick={() => generate(r.key)}
              disabled={loadingKey === r.key}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-text-primary text-xs font-medium hover:bg-background-hover flex-shrink-0 disabled:opacity-50"
            >
              {loadingKey === r.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Generate
            </button>
          </div>
        ))}
      </div>

      {preview && (
        <div className="bg-background-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-3">{activeType?.label} — Preview</h3>
          {preview.data?.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <StatBox label="Gross" value={formatCurrency(preview.data.summary.grossTotal ?? 0)} />
              <StatBox label="Avg RPM" value={preview.data.summary.avgRpm ? `$${preview.data.summary.avgRpm.toFixed(2)}` : '—'} />
              <StatBox label="Dispatch Fee" value={formatCurrency(preview.data.summary.totalDispatchFee ?? 0)} />
              <StatBox label="Net Income" value={formatCurrency(preview.data.summary.netIncome ?? 0)} />
            </div>
          )}
          {preview.data?.kpi && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <StatBox label="Active Loads" value={preview.data.kpi.activeLoads} />
              <StatBox label="Overdue" value={preview.data.kpi.overdueLoads} />
              <StatBox label="Booked Today" value={formatCurrency(preview.data.kpi.bookedTodayAmount ?? 0)} />
              <StatBox label="Avg RPM" value={`$${(preview.data.kpi.avgRpm ?? 0).toFixed(2)}`} />
            </div>
          )}
          <pre className="text-2xs text-text-muted bg-background-hover rounded-md p-3 overflow-x-auto max-h-64">
            {JSON.stringify(preview.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-background-hover rounded-md px-3 py-2">
      <p className="text-2xs text-text-muted">{label}</p>
      <p className="text-sm font-semibold text-text-primary">{value}</p>
    </div>
  );
}
