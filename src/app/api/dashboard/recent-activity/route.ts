import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/rbac';
import { getRecentActivity } from '@/lib/services/activity.service';

// GET /api/dashboard/recent-activity — "Недавняя активность" feed.
export async function GET(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = Number(new URL(req.url).searchParams.get('limit') ?? 10);
  const activity = await getRecentActivity(limit);
  return NextResponse.json({ activity, generatedAt: new Date().toISOString() });
}
