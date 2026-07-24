import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { isValidStatusTransition } from '@/lib/auth/rbac';
import { syncDriverFromLoadStatus } from '@/lib/services/driverStatus.service';
import { LoadStatus } from '@prisma/client';
import { z } from 'zod';

const UpdateStatusSchema = z.object({
  status: z.nativeEnum(LoadStatus),
  notes: z.string().optional(),
});

// PATCH /api/loads/[id]/status
export const PATCH = withAuth(async (req, ctx, params) => {
  const loadId = params?.id;
  if (!loadId) return NextResponse.json({ error: 'Missing load ID' }, { status: 400 });

  const body = await req.json();
  const { status: newStatus, notes } = UpdateStatusSchema.parse(body);

  const load = await db.load.findUnique({
    where: { id: loadId },
    select: { id: true, status: true, dispatcherId: true, invoiceStatus: true },
  });

  if (!load) return NextResponse.json({ error: 'Load not found' }, { status: 404 });

  // Ownership check for dispatchers
  if (ctx.role === 'DISPATCHER' && load.dispatcherId !== ctx.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Financial status transitions require Finance/Admin role
  const financialStatuses: LoadStatus[] = ['INVOICED', 'PAID', 'CLOSED'];
  if (financialStatuses.includes(newStatus) && !['OWNER', 'ADMIN', 'FINANCE', 'SENIOR_DISPATCHER'].includes(ctx.role)) {
    return NextResponse.json({ error: 'Financial status changes require Finance role' }, { status: 403 });
  }

  // State machine validation
  if (!isValidStatusTransition(load.status, newStatus)) {
    return NextResponse.json({
      error: `Cannot transition from ${load.status} to ${newStatus}`,
      validTransitions: [],
    }, { status: 422 });
  }

  const [updatedLoad] = await db.$transaction([
    db.load.update({
      where: { id: loadId },
      data: { status: newStatus },
    }),
    db.loadStatusHistory.create({
      data: {
        loadId,
        fromStatus: load.status,
        toStatus: newStatus,
        changedById: ctx.userId,
        source: 'CRM',
        notes,
      },
    }),
  ]);

  await audit({
    actorId: ctx.userId,
    action: 'status_change',
    entityType: 'Load',
    entityId: loadId,
    before: { status: load.status },
    after: { status: newStatus },
  });

  // Keep the assigned driver's operational status in sync with the load
  // pipeline (ASSIGNED → driver ASSIGNED, IN_TRANSIT → driver IN_TRANSIT, ...).
  const sync = await syncDriverFromLoadStatus(ctx, loadId, newStatus, {
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  });

  return NextResponse.json({ ...updatedLoad, driverSync: sync ? { driverId: sync.driver.id, status: sync.driver.status } : null });
}, 'loads', 'update');
