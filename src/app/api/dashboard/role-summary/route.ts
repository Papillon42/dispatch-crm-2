import { NextResponse } from 'next/server';
import { getAuthContext, canScope } from '@/lib/auth/rbac';
import { getRoleSummary } from '@/lib/services/dashboard.service';

// GET /api/dashboard/role-summary — "Team & Users by Role" cards. RBAC-gated:
// only roles with 'users' read access see this (matches the existing
// dashboard page's canSeeTeam gate, now centralized here).
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (canScope(ctx.role, 'read', 'users') === 'none') {
    return NextResponse.json({ roles: [] });
  }

  const roles = await getRoleSummary();
  return NextResponse.json({ roles, generatedAt: new Date().toISOString() });
}
