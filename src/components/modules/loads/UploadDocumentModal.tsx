'use client';

import { useState } from 'react';
import { X, UploadCloud, FileText } from 'lucide-react';
import { useToast } from '@/components/providers/ToastProvider';

const DOC_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'RATE_CONFIRMATION', label: 'Rate Confirmation' },
  { value: 'BOL', label: 'Bill of Lading (BOL)' },
  { value: 'POD', label: 'Proof of Delivery (POD)' },
  { value: 'LUMPER_RECEIPT', label: 'Lumper Receipt' },
  { value: 'OTHER', label: 'Other' },
];

// Reads the file as a data URL so the document is genuinely stored and
// viewable/downloadable end-to-end without requiring cloud storage keys in
// this environment. Swap this for a real Supabase/S3 upload (the API route
// already accepts any fileUrl) once storage credentials are configured —
// no other code needs to change.
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface UploadDocumentModalProps {
  loadId: string;
  defaultDocType?: string;
  onClose: () => void;
  onUploaded: () => void;
}

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB — data-URL storage isn't meant for huge files

export function UploadDocumentModal({ loadId, defaultDocType, onClose, onUploaded }: UploadDocumentModalProps) {
  const [docType, setDocType] = useState(defaultDocType ?? 'RATE_CONFIRMATION');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  async function upload() {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      showToast('Файл слишком большой (максимум 8 МБ)', 'error');
      return;
    }
    setSaving(true);
    try {
      const fileUrl = await readFileAsDataUrl(file);
      const res = await fetch(`/api/loads/${loadId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docType,
          fileName: file.name,
          fileUrl,
          fileSize: file.size,
          mimeType: file.type || undefined,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error ?? 'Не удалось загрузить документ');
      showToast(`Документ «${file.name}» загружен`, 'success');
      onUploaded();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Не удалось загрузить документ', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-background-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <h2 className="text-base font-semibold text-text-primary">Upload Document</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          <label className="space-y-1.5 block">
            <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Document Type</span>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background-hover px-3 text-sm text-text-primary outline-none focus:border-border-focus"
            >
              {DOC_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1.5 block">File</span>
            <div className="rounded-md border border-dashed border-border px-3 py-6 text-center cursor-pointer hover:border-brand/50 transition-colors">
              <input
                type="file"
                className="hidden"
                id="doc-upload-input"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <label htmlFor="doc-upload-input" className="cursor-pointer flex flex-col items-center gap-2">
                {file ? (
                  <>
                    <FileText className="w-6 h-6 text-brand-light" />
                    <span className="text-sm text-text-primary">{file.name}</span>
                    <span className="text-2xs text-text-muted">{(file.size / 1024).toFixed(0)} KB · click to change</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-6 h-6 text-text-muted" />
                    <span className="text-sm text-text-secondary">Click to choose a file</span>
                  </>
                )}
              </label>
            </div>
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-border-subtle p-4">
          <button onClick={onClose} className="h-9 rounded-md border border-border bg-background-secondary px-4 text-sm text-text-secondary hover:bg-background-hover">
            Cancel
          </button>
          <button
            onClick={upload}
            disabled={!file || saving}
            className="h-9 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {saving ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
