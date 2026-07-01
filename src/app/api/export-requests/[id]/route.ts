import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';

const DecisionSchema = z.object({ decision: z.enum(['APPROVED', 'REJECTED']) });

// PATCH /api/export-requests/:id — admin approves or rejects a pending export
export const PATCH = withAuth(async (req, ctx, params) => {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

  const body = await req.json();
  const { decision } = DecisionSchema.parse(body);

  const updated = await db.exportRequest.update({
    where: { id },
    data: { status: decision, approvedById: ctx.userId, resolvedAt: new Date() },
  });

  await audit({ actorId: ctx.userId, action: `export_${decision.toLowerCase()}`, entityType: 'ExportRequest', entityId: id, after: updated });

  return NextResponse.json(updated);
}, 'export_requests', 'approve');
