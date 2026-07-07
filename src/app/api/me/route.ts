import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

// GET /api/me — lightweight profile info for the topbar (name + role badge)
export async function GET() {
  const { userId: clerkId } = auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, fullName: true, role: true, isSenior: true },
  });

  if (!user) return NextResponse.json({ id: null, fullName: null, role: null });

  return NextResponse.json(user);
}
