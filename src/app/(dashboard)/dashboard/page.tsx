import { getEmptyDashboardSummary } from '@/lib/services/dashboard.service';
import { DashboardClient } from '@/components/modules/dashboard/DashboardClient';

export const dynamic = 'force-dynamic';

// Render the dashboard shell immediately. The client fetches the live summary
// through /api/dashboard/summary, which keeps slow Supabase calls out of SSR.
export default function DashboardPage() {
  return <DashboardClient initialData={getEmptyDashboardSummary()} />;
}
