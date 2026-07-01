import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/rbac';
import { getDashboardSummary } from '@/lib/services/dashboard.service';

// GET /api/dashboard/summary — everything the Главная панель needs in one
// round-trip: 5 KPIs, fleet map + legend, active drivers, integrations,
// recent activity, role summary. Individual sub-resources are also exposed
// under /api/dashboard/* for components that want to poll just one slice.
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const summary = await getDashboardSummary(ctx);
  return NextResponse.json({ ...summary, generatedAt: new Date().toISOString() });
}
