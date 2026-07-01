'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectedId?: string | null;
  loading?: boolean;
  emptyMessage?: string;
  footer?: ReactNode;
  className?: string;
}

/**
 * Generic premium table shell: consistent header styling, row hover/selected
 * state, loading/empty states, and an optional footer slot for pagination.
 * Column definitions stay page-specific (cell renderers, formatting), only
 * the chrome is shared.
 */
export function DataTable<T>({
  columns, rows, getRowId, onRowClick, selectedId, loading, emptyMessage, footer, className,
}: DataTableProps<T>) {
  return (
    <div className={cn('bg-background-card border border-border rounded-lg overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full data-table">
          <thead>
            <tr className="border-b border-border-subtle">
              {columns.map((col) => (
                <th key={col.key} className={col.className}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 && (
              <tr><td colSpan={columns.length} className="text-center py-8 text-text-muted">Loading…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={columns.length} className="text-center py-8 text-text-muted">{emptyMessage ?? 'No records found.'}</td></tr>
            )}
            {rows.map((row) => {
              const id = getRowId(row);
              return (
                <tr
                  key={id}
                  onClick={() => onRowClick?.(row)}
                  className={cn(onRowClick && 'cursor-pointer', selectedId === id && 'bg-background-hover')}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={col.className}>{col.render(row)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {footer && <div className="px-4 py-3 border-t border-border-subtle">{footer}</div>}
    </div>
  );
}
