import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';

// DELETE /api/clients/:id — soft delete (sets deletedAt). Trucks/Drivers/Loads
// tied to this client are left as-is; the client just stops appearing in
// active lists. Prevents deleting a client that still has active drivers.
export const DELETE = withAuth(async (req, ctx, params) => {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing client ID' }, { status: 400 });

  const existing = await db.client.findUnique({
    where: { id },
    include: { _count: { select: { drivers: true, trucks: true, loads: true } } },
  });
  if (!existing) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  if (existing.deletedAt) return NextResponse.json({ error: 'Client already deleted' }, { status: 409 });

  const deleted = await db.client.update({
    where: { id },
    data: { deletedAt: new Date(), status: 'INACTIVE' },
  });

  await audit({ actorId: ctx.userId, action: 'delete', entityType: 'Client', entityId: id, before: existing, after: deleted });

  return NextResponse.json({ ok: true });
}, 'clients', 'delete');
