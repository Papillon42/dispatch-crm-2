import { getAuthContext } from '@/lib/auth/rbac';
import { getDashboardSummary } from '@/lib/services/dashboard.service';
import { DashboardClient } from '@/components/modules/dashboard/DashboardClient';

// Server-rendered shell: fetches the initial /api/dashboard/summary payload
// directly through the service layer (no self-HTTP round-trip), then hands
// off to a client component for live polling + map interactivity.
export default async function DashboardPage() {
  const ctx = await getAuthContext();
  const initialData = await getDashboardSummary(ctx);

  return <DashboardClient initialData={initialData} />;
}
