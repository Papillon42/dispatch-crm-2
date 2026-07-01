import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { canScope, getClientFilter, withAuth } from '@/lib/auth/rbac';

const CreateTelegramLinkSchema = z.object({
  entityType: z.enum(['driver', 'client']),
  entityId: z.string().min(1),
});

function newLinkCode() {
  return randomBytes(4).toString('hex').toUpperCase();
}

function expiryDate() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  return expiresAt;
}

function getDriverScopeFilter(ctx: Parameters<typeof canScope>[0] extends never ? never : any) {
  const scope = canScope(ctx.role, 'read', 'drivers');
  if (scope === 'all') return {};
  if (scope === 'team') {
    return { dispatcher: { OR: [{ id: ctx.userId }, { managerId: ctx.userId }] } };
  }
  return { dispatcherId: ctx.userId };
}

export const GET = withAuth(async (_req, ctx) => {
  const [drivers, clients, links] = await Promise.all([
    db.driver.findMany({
      where: getDriverScopeFilter(ctx),
      orderBy: { fullName: 'asc' },
      select: {
        id: true,
        fullName: true,
        phone: true,
        status: true,
        telegramChatId: true,
        client: { select: { companyName: true } },
      },
    }),
    db.client.findMany({
      where: getClientFilter(ctx),
      orderBy: { companyName: 'asc' },
      select: {
        id: true,
        companyName: true,
        status: true,
        contacts: {
          where: { isPrimary: true },
          take: 1,
          select: { name: true, phone: true, telegram: true },
        },
      },
    }),
    db.telegramLink.findMany({
      where: { used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  return NextResponse.json({
    configured: {
      botToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      webhookSecret: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET),
    },
    webhookPath: '/api/integrations/telegram/webhook',
    drivers,
    clients,
    links,
  });
}, 'communications', 'read');

export const POST = withAuth(async (req, ctx) => {
  const body = await req.json();
  const { entityType, entityId } = CreateTelegramLinkSchema.parse(body);

  if (entityType === 'driver') {
    const driver = await db.driver.findFirst({
      where: { id: entityId, ...getDriverScopeFilter(ctx) },
      select: { id: true },
    });

    if (!driver) {
      return NextResponse.json({ error: 'Driver not found or out of scope' }, { status: 404 });
    }
  } else {
    const client = await db.client.findFirst({
      where: { id: entityId, ...getClientFilter(ctx) },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found or out of scope' }, { status: 404 });
    }
  }

  await db.telegramLink.updateMany({
    where: { entityType, entityId, used: false, expiresAt: { gt: new Date() } },
    data: { used: true },
  });

  let code = newLinkCode();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const existing = await db.telegramLink.findUnique({ where: { code } });
    if (!existing) break;
    code = newLinkCode();
  }

  const link = await db.telegramLink.create({
    data: {
      code,
      entityType,
      entityId,
      expiresAt: expiryDate(),
    },
  });

  await audit({
    actorId: ctx.userId,
    action: 'create_telegram_link',
    entityType: entityType === 'driver' ? 'Driver' : 'Client',
    entityId,
    after: { code: link.code, expiresAt: link.expiresAt },
  });

  return NextResponse.json(link, { status: 201 });
}, 'communications', 'create');
