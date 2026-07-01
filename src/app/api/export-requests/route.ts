import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { ExportScope } from '@prisma/client';

// GET /api/export-requests — the admin-approval queue (§16: no bulk export without approval)
export const GET = withAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  const requests = await db.exportRequest.findMany({
    where: status ? { status: status as any } : undefined,
    orderBy: { at: 'desc' },
    include: {
      requestedBy: { select: { fullName: true, role: true } },
      approvedBy: { select: { fullName: true } },
    },
  });

  return NextResponse.json({ requests });
}, 'export_requests', 'read');

const CreateSchema = z.object({
  scope: z.nativeEnum(ExportScope),
  reason: z.string().optional(),
});

// POST /api/export-requests — any internal role can request an export; it queues for admin approval
export const POST = withAuth(async (req, ctx) => {
  const body = await req.json();
  const data = CreateSchema.parse(body);

  const request = await db.exportRequest.create({
    data: { requestedById: ctx.userId, scope: data.scope, reason: data.reason },
  });

  await audit({ actorId: ctx.userId, action: 'export_request', entityType: 'ExportRequest', entityId: request.id, after: request });

  return NextResponse.json(request, { status: 201 });
}, 'export_requests', 'read');
