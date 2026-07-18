import Link from 'next/link';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { IntegrationRow } from '@/lib/services/types';

export function IntegrationsCard({ integrations }: { integrations: IntegrationRow[] }) {
  return (
    <div className="bg-background-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-text-primary">Integrations</h2>
        <Link href="/settings" className="text-2xs text-brand-light hover:underline">Manage</Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {integrations.map((i) => (
          <div key={i.id} className="flex items-center gap-2 px-3 py-2 rounded-md bg-background-hover">
            {i.isConnected ? (
              <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-text-muted flex-shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm text-text-secondary truncate">{i.name}</p>
              <p className="text-2xs text-text-muted truncate">{i.isConnected ? 'Connected' : 'Add integration'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
