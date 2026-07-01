'use client';

import { useEffect, useState } from 'react';
import { FileText, Download, Eye, Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable, DataTableColumn } from '@/components/ui/DataTable';
import { LiveBadge } from '@/components/realtime/LiveBadge';
import { usePolling } from '@/hooks/usePolling';
import { timeAgo } from '@/lib/utils';

const ENTITY_LABELS: Record<string, string> = { LOAD: 'Load', CLIENT: 'Client', DRIVER: 'Driver', TRUCK: 'Truck' };
const DOC_TYPE_LABELS: Record<string, string> = {
  RATE_CONFIRMATION: 'Rate Confirmation', BOL: 'BOL', POD: 'POD', LUMPER_RECEIPT: 'Lumper Receipt',
  INSURANCE: 'Insurance', REGISTRATION: 'Registration', CONTRACT: 'Contract', W9: 'W-9',
  CDL: 'CDL', MC_AUTHORITY: 'MC Authority', OTHER: 'Other',
};

function relatedLabel(doc: any) {
  return doc.load?.loadCode ?? doc.client?.companyName ?? doc.driver?.fullName ?? doc.truck?.truckNumber ?? '—';
}

export function DocumentsWorkspace() {
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('ALL');
  const { data, loading, lastUpdatedAt } = usePolling<any>(
    `/api/documents?${new URLSearchParams({ ...(entityType !== 'ALL' ? { entityType } : {}), ...(search ? { search } : {}) }).toString()}`,
    { intervalMs: 20000 },
  );
  const documents = data?.documents ?? [];

  const columns: DataTableColumn<any>[] = [
    { key: 'file', header: 'File', render: (d) => (
      <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-brand-light flex-shrink-0" />{d.fileName}</span>
    ) },
    { key: 'type', header: 'Type', render: (d) => DOC_TYPE_LABELS[d.docType] ?? d.docType },
    { key: 'entity', header: 'Entity', render: (d) => ENTITY_LABELS[d.entityType] ?? d.entityType },
    { key: 'related', header: 'Related To', render: relatedLabel },
    { key: 'uploaded', header: 'Uploaded', render: (d) => timeAgo(d.uploadedAt) },
    { key: 'actions', header: '', render: () => (
      <span className="flex items-center gap-2 justify-end">
        <Download className="w-3.5 h-3.5 text-text-muted hover:text-text-primary cursor-pointer" />
        <Eye className="w-3.5 h-3.5 text-text-muted hover:text-text-primary cursor-pointer" />
      </span>
    ), className: 'text-right' },
  ];

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="Documents"
        subtitle="Every rate confirmation, BOL, POD, and compliance file across the fleet"
        actions={<LiveBadge lastUpdatedAt={lastUpdatedAt} />}
      />

      <div className="flex flex-wrap items-center gap-3 bg-background-card border border-border rounded-lg px-4 py-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by file name…"
            className="w-full pl-9 pr-3 py-2 rounded-md bg-background-hover border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
          />
        </div>
        <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="px-3 py-2 rounded-md bg-background-hover border border-border text-sm text-text-primary">
          <option value="ALL">All Entities</option>
          {Object.entries(ENTITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={documents}
        getRowId={(d) => d.id}
        loading={loading}
        emptyMessage="No documents uploaded yet."
        footer={<span className="text-sm text-text-secondary">{documents.length} documents</span>}
      />
    </div>
  );
}
