import { db } from '@/lib/db';

interface AuditOptions {
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: object;
  after?: object;
  ip?: string;
}

export async function audit(opts: AuditOptions) {
  try {
    await db.auditLog.create({
      data: {
        actorId: opts.actorId,
        action: opts.action,
        entityType: opts.entityType,
        entityId: opts.entityId,
        before: opts.before as any,
        after: opts.after as any,
        ip: opts.ip,
      },
    });
  } catch (err) {
    // Audit log failure should never crash the main flow
    console.error('[AuditLog] Failed to write:', err);
  }
}
