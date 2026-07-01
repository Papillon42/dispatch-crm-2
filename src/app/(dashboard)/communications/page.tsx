import { Suspense } from 'react';
import { CommunicationsWorkspace } from '@/components/modules/communications/CommunicationsWorkspace';

export default function CommunicationsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-text-muted text-sm">Loading…</div>}>
      <CommunicationsWorkspace />
    </Suspense>
  );
}
