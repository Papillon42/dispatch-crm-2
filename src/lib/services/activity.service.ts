// "Recent Activity" + "Integrations" cards. Reads from ActivityLog /
// Integration when populated; falls back to deriving a feed from
// LoadStatusHistory so the card is never empty on a freshly-seeded DB.

import { db } from '@/lib/db';
import { timeAgo } from '@/lib/utils';
import { Prisma } from '@prisma/client';
import { toRouteStatus } from './map.service';
import type { ActivityRow, IntegrationRow, ActiveDriverRow } from './types';

export async function getRecentActivity(limit = 10): Promise<ActivityRow[]> {
  const logs = await db.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  if (logs.length > 0) {
    return logs.map((l: any) => ({
      id: l.id,
      title: l.title,
      description: l.description,
      entityType: l.entityType,
      action: l.action,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  // Fallback: derive a readable feed from load status changes so the card
  // has real signal even before ActivityLog is written to by every module.
  const history = await db.loadStatusHistory.findMany({
    orderBy: { at: 'desc' },
    take: limit,
    include: { load: { select: { loadCode: true } }, changedBy: { select: { fullName: true } } },
  });

  return history.map((h: any) => ({
    id: h.id,
    title: `Load ${h.load?.loadCode ?? ''} status changed`,
    description: `${h.fromStatus ?? '—'} → ${h.toStatus}${h.changedBy ? ` · ${h.changedBy.fullName}` : ''}`,
    entityType: 'Load',
    action: 'status_changed',
    createdAt: h.at.toISOString(),
  }));
}

export async function logActivity(input: {
  actorId?: string | null;
  entityType: string;
  entityId?: string | null;
  action: string;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.activityLog.create({
    data: {
      actorId: input.actorId ?? undefined,
      entityType: input.entityType,
      entityId: input.entityId ?? undefined,
      action: input.action,
      title: input.title,
      description: input.description ?? undefined,
      metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : undefined,
    },
  });
}

const DEFAULT_INTEGRATIONS: Array<{ type: string; name: string }> = [
  { type: 'ringcentral', name: 'RingCentral' },
  { type: 'gmail', name: 'Gmail' },
  { type: 'telegram', name: 'Telegram' },
];

export async function getIntegrations(): Promise<IntegrationRow[]> {
  const rows = await db.integration.findMany({ orderBy: { name: 'asc' } });

  if (rows.length > 0) {
    return rows.map((r: any) => ({
      id: r.id,
      type: r.type,
      name: r.name,
      status: r.status,
      isConnected: r.isConnected,
      lastSyncAt: r.lastSyncAt ? r.lastSyncAt.toISOString() : null,
    }));
  }

  // Nothing seeded yet — reflect env-derived state for Telegram (the one
  // integration this repo actually wires up) and show the rest as disconnected.
  const telegramConnected = !!process.env.TELEGRAM_BOT_TOKEN && !!process.env.TELEGRAM_WEBHOOK_SECRET;
  return DEFAULT_INTEGRATIONS.map((i) => ({
    id: i.type,
    type: i.type,
    name: i.name,
    status: i.type === 'telegram' && telegramConnected ? 'connected' : 'disconnected',
    isConnected: i.type === 'telegram' && telegramConnected,
    lastSyncAt: null,
  }));
}

export async function getActiveDriversForDashboard(limit = 5): Promise<ActiveDriverRow[]> {
  const drivers = await db.driver.findMany({
    where: { status: { in: ['AVAILABLE', 'ON_LOAD'] } },
    take: limit,
    orderBy: { updatedAt: 'desc' },
    include: {
      locationUpdates: { orderBy: { at: 'desc' }, take: 1 },
    },
  });

  const results: ActiveDriverRow[] = [];
  for (const d of drivers) {
    const loc: any = d.locationUpdates[0];
    let load: any = null;
    if (d.currentLoadId) {
      load = await db.load.findUnique({
        where: { id: d.currentLoadId },
        select: { id: true, loadCode: true, status: true, pickupCity: true, pickupState: true, deliveryCity: true, deliveryState: true },
      });
    }

    const route = load
      ? `${load.pickupCity ?? '—'}${load.pickupState ? ', ' + load.pickupState : ''} → ${load.deliveryCity ?? '—'}${load.deliveryState ? ', ' + load.deliveryState : ''}`
      : (loc?.label ?? '—');

    results.push({
      id: d.id,
      name: d.fullName,
      avatar: d.avatarUrl,
      currentLoadId: load?.id ?? null,
      loadNumber: load?.loadCode ?? null,
      route,
      lastUpdate: loc ? timeAgo(loc.at) : d.status === 'ON_LOAD' ? 'online' : 'available',
      status: load ? toRouteStatus(load.status) : 'AVAILABLE',
    });
  }
  return results;
}
