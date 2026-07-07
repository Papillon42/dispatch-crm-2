'use client';

import { useEffect, useState } from 'react';
import { Save, CheckCircle2 } from 'lucide-react';

export function SettingsWorkspace() {
  const [form, setForm] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then(setForm);
  }, []);

  async function save() {
    setBusy(true);
    setSaved(false);
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: form.companyName,
          companyPercentage: Number(form.companyPercentage),
          seniorCommissionRate: Number(form.seniorCommissionRate),
          targetRpm: Number(form.targetRpm),
          fixedExpenses: Number(form.fixedExpenses),
          timezone: form.timezone,
        }),
      });
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  if (!form) return <div className="p-6 text-text-muted text-sm">Loading settings…</div>;

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-sm text-text-secondary mt-1">Company profile and finance formula parameters (§11)</p>
      </div>

      <div className="bg-background-card border border-border rounded-lg p-5 space-y-4">
        <FieldRow label="Company Name">
          <input value={form.companyName ?? ''} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className="input" />
        </FieldRow>
        <FieldRow label="Company Percentage (%)" hint="Company Revenue = Gross × Company %">
          <input type="number" step="0.1" value={form.companyPercentage ?? 0} onChange={(e) => setForm({ ...form, companyPercentage: e.target.value })} className="input" />
        </FieldRow>
        <FieldRow label="Senior Commission Rate (%)" hint="Senior Commission = Gross × rate">
          <input type="number" step="0.1" value={form.seniorCommissionRate ?? 0} onChange={(e) => setForm({ ...form, seniorCommissionRate: e.target.value })} className="input" />
        </FieldRow>
        <FieldRow label="Target RPM ($/mi)" hint="Used for the Finance low-RPM alert">
          <input type="number" step="0.01" value={form.targetRpm ?? 0} onChange={(e) => setForm({ ...form, targetRpm: e.target.value })} className="input" />
        </FieldRow>
        <FieldRow label="Fixed Expenses ($/period)">
          <input type="number" step="1" value={form.fixedExpenses ?? 0} onChange={(e) => setForm({ ...form, fixedExpenses: e.target.value })} className="input" />
        </FieldRow>
        <FieldRow label="Timezone">
          <input value={form.timezone ?? ''} onChange={(e) => setForm({ ...form, timezone: e.target.value })} className="input" />
        </FieldRow>

        <div className="flex items-center gap-3 pt-2">
          <button onClick={save} disabled={busy} className="flex items-center gap-2 px-4 py-2 rounded-md bg-brand hover:bg-brand-dark text-white text-sm font-medium disabled:opacity-50">
            <Save className="w-4 h-4" /> Save Changes
          </button>
          {saved && <span className="flex items-center gap-1 text-sm text-success"><CheckCircle2 className="w-4 h-4" /> Saved</span>}
        </div>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.375rem;
          background: hsl(var(--background-hover));
          border: 1px solid hsl(var(--border));
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: hsl(var(--text-primary));
        }
      `}</style>
    </div>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-1">{label}</label>
      {children}
      {hint && <p className="text-2xs text-text-muted mt-1">{hint}</p>}
    </div>
  );
}
