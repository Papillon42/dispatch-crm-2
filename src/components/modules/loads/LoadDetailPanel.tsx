'use client';

import { useEffect, useState } from 'react';
import {
  X, Phone, Mail, Download, Eye, FileText, Plus, User,
  AlertTriangle, CheckCircle2, Clock, UserPlus, Upload, Lock,
} from 'lucide-react';
import { LoadStatusBadge } from '@/components/ui/StatusBadge';
import { cn, formatCurrency, formatDate, formatDateTime, timeAgo } from '@/lib/utils';
import { RouteMiniMap } from './RouteMiniMap';
import { AssignDriverModal } from './AssignDriverModal';
import { UploadDocumentModal } from './UploadDocumentModal';
import { useToast } from '@/components/providers/ToastProvider';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface LoadDetailPanelProps {
  loadId: string;
  onClose: () => void;
  onChanged?: () => void;
}

type Tab = 'details' | 'events' | 'history';

const DOC_LABELS: Record<string, string> = {
  RATE_CONFIRMATION: 'Rate Confirmation.pdf',
  BOL: 'BOL.pdf',
  POD: 'POD.jpg',
  LUMPER_RECEIPT: 'Lumper Receipt.pdf',
};

const REQUIRED_DOCS = ['RATE_CONFIRMATION', 'BOL', 'POD'];

const ISSUE_LABELS: Record<string, string> = {
  DETENTION: 'Detention',
  BREAKDOWN: 'Breakdown',
  LATE_PICKUP: 'Late Pickup',
  LATE_DELIVERY: 'Late Delivery',
  WEATHER: 'Weather Delay',
  COMMUNICATION: 'Communication Issue',
  ROUTE_DEVIATION: 'Route Deviation',
  ACCIDENT: 'Accident',
  OTHER: 'Other',
};

export function LoadDetailPanel({ loadId, onClose, onChanged }: LoadDetailPanelProps) {
  const [load, setLoad] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('details');
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadDocType, setUploadDocType] = useState<string | undefined>(undefined);
  const { showToast } = useToast();
  const { user } = useCurrentUser();

  const fetchLoad = () => {
    setLoading(true);
    fetch(`/api/loads/${loadId}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        setLoad(data);
        setNotes(data.notes ?? '');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadId]);

  async function saveNotes() {
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/loads/${loadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? 'Не удалось сохранить заметку');
      }
      onChanged?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Не удалось сохранить заметку', 'error');
    } finally {
      setSavingNotes(false);
    }
  }

  async function closeLoad() {
    setBusy(true);
    try {
      const res = await fetch(`/api/loads/${loadId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CLOSED' }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error ?? 'Не удалось закрыть груз');
      showToast('Груз закрыт', 'success');
      fetchLoad();
      onChanged?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Не удалось закрыть груз', 'error');
    } finally {
      setBusy(false);
    }
  }

  function openUploadModal(docType?: string) {
    setUploadDocType(docType);
    setShowUploadModal(true);
  }

  if (loading || !load) {
    return (
      <div className="right-panel p-4 space-y-3">
        <div className="h-6 w-32 bg-background-hover rounded animate-pulse" />
        <div className="h-40 bg-background-hover rounded animate-pulse" />
        <div className="h-24 bg-background-hover rounded animate-pulse" />
      </div>
    );
  }

  const docCount = load.documents?.length ?? 0;
  const missingRequired = REQUIRED_DOCS.filter((t) => !load.documents?.some((d: any) => d.docType === t));
  const canCloseByRole = !!user?.role && ['ADMIN', 'FINANCE', 'SENIOR_DISPATCHER'].includes(user.role);
  const canClose = load.status === 'PAID' && canCloseByRole;
  const openIssues = (load.issues ?? []).filter((i: any) => i.status !== 'RESOLVED');

  return (
    <div className="right-panel flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm font-semibold text-text-primary truncate">{load.loadCode}</h2>
          <LoadStatusBadge status={load.status} />
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-subtle px-4">
        {([
          ['details', 'Details'],
          ['events', 'Events'],
          ['history', 'History'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'px-3 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors',
              tab === key ? 'border-brand text-brand-light' : 'border-transparent text-text-secondary hover:text-text-primary',
            )}
          >
            {label}
            {key === 'events' && openIssues.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-danger/20 text-danger text-2xs">
                {openIssues.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'details' && (
          <div className="p-4 space-y-4">
            <RouteMiniMap
              originLabel={`${load.pickupCity ?? '—'}, ${load.pickupState ?? ''}`}
              destinationLabel={`${load.deliveryCity ?? '—'}, ${load.deliveryState ?? ''}`}
              miles={load.totalMiles}
              animate={['EN_ROUTE_TO_PICKUP', 'IN_TRANSIT'].includes(load.status)}
            />

            <div className="grid grid-cols-3 gap-2 text-2xs">
              <div className="bg-background-hover rounded-md px-2 py-1.5">
                <p className="text-text-muted">Pickup</p>
                <p className="text-text-primary font-medium">{formatDateTime(load.pickupAt)}</p>
              </div>
              <div className="bg-background-hover rounded-md px-2 py-1.5">
                <p className="text-text-muted">Delivery</p>
                <p className="text-text-primary font-medium">{formatDateTime(load.deliveryAt)}</p>
              </div>
              <div className="bg-background-hover rounded-md px-2 py-1.5">
                <p className="text-text-muted">RPM</p>
                <p className="text-text-primary font-medium">{load.rpm ? `$${load.rpm.toFixed(2)}` : '—'}</p>
              </div>
            </div>

            {/* Load info */}
            <div>
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Load Information</h3>
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-3 text-sm">
                <InfoField label="Broker" value={load.broker?.name ?? '—'} />
                <InfoField label="Contact" value={load.brokerContact ?? load.broker?.phone ?? '—'} />
                <InfoField label="Client" value={load.client?.companyName ?? '—'} />
                <InfoField label="Reference #" value={load.referenceNumber ?? load.poNumber ?? '—'} />
                <InfoField label="Equipment" value={load.equipmentType?.replaceAll('_', ' ') ?? '—'} />
                <InfoField label="Weight" value={load.weight ? `${formatDateOrNum(load.weight)} lbs` : '—'} />
                <InfoField label="Commodity" value={load.commodity ?? '—'} />
                <InfoField label="Rate" value={formatCurrency(load.rate)} />
                <InfoField label="Driver" value={load.driver?.fullName ?? 'Unassigned'} />
                <InfoField label="Truck" value={load.truck?.truckNumber ?? '—'} />
              </div>
            </div>

            {/* Documents */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Documents</h3>
                <span className={cn('text-2xs font-medium', missingRequired.length ? 'text-warning' : 'text-success')}>
                  {docCount}/{REQUIRED_DOCS.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {(load.documents ?? []).map((doc: any) => (
                  <div key={doc.id} className="flex items-center gap-2 px-2.5 py-2 rounded-md bg-background-hover">
                    <FileText className="w-4 h-4 text-brand-light flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text-primary truncate">{doc.fileName}</p>
                      <p className="text-2xs text-text-muted">Uploaded {timeAgo(doc.uploadedAt)}</p>
                    </div>
                    <Download className="w-3.5 h-3.5 text-text-muted hover:text-text-primary cursor-pointer" />
                    <Eye className="w-3.5 h-3.5 text-text-muted hover:text-text-primary cursor-pointer" />
                  </div>
                ))}
                {missingRequired.map((t) => (
                  <button
                    key={t}
                    disabled={busy}
                    onClick={() => openUploadModal(t)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md border border-dashed border-border text-text-muted hover:text-text-primary hover:border-brand/50 transition-colors text-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add {DOC_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={saveNotes}
                rows={3}
                placeholder="Add a note about this load…"
                className="w-full rounded-md bg-background-hover border border-border px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus resize-none"
              />
              {savingNotes && <p className="text-2xs text-text-muted mt-1">Saving…</p>}
            </div>
          </div>
        )}

        {tab === 'events' && (
          <div className="p-4 space-y-2">
            <IssueComposer loadId={loadId} onCreated={fetchLoad} />
            {(load.issues ?? []).length === 0 && (
              <p className="text-sm text-text-muted text-center py-6">No issues logged for this load.</p>
            )}
            {(load.issues ?? []).map((issue: any) => (
              <div key={issue.id} className="flex items-start gap-2.5 px-3 py-2.5 rounded-md bg-background-hover">
                {issue.status === 'RESOLVED' ? (
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-danger mt-0.5 flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-text-primary">{ISSUE_LABELS[issue.type] ?? issue.type}</p>
                    <span className="text-2xs text-text-muted flex-shrink-0">{timeAgo(issue.at)}</span>
                  </div>
                  <p className="text-sm text-text-secondary">{issue.description}</p>
                  <p className="text-2xs text-text-muted mt-0.5">
                    {issue.status === 'RESOLVED' ? 'Resolved' : 'Open'} {issue.driver?.fullName ? `· ${issue.driver.fullName}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'history' && (
          <div className="p-4 space-y-0.5">
            {(load.statusHistory ?? []).map((h: any, i: number) => (
              <div key={h.id} className="flex gap-3 px-1 py-2">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-brand mt-1.5" />
                  {i < load.statusHistory.length - 1 && <div className="w-px flex-1 bg-border" />}
                </div>
                <div className="pb-2">
                  <p className="text-sm text-text-primary">
                    {h.fromStatus ? `${h.fromStatus.replaceAll('_', ' ')} → ` : ''}
                    <span className="font-medium">{h.toStatus.replaceAll('_', ' ')}</span>
                  </p>
                  <p className="text-2xs text-text-muted">
                    {formatDateTime(h.at)} · {h.changedBy?.fullName ?? 'System'} · {h.source}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-3 border-t border-border-subtle space-y-2">
        <button
          disabled={busy}
          onClick={() => setShowAssignModal(true)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-brand hover:bg-brand-dark text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          <UserPlus className="w-4 h-4" /> Assign Driver
        </button>
        <button
          disabled={busy}
          onClick={() => openUploadModal(missingRequired[0])}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-background-hover hover:bg-background-card border border-border text-text-primary text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Upload className="w-4 h-4" /> Upload Documents
        </button>
        <button
          disabled={busy || !canClose}
          onClick={closeLoad}
          title={
            !canCloseByRole ? 'Only Owner, Finance, or Senior Dispatcher can close a load'
              : canClose ? 'Close this load'
              : 'Load must be Paid before it can be closed'
          }
          className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-danger/10 hover:bg-danger/20 border border-danger/30 text-danger text-sm font-medium transition-colors disabled:opacity-40"
        >
          {canClose ? <CheckCircle2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />} Close Load
        </button>
      </div>

      {showAssignModal && (
        <AssignDriverModal
          loadId={loadId}
          clientId={load.clientId ?? load.client?.id}
          currentDriverId={load.driverId}
          onClose={() => setShowAssignModal(false)}
          onAssigned={fetchLoad}
        />
      )}

      {showUploadModal && (
        <UploadDocumentModal
          loadId={loadId}
          defaultDocType={uploadDocType}
          onClose={() => setShowUploadModal(false)}
          onUploaded={fetchLoad}
        />
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xs text-text-muted">{label}</p>
      <p className="text-text-primary truncate">{value}</p>
    </div>
  );
}

function formatDateOrNum(n: number) {
  return new Intl.NumberFormat('en-US').format(n);
}

function IssueComposer({ loadId, onCreated }: { loadId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('DETENTION');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-md border border-dashed border-border text-text-muted hover:text-text-primary hover:border-brand/50 text-sm mb-2"
      >
        <Plus className="w-3.5 h-3.5" /> Log an issue
      </button>
    );
  }

  return (
    <div className="rounded-md border border-border bg-background-hover p-3 space-y-2 mb-2">
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="w-full rounded-md bg-background-card border border-border px-2 py-1.5 text-sm text-text-primary"
      >
        {Object.entries(ISSUE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What happened?"
        rows={2}
        className="w-full rounded-md bg-background-card border border-border px-2 py-1.5 text-sm text-text-primary resize-none"
      />
      <div className="flex gap-2">
        <button
          disabled={busy || !description.trim()}
          onClick={async () => {
            setBusy(true);
            try {
              await fetch(`/api/loads/${loadId}/issues`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, description }),
              });
              setDescription('');
              setOpen(false);
              onCreated();
            } finally {
              setBusy(false);
            }
          }}
          className="flex-1 py-1.5 rounded-md bg-brand hover:bg-brand-dark text-white text-xs font-medium disabled:opacity-50"
        >
          Log Issue
        </button>
        <button onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-md text-text-muted text-xs">Cancel</button>
      </div>
    </div>
  );
}
