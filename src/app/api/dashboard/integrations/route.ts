import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/rbac';
import { getIntegrations } from '@/lib/services/activity.service';

// GET /api/dashboard/integrations — "Интеграции" card data.
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const integrations = await getIntegrations();
  return NextResponse.json({ integrations, generatedAt: new Date().toISOString() });
}
