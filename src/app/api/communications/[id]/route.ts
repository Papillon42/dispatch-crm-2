import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/rbac';
import { db } from '@/lib/db';

const UpdateSchema = z.object({
  aiSummary: z.string().optional(),
  isRead: z.boolean().optional(),
  relatedLoadId: z.string().nullable().optional(),
  relatedClientId: z.string().nullable().optional(),
});

// PATCH /api/communications/:id — persist AI summary, read state, or entity linking
export const PATCH = withAuth(async (req, ctx, params) => {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing communication ID' }, { status: 400 });

  const body = await req.json();
  const data = UpdateSchema.parse(body);

  const updated = await db.communication.update({ where: { id }, data });
  return NextResponse.json(updated);
}, 'communications', 'update');
