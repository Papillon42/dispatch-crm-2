import { Suspense } from 'react';
import { ClientsWorkspace } from '@/components/modules/clients/ClientsWorkspace';

export default function ClientsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-text-muted text-sm">Loading…</div>}>
      <ClientsWorkspace />
    </Suspense>
  );
}
