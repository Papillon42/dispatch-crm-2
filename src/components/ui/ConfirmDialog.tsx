'use client';

import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Reusable destructive-action confirmation modal (delete driver/client/user/truck, etc.). */
export function ConfirmDialog({ title, message, confirmLabel = 'Delete', busy, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-background-card shadow-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-danger/15 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-danger" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
            <p className="text-sm text-text-secondary mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            disabled={busy}
            className="h-9 rounded-md border border-border bg-background-secondary px-4 text-sm text-text-secondary hover:bg-background-hover disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="h-9 rounded-md bg-danger hover:bg-danger/85 px-4 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
