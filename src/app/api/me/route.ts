import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthContext } from '@/lib/auth/rbac';

// GET /api/me — lightweight profile info for the topbar (name + role badge)
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: ctx.userId },
    select: { id: true, fullName: true, role: true, isSenior: true },
  });

  if (!user) return NextResponse.json({ id: null, fullName: null, role: null });

  return NextResponse.json(user);
}
