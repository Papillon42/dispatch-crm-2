import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';

// DELETE /api/drivers/:id — soft delete (sets deletedAt). Historical Loads,
// LocationUpdates, Documents, Issues stay intact for reporting/audit trail;
// the driver just stops appearing in active lists and pickers.
export const DELETE = withAuth(async (req, ctx, params) => {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing driver ID' }, { status: 400 });

  const existing = await db.driver.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
  if (existing.deletedAt) return NextResponse.json({ error: 'Driver already deleted' }, { status: 409 });

  const deleted = await db.driver.update({
    where: { id },
    data: { deletedAt: new Date(), status: 'INACTIVE' },
  });

  await audit({ actorId: ctx.userId, action: 'delete', entityType: 'Driver', entityId: id, before: existing, after: deleted });

  return NextResponse.json({ ok: true });
}, 'drivers', 'delete');
