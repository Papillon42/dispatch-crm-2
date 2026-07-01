'use client';

import { FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ActionButton } from '@/components/ui/ActionButton';

interface ClientOption { id: string; companyName: string }
interface DriverOption { id: string; fullName: string }

interface CreateLoadModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const EMPTY = {
  clientId: '', driverId: '', brokerContact: '', brokerPhone: '',
  pickupCity: '', pickupState: '', pickupAt: '',
  deliveryCity: '', deliveryState: '', deliveryAt: '',
  rate: '', totalMiles: '', commodity: '',
  equipmentType: 'DRY_VAN',
};

/** Lightweight quick-create form for a new load — covers the fields a dispatcher needs to get a lead into the pipeline; everything else is edited from the detail panel afterward. */
export function CreateLoadModal({ onClose, onCreated }: CreateLoadModalProps) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/clients?limit=200', { cache: 'no-store' }).then((r) => r.json()).then((d) => setClients(d.clients ?? []));
    fetch('/api/drivers?limit=200', { cache: 'no-store' }).then((r) => r.json()).then((d) => setDrivers(d.drivers ?? []));
  }, []);

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.clientId || !form.rate) {
      setError('Client and rate are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/loads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: form.clientId,
          driverId: form.driverId || undefined,
          brokerContact: form.brokerContact || undefined,
          brokerPhone: form.brokerPhone || undefined,
          pickupCity: form.pickupCity || undefined,
          pickupState: form.pickupState || undefined,
          pickupAt: form.pickupAt ? new Date(form.pickupAt).toISOString() : undefined,
          deliveryCity: form.deliveryCity || undefined,
          deliveryState: form.deliveryState || undefined,
          deliveryAt: form.deliveryAt ? new Date(form.deliveryAt).toISOString() : undefined,
          rate: Number(form.rate),
          totalMiles: Number(form.totalMiles) || 0,
          loadedMiles: Number(form.totalMiles) || 0,
          commodity: form.commodity || undefined,
          equipmentType: form.equipmentType,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Could not create load');
      }
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Could not create load');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg bg-background-card border border-border rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-text-primary">New Load</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <Field label="Client *">
            <select value={form.clientId} onChange={(e) => set('clientId', e.target.value)} className="select" required>
              <option value="">Select client…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </select>
          </Field>
          <Field label="Driver (optional)">
            <select value={form.driverId} onChange={(e) => set('driverId', e.target.value)} className="select">
              <option value="">Unassigned</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Broker Contact"><input value={form.brokerContact} onChange={(e) => set('brokerContact', e.target.value)} className="input" /></Field>
            <Field label="Broker Phone"><input value={form.brokerPhone} onChange={(e) => set('brokerPhone', e.target.value)} className="input" /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Pickup City"><input value={form.pickupCity} onChange={(e) => set('pickupCity', e.target.value)} className="input" /></Field>
            <Field label="State"><input value={form.pickupState} onChange={(e) => set('pickupState', e.target.value.toUpperCase())} maxLength={2} className="input" /></Field>
            <Field label="Pickup Date"><input type="datetime-local" value={form.pickupAt} onChange={(e) => set('pickupAt', e.target.value)} className="input" /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Delivery City"><input value={form.deliveryCity} onChange={(e) => set('deliveryCity', e.target.value)} className="input" /></Field>
            <Field label="State"><input value={form.deliveryState} onChange={(e) => set('deliveryState', e.target.value.toUpperCase())} maxLength={2} className="input" /></Field>
            <Field label="Delivery Date"><input type="datetime-local" value={form.deliveryAt} onChange={(e) => set('deliveryAt', e.target.value)} className="input" /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Rate ($) *"><input type="number" min="0" value={form.rate} onChange={(e) => set('rate', e.target.value)} className="input" required /></Field>
            <Field label="Total Miles"><input type="number" min="0" value={form.totalMiles} onChange={(e) => set('totalMiles', e.target.value)} className="input" /></Field>
            <Field label="Equipment">
              <select value={form.equipmentType} onChange={(e) => set('equipmentType', e.target.value)} className="select">
                {['DRY_VAN', 'REEFER', 'FLATBED', 'STEP_DECK', 'LOWBOY', 'TANKER', 'CONESTOGA', 'OTHER'].map((t) => (
                  <option key={t} value={t}>{t.replaceAll('_', ' ')}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Commodity"><input value={form.commodity} onChange={(e) => set('commodity', e.target.value)} className="input" /></Field>

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <ActionButton type="button" variant="ghost" onClick={onClose}>Cancel</ActionButton>
            <ActionButton type="submit" variant="primary" loading={busy}>{busy ? 'Creating…' : 'Create Load'}</ActionButton>
          </div>
        </form>
      </div>
      <style jsx global>{`
        .input, .select {
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-2xs text-text-muted mb-1">{label}</span>
      {children}
    </label>
  );
}
