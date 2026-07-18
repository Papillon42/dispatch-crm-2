import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/rbac';
import { getDashboardSummary, getEmptyDashboardSummary } from '@/lib/services/dashboard.service';

// GET /api/dashboard/summary — everything the Dashboard needs in one
// round-trip: 5 KPIs, fleet map + legend, active drivers, integrations,
// recent activity, role summary. Individual sub-resources are also exposed
// under /api/dashboard/* for components that want to poll just one slice.
export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const summary = await getDashboardSummary(ctx);
    return NextResponse.json({ ...summary, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Dashboard summary database error', error);

    return NextResponse.json({
      ...getEmptyDashboardSummary(),
      degraded: true,
      generatedAt: new Date().toISOString(),
    });
  }
}
