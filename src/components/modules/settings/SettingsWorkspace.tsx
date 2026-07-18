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
          autoStatusEnabled: Boolean(form.autoStatusEnabled),
          autoStatusMode: form.autoStatusMode === 'AUTO' ? 'AUTO' : 'SUGGEST',
          pickupGeofenceRadiusMiles: Number(form.pickupGeofenceRadiusMiles) || 1,
          deliveryGeofenceRadiusMiles: Number(form.deliveryGeofenceRadiusMiles) || 1,
          minGeofenceMinutes: Number(form.minGeofenceMinutes) || 10,
          autoInTransitOnMove: Boolean(form.autoInTransitOnMove),
          gpsStaleMinutes: Number(form.gpsStaleMinutes) || 30,
          notifyOnStatusChange: Boolean(form.notifyOnStatusChange),
          locationRetentionDays: Number(form.locationRetentionDays) || 90,
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

      <div className="bg-background-card border border-border rounded-lg p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Driver Status Automation</h2>
          <p className="text-sm text-text-secondary mt-0.5">Geofence-based suggestions and automatic status changes from GPS</p>
        </div>

        <FieldRow label="Enable automatic statuses" hint="When on, GPS updates near pickup/delivery generate status suggestions">
          <input type="checkbox" checked={Boolean(form.autoStatusEnabled)} onChange={(e) => setForm({ ...form, autoStatusEnabled: e.target.checked })} className="h-4 w-4" />
        </FieldRow>
        <FieldRow label="Mode" hint="SUGGEST: dispatcher confirms · AUTO: apply automatically (still logged as automatic changes)">
          <select value={form.autoStatusMode ?? 'SUGGEST'} onChange={(e) => setForm({ ...form, autoStatusMode: e.target.value })} className="input">
            <option value="SUGGEST">Suggest to dispatcher</option>
            <option value="AUTO">Change automatically</option>
          </select>
        </FieldRow>
        <FieldRow label="Pickup geofence radius (miles)">
          <input type="number" step="0.1" value={form.pickupGeofenceRadiusMiles ?? 1} onChange={(e) => setForm({ ...form, pickupGeofenceRadiusMiles: e.target.value })} className="input" />
        </FieldRow>
        <FieldRow label="Delivery geofence radius (miles)">
          <input type="number" step="0.1" value={form.deliveryGeofenceRadiusMiles ?? 1} onChange={(e) => setForm({ ...form, deliveryGeofenceRadiusMiles: e.target.value })} className="input" />
        </FieldRow>
        <FieldRow label="Minimum time in geofence (minutes)">
          <input type="number" step="1" value={form.minGeofenceMinutes ?? 10} onChange={(e) => setForm({ ...form, minGeofenceMinutes: e.target.value })} className="input" />
        </FieldRow>
        <FieldRow label="Auto In Transit when truck starts moving" hint="ON_LOAD → IN_TRANSIT without confirmation (spec §4)">
          <input type="checkbox" checked={Boolean(form.autoInTransitOnMove)} onChange={(e) => setForm({ ...form, autoInTransitOnMove: e.target.checked })} className="h-4 w-4" />
        </FieldRow>
        <FieldRow label="GPS stale threshold (minutes)" hint="Show a warning when a driver's GPS is older than this">
          <input type="number" step="1" value={form.gpsStaleMinutes ?? 30} onChange={(e) => setForm({ ...form, gpsStaleMinutes: e.target.value })} className="input" />
        </FieldRow>
        <FieldRow label="Notify on status changes">
          <input type="checkbox" checked={form.notifyOnStatusChange ?? true} onChange={(e) => setForm({ ...form, notifyOnStatusChange: e.target.checked })} className="h-4 w-4" />
        </FieldRow>
        <FieldRow label="GPS history retention (days)" hint="LocationUpdate rows older than this are pruned to one point per day (cron)">
          <input type="number" step="1" value={form.locationRetentionDays ?? 90} onChange={(e) => setForm({ ...form, locationRetentionDays: e.target.value })} className="input" />
        </FieldRow>

        <div className="flex items-center gap-3 pt-2">
          <button onClick={save} disabled={busy} className="flex items-center gap-2 px-4 py-2 rounded-md bg-brand hover:bg-brand-dark text-white text-sm font-medium disabled:opacity-50">
            <Save className="w-4 h-4" /> Save Changes
          </button>
          {saved && <span className="flex items-center gap-1 text-sm text-success"><CheckCircle2 className="w-4 h-4" /> Saved</span>}
        </div>
      </div>

      <DriverStatusDictionary />

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

// ── Driver status dictionary manager (admin) ─────────────────────────────────
// Rename, recolor, enable/disable and add statuses without code changes.

function DriverStatusDictionary() {
  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState({ code: '', label: '', color: '#4ade80' });
  const [adding, setAdding] = useState(false);

  async function reload() {
    try {
      const res = await fetch('/api/statuses?all=1', { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? 'Unable to load statuses');
      setStatuses(payload.statuses);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load statuses');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function patchStatus(id: string, data: Record<string, unknown>) {
    setSavingId(id);
    try {
      const res = await fetch(`/api/statuses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? 'Unable to update status');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update status');
    } finally {
      setSavingId(null);
    }
  }

  async function addStatus() {
    if (!newStatus.code || !newStatus.label) return;
    setAdding(true);
    try {
      const res = await fetch('/api/statuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newStatus.code.toUpperCase().replace(/\s+/g, '_'),
          label: newStatus.label,
          color: newStatus.color,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? 'Unable to add status');
      setNewStatus({ code: '', label: '', color: '#4ade80' });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add status');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="bg-background-card border border-border rounded-lg p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-text-primary">Driver Status Dictionary</h2>
        <p className="text-sm text-text-secondary mt-0.5">
          Rename, recolor, disable or add operational statuses. System statuses cannot be deleted; codes are immutable so history stays intact.
        </p>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}

      {loading ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : (
        <div className="space-y-2">
          {statuses.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border-subtle bg-background-secondary px-3 py-2">
              <input
                type="color"
                value={s.color}
                onChange={(e) => void patchStatus(s.id, { color: e.target.value })}
                className="h-7 w-9 rounded border-0 bg-transparent p-0 cursor-pointer"
                title="Status color"
              />
              <input
                defaultValue={s.label}
                onBlur={(e) => { if (e.target.value !== s.label && e.target.value.trim()) void patchStatus(s.id, { label: e.target.value.trim() }); }}
                className="input !w-44"
              />
              <code className="text-2xs text-text-muted">{s.code}</code>
              {s.isSystem && <span className="badge bg-background-hover text-text-muted">system</span>}
              {savingId === s.id && <span className="text-2xs text-text-muted">saving…</span>}
              <label className="ml-auto inline-flex items-center gap-1.5 text-xs text-text-secondary">
                <input
                  type="checkbox"
                  checked={s.isActive}
                  onChange={(e) => void patchStatus(s.id, { isActive: e.target.checked })}
                  className="h-3.5 w-3.5"
                />
                Active
              </label>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2 border-t border-border-subtle pt-4">
        <div>
          <label className="block text-2xs text-text-muted mb-1">Code (UPPER_SNAKE)</label>
          <input value={newStatus.code} onChange={(e) => setNewStatus({ ...newStatus, code: e.target.value })} placeholder="WAITING_DOCS" className="input !w-40" />
        </div>
        <div>
          <label className="block text-2xs text-text-muted mb-1">Label</label>
          <input value={newStatus.label} onChange={(e) => setNewStatus({ ...newStatus, label: e.target.value })} placeholder="Waiting for Docs" className="input !w-44" />
        </div>
        <div>
          <label className="block text-2xs text-text-muted mb-1">Color</label>
          <input type="color" value={newStatus.color} onChange={(e) => setNewStatus({ ...newStatus, color: e.target.value })} className="h-9 w-12 rounded border border-border bg-transparent p-0.5 cursor-pointer" />
        </div>
        <button
          onClick={() => void addStatus()}
          disabled={adding || !newStatus.code || !newStatus.label}
          className="flex items-center gap-2 px-3 py-2 rounded-md bg-brand hover:bg-brand-dark text-white text-sm font-medium disabled:opacity-50"
        >
          Add Status
        </button>
      </div>
    </div>
  );
}
