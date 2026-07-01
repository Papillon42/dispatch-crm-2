import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { TaskPriority, TaskCreatedFrom } from '@prisma/client';

// GET /api/tasks — optionally filtered by communicationId / status
export const GET = withAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const communicationId = searchParams.get('communicationId');
  const status = searchParams.get('status');
  const mine = searchParams.get('mine') === '1';

  const tasks = await db.task.findMany({
    where: {
      ...(communicationId ? { communicationId } : {}),
      ...(status ? { status: status as any } : {}),
      ...(mine ? { assigneeId: ctx.userId } : {}),
    },
    orderBy: [{ status: 'asc' }, { dueAt: 'asc' }],
    take: 100,
    include: { assignee: { select: { id: true, fullName: true } } },
  });

  return NextResponse.json({ tasks });
}, 'tasks', 'read');

const CreateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.nativeEnum(TaskPriority).default('MEDIUM'),
  dueAt: z.string().optional(),
  assigneeId: z.string().optional(),
  communicationId: z.string().optional(),
  relatedLoadId: z.string().optional(),
  relatedClientId: z.string().optional(),
  createdFrom: z.nativeEnum(TaskCreatedFrom).default('MANUAL'),
});

// POST /api/tasks
export const POST = withAuth(async (req, ctx) => {
  const body = await req.json();
  const data = CreateTaskSchema.parse(body);

  const task = await db.task.create({
    data: {
      ...data,
      dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
      assigneeId: data.assigneeId ?? ctx.userId,
      createdById: ctx.userId,
    },
  });

  await audit({ actorId: ctx.userId, action: 'create', entityType: 'Task', entityId: task.id, after: task });

  return NextResponse.json(task, { status: 201 });
}, 'tasks', 'create');
