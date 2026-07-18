'use client';

import { FormEvent, useMemo, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DriverStatusBadge } from '@/components/ui/StatusBadge';
import type { DriverStatusConfigRow } from '@/hooks/useDriverStatuses';

export interface DriverDetailForModal {
  id: string;
  fullName: string;
  status: string;
  currentLat: number | null;
  currentLng: number | null;
  currentLocationLabel: string | null;
  currentTruck: { id: string; truckNumber: string } | null;
  currentTrailer: { id: string; trailerNumber: string | null } | null;
  currentLoad: {
    id: string; loadCode: string; status: string;
    pickupAddress: string | null; pickupCity: string | null; pickupState: string | null;
    deliveryAddress: string | null; deliveryCity: string | null; deliveryState: string | null;
  } | null;
  loads: Array<{ id: string; loadCode: string; status: string }>;
}

interface ChangeStatusModalProps {
  driver: DriverDetailForModal;
  statuses: DriverStatusConfigRow[];
  onClose: () => void;
  onChanged: () => void;
}

function toLocalInputValue(date: Date): string {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function toIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function ChangeStatusModal({ driver, statuses, onClose, onChanged }: ChangeStatusModalProps) {
  const currentConfig = statuses.find((s) => s.code === driver.status);
  const allowedNext = currentConfig?.allowedNext ?? [];

  const [status, setStatus] = useState<string>(allowedNext[0] ?? '');
  const [changedAt, setChangedAt] = useState<string>(toLocalInputValue(new Date()));
  const [comment, setComment] = useState('');
  const [reason, setReason] = useState('');
  const [loadId, setLoadId] = useState<string>(driver.currentLoad?.id ?? driver.loads[0]?.id ?? '');
  const [originAddress, setOriginAddress] = useState(driver.currentLoad?.pickupAddress
    ?? [driver.currentLoad?.pickupCity, driver.currentLoad?.pickupState].filter(Boolean).join(', '));
  const [destinationAddress, setDestinationAddress] = useState(driver.currentLoad?.deliveryAddress
    ?? [driver.currentLoad?.deliveryCity, driver.currentLoad?.deliveryState].filter(Boolean).join(', '));
  const [locationLabel, setLocationLabel] = useState(driver.currentLocationLabel ?? '');
  const [lat, setLat] = useState(driver.currentLat?.toString() ?? '');
  const [lng, setLng] = useState(driver.currentLng?.toString() ?? '');
  const [eta, setEta] = useState('');
  const [arrivedAt, setArrivedAt] = useState('');
  const [deliveredAt, setDeliveredAt] = useState('');
  const [expectedReturnAt, setExpectedReturnAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overrideWarning, setOverrideWarning] = useState<string | null>(null);

  const selectedConfig = statuses.find((s) => s.code === status);
  const required = useMemo(() => new Set(selectedConfig?.requiredFields ?? []), [selectedConfig]);
  const isNonStandard = status !== '' && !allowedNext.includes(status);
  const needsLoad = Boolean(selectedConfig?.requiresLoad) || required.has('loadId');
  const needsReason = required.has('reason') || Boolean(overrideWarning);

  const sortedStatuses = useMemo(() => {
    const options = statuses.filter((s) => s.isActive && s.code !== driver.status);
    return [
      ...options.filter((s) => allowedNext.includes(s.code)),
      ...options.filter((s) => !allowedNext.includes(s.code)),
    ];
  }, [statuses, allowedNext, driver.status]);

  async function submit(event: FormEvent, manualOverride = false) {
    event.preventDefault();
    if (!status) return;
    setSaving(true);
    setError(null);

    try {
      const body = {
        status,
        changedAt: toIso(changedAt),
        comment: comment.trim() || null,
        reason: reason.trim() || null,
        loadId: needsLoad ? (loadId || null) : (loadId || null),
        origin: originAddress.trim() ? { address: originAddress.trim() } : null,
        destination: destinationAddress.trim() ? { address: destinationAddress.trim() } : null,
        currentLocation: lat && lng && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
          ? { latitude: Number(lat), longitude: Number(lng), label: locationLabel.trim() || null }
          : null,
        eta: toIso(eta),
        arrivedAt: toIso(arrivedAt),
        deliveredAt: toIso(deliveredAt),
        expectedReturnAt: toIso(expectedReturnAt),
        manualOverride: manualOverride || Boolean(overrideWarning),
      };

      const res = await fetch(`/api/drivers/${driver.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => null);

      if (res.status === 409 && payload?.code === 'OVERRIDE_REQUIRED') {
        setOverrideWarning(payload?.details?.reason ?? payload?.error ?? 'This is a non-standard transition.');
        setSaving(false);
        return;
      }
      if (!res.ok) throw new Error(payload?.error ?? 'Unable to change status');

      onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to change status');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'h-10 w-full rounded-md border border-border bg-background-secondary px-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-border-focus';
  const labelCls = 'text-xs font-medium text-text-secondary uppercase tracking-wider';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-lg border border-border bg-background-card shadow-2xl my-8">
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Change Status</h2>
            <p className="text-xs text-text-muted mt-0.5 flex items-center gap-2">
              {driver.fullName} · current: <DriverStatusBadge status={driver.status} configs={statuses} />
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-text-secondary hover:bg-background-hover hover:text-text-primary transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(e) => void submit(e)} className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1.5">
              <span className={labelCls}>New Status *</span>
              <select
                required
                value={status}
                onChange={(e) => { setStatus(e.target.value); setOverrideWarning(null); setError(null); }}
                className={inputCls}
              >
                <option value="" disabled>Select status…</option>
                {sortedStatuses.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.label}{allowedNext.includes(s.code) ? '' : '  (non-standard)'}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className={labelCls}>Date & Time *</span>
              <input type="datetime-local" required value={changedAt} onChange={(e) => setChangedAt(e.target.value)} className={inputCls} />
            </label>

            {(needsLoad || driver.loads.length > 0) && (
              <label className="space-y-1.5">
                <span className={labelCls}>Load {needsLoad && '*'}</span>
                <select
                  value={loadId}
                  required={needsLoad}
                  onChange={(e) => setLoadId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">No load</option>
                  {driver.currentLoad && !driver.loads.some((l) => l.id === driver.currentLoad!.id) && (
                    <option value={driver.currentLoad.id}>{driver.currentLoad.loadCode}</option>
                  )}
                  {driver.loads.map((l) => (
                    <option key={l.id} value={l.id}>{l.loadCode} ({l.status.replace(/_/g, ' ')})</option>
                  ))}
                </select>
              </label>
            )}

            <label className="space-y-1.5">
              <span className={labelCls}>Truck</span>
              <input value={driver.currentTruck?.truckNumber ?? 'Not assigned'} disabled className={cn(inputCls, 'opacity-60')} />
            </label>

            <label className="space-y-1.5">
              <span className={labelCls}>Trailer</span>
              <input value={driver.currentTrailer?.trailerNumber ?? 'Not assigned'} disabled className={cn(inputCls, 'opacity-60')} />
            </label>

            <label className="space-y-1.5">
              <span className={labelCls}>ETA</span>
              <input type="datetime-local" value={eta} onChange={(e) => setEta(e.target.value)} className={inputCls} />
            </label>

            <label className="space-y-1.5 md:col-span-2">
              <span className={labelCls}>Origin (pickup) {required.has('origin') && '*'}</span>
              <input
                value={originAddress}
                required={required.has('origin')}
                onChange={(e) => setOriginAddress(e.target.value)}
                placeholder="Chicago, IL"
                className={inputCls}
              />
            </label>

            <label className="space-y-1.5 md:col-span-2">
              <span className={labelCls}>Destination (delivery) {required.has('destination') && '*'}</span>
              <input
                value={destinationAddress}
                required={required.has('destination')}
                onChange={(e) => setDestinationAddress(e.target.value)}
                placeholder="Dallas, TX"
                className={inputCls}
              />
            </label>

            <div className="space-y-1.5 md:col-span-2">
              <span className={labelCls}>Current Location</span>
              <div className="grid grid-cols-[minmax(0,1fr)_110px_110px] gap-2">
                <input value={locationLabel} onChange={(e) => setLocationLabel(e.target.value)} placeholder="Springfield, MO" className={inputCls} />
                <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Lat" className={inputCls} />
                <input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Lng" className={inputCls} />
              </div>
            </div>

            {required.has('arrivedAt') && (
              <label className="space-y-1.5">
                <span className={labelCls}>Arrival Time *</span>
                <input type="datetime-local" required value={arrivedAt} onChange={(e) => setArrivedAt(e.target.value)} className={inputCls} />
              </label>
            )}

            {required.has('deliveredAt') && (
              <label className="space-y-1.5">
                <span className={labelCls}>Delivery Date & Time *</span>
                <input type="datetime-local" required value={deliveredAt} onChange={(e) => setDeliveredAt(e.target.value)} className={inputCls} />
              </label>
            )}

            {required.has('expectedReturnAt') && (
              <label className="space-y-1.5">
                <span className={labelCls}>Expected Return *</span>
                <input type="datetime-local" required value={expectedReturnAt} onChange={(e) => setExpectedReturnAt(e.target.value)} className={inputCls} />
              </label>
            )}

            {(needsReason || isNonStandard) && (
              <label className="space-y-1.5 md:col-span-2">
                <span className={labelCls}>Reason {needsReason && '*'}</span>
                <input
                  value={reason}
                  required={needsReason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={overrideWarning ? 'Why is this non-standard transition needed?' : 'Reason'}
                  className={inputCls}
                />
              </label>
            )}

            <label className="space-y-1.5 md:col-span-2">
              <span className={labelCls}>Dispatcher Comment</span>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2}
                className="w-full rounded-md border border-border bg-background-secondary py-2 px-3 text-sm text-text-primary outline-none focus:border-border-focus" />
            </label>
          </div>

          {overrideWarning && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-300">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Non-standard transition</p>
                <p className="mt-0.5 text-amber-300/80">{overrideWarning}</p>
                <p className="mt-0.5 text-amber-300/80">Provide a reason and confirm — this change will be logged as a manual exception.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
            <button type="button" onClick={onClose}
              className="h-10 rounded-md border border-border bg-background-secondary px-4 text-sm text-text-secondary hover:bg-background-hover hover:text-text-primary transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !status}
              className={cn(
                'h-10 rounded-md px-4 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                overrideWarning ? 'bg-amber-600 hover:bg-amber-700' : 'bg-brand hover:bg-brand-dark',
              )}
            >
              {saving ? 'Saving…' : overrideWarning ? 'Confirm Override' : 'Confirm Change'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
