import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/rbac';
import { getDashboardMapData } from '@/lib/services/map.service';

// GET /api/dashboard/map — "Карта перевозок" routes + legend, reusable by
// the standalone Map/Updater page as well as the dashboard preview.
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const data = await getDashboardMapData();
  return NextResponse.json({ ...data, generatedAt: new Date().toISOString() });
}
