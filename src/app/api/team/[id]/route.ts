import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';

// DELETE /api/team/:id — soft delete a dispatcher/updater/finance/admin
// account by setting status = SUSPENDED (reuses the existing UserStatus enum
// rather than adding a redundant deletedAt column). Suspended users vanish
// from the active team list and role summary, but their historical
// assignments (dispatcherId on Loads/Clients/Drivers, audit log entries,
// commissions) are left untouched.
export const DELETE = withAuth(async (req, ctx, params) => {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });

  if (id === ctx.userId) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (existing.status === 'SUSPENDED') return NextResponse.json({ error: 'User already deleted' }, { status: 409 });

  const deleted = await db.user.update({
    where: { id },
    data: { status: 'SUSPENDED' },
  });

  await audit({ actorId: ctx.userId, action: 'delete', entityType: 'User', entityId: id, before: existing, after: deleted });

  return NextResponse.json({ ok: true });
}, 'users', 'delete');
