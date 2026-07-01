import { Suspense } from 'react';
import { DriversWorkspace } from '@/components/modules/drivers/DriversWorkspace';

export default function DriversPage() {
  return (
    <Suspense fallback={<div className="p-6 text-text-muted text-sm">Loading…</div>}>
      <DriversWorkspace />
    </Suspense>
  );
}
