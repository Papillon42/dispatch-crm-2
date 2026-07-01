import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/rbac';
import { db } from '@/lib/db';

// GET /api/audit-log — admin-only visibility into who changed what (§13)
export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);

  const logs = await db.auditLog.findMany({
    orderBy: { at: 'desc' },
    take: limit,
    include: { actor: { select: { fullName: true, role: true } } },
  });

  return NextResponse.json({ logs });
}, 'audit_log', 'read');
