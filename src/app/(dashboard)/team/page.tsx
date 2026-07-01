import { Suspense } from 'react';
import { TeamWorkspace } from '@/components/modules/team/TeamWorkspace';

export default function TeamPage() {
  return (
    <Suspense fallback={<div className="p-6 text-text-muted text-sm">Loading…</div>}>
      <TeamWorkspace />
    </Suspense>
  );
}
