import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/rbac';
import { getActiveDriversForDashboard } from '@/lib/services/activity.service';

// GET /api/dashboard/active-drivers — "Активные драйверы" list.
export async function GET(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = Number(new URL(req.url).searchParams.get('limit') ?? 5);
  const drivers = await getActiveDriversForDashboard(limit);
  return NextResponse.json({ drivers, generatedAt: new Date().toISOString() });
}
