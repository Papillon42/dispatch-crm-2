import { Suspense } from 'react';
import { LoadsWorkspace } from '@/components/modules/loads/LoadsWorkspace';

export default function LoadsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-text-muted text-sm">Loading…</div>}>
      <LoadsWorkspace />
    </Suspense>
  );
}
