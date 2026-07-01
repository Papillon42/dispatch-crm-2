import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { IssueType } from '@prisma/client';
import { z } from 'zod';

const CreateIssueSchema = z.object({
  type: z.nativeEnum(IssueType),
  description: z.string().min(1),
  driverId: z.string().optional(),
});

// POST /api/loads/:id/issues — log a problem (detention, breakdown, weather, etc.)
export const POST = withAuth(async (req, ctx, params) => {
  const loadId = params?.id;
  if (!loadId) return NextResponse.json({ error: 'Missing load ID' }, { status: 400 });

  const body = await req.json();
  const data = CreateIssueSchema.parse(body);

  const load = await db.load.findUnique({ where: { id: loadId }, select: { id: true, status: true } });
  if (!load) return NextResponse.json({ error: 'Load not found' }, { status: 404 });

  const issue = await db.issue.create({
    data: {
      loadId,
      type: data.type,
      description: data.description,
      driverId: data.driverId,
      createdById: ctx.userId,
    },
  });

  await audit({ actorId: ctx.userId, action: 'create', entityType: 'Issue', entityId: issue.id, after: issue });

  return NextResponse.json(issue, { status: 201 });
}, 'issues', 'create');

// PATCH /api/loads/:id/issues — resolve an issue: body { issueId, status }
const ResolveIssueSchema = z.object({
  issueId: z.string(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']),
});

export const PATCH = withAuth(async (req, ctx) => {
  const body = await req.json();
  const data = ResolveIssueSchema.parse(body);

  const updated = await db.issue.update({
    where: { id: data.issueId },
    data: {
      status: data.status,
      resolvedAt: data.status === 'RESOLVED' ? new Date() : null,
    },
  });

  await audit({ actorId: ctx.userId, action: 'update', entityType: 'Issue', entityId: updated.id, after: updated });

  return NextResponse.json(updated);
}, 'issues', 'update');
