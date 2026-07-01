import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isValidStatusTransition } from '@/lib/auth/rbac';
import { DocumentType, LoadStatus } from '@prisma/client';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

// Map Telegram button callbacks to LoadStatus
const STATUS_BUTTON_MAP: Record<string, LoadStatus> = {
  'status_empty':      'EN_ROUTE_TO_PICKUP',
  'status_at_pickup':  'AT_PICKUP',
  'status_loaded':     'LOADED',
  'status_at_delivery':'AT_DELIVERY',
  'status_delivered':  'DELIVERED',
  'status_problem':    'PROBLEM',
};

function getStatusKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🚛 En Route to Pickup', callback_data: 'status_empty' },
        { text: '📦 At Pickup', callback_data: 'status_at_pickup' },
      ],
      [
        { text: '✅ Loaded', callback_data: 'status_loaded' },
        { text: '🏁 At Delivery', callback_data: 'status_at_delivery' },
      ],
      [
        { text: '🎉 Delivered', callback_data: 'status_delivered' },
        { text: '⚠️ Problem', callback_data: 'status_problem' },
      ],
    ],
  };
}

export async function POST(req: NextRequest) {
  // Verify webhook secret
  const secret = req.headers.get('x-telegram-bot-api-secret-token');
  if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!BOT_TOKEN) {
    return NextResponse.json({ error: 'Telegram bot token not configured' }, { status: 503 });
  }

  const update = await req.json();

  try {
    // Handle callback queries (button presses)
    if (update.callback_query) {
      const { id: queryId, data: callbackData, from } = update.callback_query;
      const chatId = from.id.toString();

      const newStatus = STATUS_BUTTON_MAP[callbackData];
      if (!newStatus) {
        await answerCallback(queryId, '❓ Unknown action');
        return NextResponse.json({ ok: true });
      }

      // Find driver by Telegram chat ID
      const driver = await db.driver.findFirst({
        where: { telegramChatId: chatId },
        include: {
          loads: {
            where: { status: { notIn: ['CLOSED', 'CANCELLED', 'PAID'] } },
            orderBy: { updatedAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!driver) {
        await answerCallback(queryId, '❌ Driver not linked. Use /link command.');
        return NextResponse.json({ ok: true });
      }

      const currentLoad = driver.loads[0];
      if (!currentLoad) {
        await answerCallback(queryId, '❌ No active load found.');
        return NextResponse.json({ ok: true });
      }

      if (!isValidStatusTransition(currentLoad.status, newStatus)) {
        await answerCallback(queryId, `❌ Cannot change from ${currentLoad.status} to ${newStatus}`);
        return NextResponse.json({ ok: true });
      }

      // Update load status
      await db.$transaction([
        db.load.update({ where: { id: currentLoad.id }, data: { status: newStatus } }),
        db.loadStatusHistory.create({
          data: {
            loadId: currentLoad.id,
            fromStatus: currentLoad.status,
            toStatus: newStatus,
            source: 'TELEGRAM',
            notes: `Updated via Telegram by driver ${driver.fullName}`,
          },
        }),
      ]);

      await answerCallback(queryId, `✅ Status updated to: ${newStatus.replace(/_/g, ' ')}`);

      // Send updated keyboard
      await sendMessage(chatId,
        `📦 Load #${currentLoad.loadCode}\nStatus: *${newStatus.replace(/_/g, ' ')}*\n\nUpdate status:`,
        { parse_mode: 'Markdown', reply_markup: getStatusKeyboard() }
      );

      return NextResponse.json({ ok: true });
    }

    // Handle regular messages
    if (update.message) {
      const { chat, text, from, document, photo } = update.message;
      const chatId = chat.id.toString();

      // /start or /link command — generate link code
      if (text?.startsWith('/start') || text?.startsWith('/link')) {
        const parts = text.split(' ');
        const linkCode = parts[1];

        if (linkCode) {
          const link = await db.telegramLink.findFirst({
            where: { code: linkCode, used: false, expiresAt: { gt: new Date() } },
          });

          if (link) {
            if (link.entityType === 'driver') {
              await db.driver.update({
                where: { id: link.entityId },
                data: { telegramChatId: chatId },
              });
              await db.telegramLink.update({ where: { id: link.id }, data: { used: true } });
              await sendMessage(chatId, '✅ Your Telegram is now linked to Dispatch CRM! Use /status to update your current load.');
            } else if (link.entityType === 'client') {
              await db.clientContact.updateMany({
                where: { clientId: link.entityId, isPrimary: true },
                data: { telegram: chatId },
              });
              await db.telegramLink.update({ where: { id: link.id }, data: { used: true } });
              await sendMessage(chatId, '✅ Your Telegram is linked as a client. You will receive load updates here.');
            }
          } else {
            await sendMessage(chatId, '❌ Invalid or expired link code. Get a new one from your dispatcher.');
          }
        } else {
          await sendMessage(chatId, 'Welcome to Dispatch CRM Bot!\n\nUse the link code provided by your dispatcher:\n/start <your_link_code>');
        }
        return NextResponse.json({ ok: true });
      }

      if (text === '/help') {
        await sendMessage(chatId, [
          '*Dispatch CRM Bot*',
          '/status — current load and status buttons',
          '/whoami — linked account',
          '/link <code> — connect this chat',
          '',
          'Send a photo or document while on a load to attach it to the load record.',
        ].join('\n'), { parse_mode: 'Markdown' });
        return NextResponse.json({ ok: true });
      }

      if (text === '/whoami') {
        const driver = await db.driver.findFirst({
          where: { telegramChatId: chatId },
          select: { fullName: true, client: { select: { companyName: true } } },
        });

        if (driver) {
          await sendMessage(chatId, `Linked as driver: *${driver.fullName}*\nClient: ${driver.client.companyName}`, { parse_mode: 'Markdown' });
          return NextResponse.json({ ok: true });
        }

        const contact = await db.clientContact.findFirst({
          where: { telegram: chatId },
          select: { name: true, client: { select: { companyName: true } } },
        });

        if (contact) {
          await sendMessage(chatId, `Linked as client contact: *${contact.name}*\nClient: ${contact.client.companyName}`, { parse_mode: 'Markdown' });
          return NextResponse.json({ ok: true });
        }

        await sendMessage(chatId, 'This chat is not linked yet.');
        return NextResponse.json({ ok: true });
      }

      // /status — show current load + status buttons
      if (text === '/status') {
        const driver = await db.driver.findFirst({
          where: { telegramChatId: chatId },
          include: {
            loads: {
              where: { status: { notIn: ['CLOSED', 'CANCELLED', 'PAID'] } },
              orderBy: { updatedAt: 'desc' },
              take: 1,
            },
          },
        });

        if (!driver) {
          await sendMessage(chatId, '❌ Not linked. Ask your dispatcher for a link code.');
          return NextResponse.json({ ok: true });
        }

        const load = driver.loads[0];
        if (!load) {
          await sendMessage(chatId, '✅ No active load. Standing by!');
          return NextResponse.json({ ok: true });
        }

        const msg = `📦 *Load #${load.loadCode}*\nStatus: ${load.status.replace(/_/g, ' ')}\n${load.pickupCity} → ${load.deliveryCity}\nRate: $${load.rate}`;
        await sendMessage(chatId, msg, { parse_mode: 'Markdown', reply_markup: getStatusKeyboard() });
        return NextResponse.json({ ok: true });
      }

      // Document/photo — save as POD/BOL
      if (document || photo) {
        const driver = await db.driver.findFirst({
          where: { telegramChatId: chatId },
          include: {
            loads: {
              where: { status: { notIn: ['CLOSED', 'CANCELLED', 'PAID'] } },
              take: 1,
            },
          },
        });

        const load = driver?.loads[0];
        if (driver && load) {
          const photoFile = Array.isArray(photo) ? photo[photo.length - 1] : null;
          const fileId = document?.file_id ?? photoFile?.file_id;
          const fileName = document?.file_name ?? `telegram-${fileId}.jpg`;
          const mimeType = document?.mime_type ?? (photoFile ? 'image/jpeg' : undefined);
          const docType: DocumentType = load.status === 'DELIVERED' || load.status === 'POD_UPLOADED'
            ? 'POD'
            : 'BOL';

          await db.document.create({
            data: {
              entityType: 'LOAD',
              entityId: load.id,
              docType,
              fileName,
              fileUrl: `telegram:${fileId}`,
              fileSize: document?.file_size,
              mimeType,
              notes: `Received via Telegram from ${driver.fullName}. Telegram file id: ${fileId}`,
            },
          });

          await sendMessage(chatId, `📎 ${docType.replace(/_/g, ' ')} received for load #${load.loadCode}.`);
        } else {
          await sendMessage(chatId, '❌ No active load to attach document to.');
        }
        return NextResponse.json({ ok: true });
      }

      if (text) {
        await sendMessage(chatId, 'I did not recognize that command. Use /help.');
      }
    }
  } catch (err) {
    console.error('[TelegramWebhook] Error:', err);
  }

  return NextResponse.json({ ok: true });
}

async function sendMessage(chatId: string, text: string, extra?: object) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, ...extra }),
  });
}

async function answerCallback(queryId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: queryId, text, show_alert: false }),
  });
}
