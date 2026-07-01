import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/rbac';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/lib/db';
import { z } from 'zod';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const AiRequestSchema = z.object({
  action: z.enum([
    'parse_rate_confirmation',
    'summarize_communication',
    'analyze_low_rpm',
    'generate_weekly_report',
    'nl_search',
    'next_best_action',
  ]),
  payload: z.any(),
});

// POST /api/ai
export const POST = withAuth(async (req, ctx) => {
  const body = await req.json();
  const { action, payload } = AiRequestSchema.parse(body);

  switch (action) {
    case 'parse_rate_confirmation': {
      // Parse PDF/email text → pre-fill load form
      const { text } = payload as { text: string };
      // PII minimization: don't send driver/client PII, only doc content
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Extract load details from this rate confirmation. Return ONLY valid JSON with these fields:
{
  "brokerName": string | null,
  "brokerMc": string | null,
  "rate": number | null,
  "pickupAddress": string | null,
  "pickupCity": string | null,
  "pickupState": string | null,
  "pickupDate": string | null,
  "deliveryAddress": string | null,
  "deliveryCity": string | null,
  "deliveryState": string | null,
  "deliveryDate": string | null,
  "loadedMiles": number | null,
  "commodity": string | null,
  "weight": number | null,
  "equipmentType": string | null,
  "referenceNumber": string | null,
  "lumper": number | null,
  "detention": number | null
}

Rate confirmation text:
${text.slice(0, 4000)}`,
        }],
      });

      const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}';
      let parsed: any = {};
      try { parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim()); } catch {}

      return NextResponse.json({ result: parsed, confidence: 'requires_review' });
    }

    case 'summarize_communication': {
      const { body: commBody, channel } = payload as { body: string; channel: string };
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Summarize this ${channel} communication in 2-3 sentences and list any action items.
Return JSON: { "summary": string, "actionItems": string[] }

Communication:
${commBody.slice(0, 3000)}`,
        }],
      });

      const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
      let parsed: any = { summary: '', actionItems: [] };
      try { parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()); } catch {}
      return NextResponse.json({ result: parsed });
    }

    case 'analyze_low_rpm': {
      // Get loads below target RPM from DB
      const settings = await db.companySettings.findFirst();
      const targetRpm = settings?.targetRpm ?? 2.5;

      const loads = await db.load.findMany({
        where: {
          rpm: { lt: targetRpm, not: null },
          status: { in: ['DELIVERED', 'PAID', 'CLOSED'] },
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        select: {
          loadCode: true, rpm: true,
          pickupState: true, deliveryState: true,
          rate: true, totalMiles: true,
        },
        take: 20,
      });

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `Analyze these trucking loads with RPM below $${targetRpm}/mi and provide 3 actionable recommendations.
Return JSON: { "insights": string[], "recommendations": string[], "worstLanes": string[] }

Loads data (last 30 days):
${JSON.stringify(loads)}`,
        }],
      });

      const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
      let parsed: any = {};
      try { parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()); } catch {}
      return NextResponse.json({ result: parsed, targetRpm, analyzedLoads: loads.length });
    }

    case 'nl_search': {
      const { query } = payload as { query: string };

      // Translate NL to filter criteria — never pass raw SQL
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: `Convert this natural language search into structured filter criteria for a trucking CRM.
Return ONLY JSON with these optional fields:
{
  "status": LoadStatus | null,
  "brokerName": string | null,
  "clientName": string | null,
  "driverName": string | null,
  "pickupState": string | null,
  "deliveryState": string | null,
  "minRpm": number | null,
  "maxRpm": number | null,
  "fromDate": string | null,
  "toDate": string | null
}

Valid LoadStatus values: NEW_LEAD, NEGOTIATING, BOOKED, RATE_CONFIRMATION_RECEIVED, ASSIGNED, EN_ROUTE_TO_PICKUP, AT_PICKUP, LOADED, IN_TRANSIT, AT_DELIVERY, DELIVERED, POD_UPLOADED, INVOICED, PAID, CLOSED, CANCELLED, PROBLEM

Query: "${query}"`,
        }],
      });

      const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
      let filters: any = {};
      try { filters = JSON.parse(raw.replace(/```json|```/g, '').trim()); } catch {}

      // Execute safe filtered query
      const where: any = {};
      if (filters.status) where.status = filters.status;
      if (filters.pickupState) where.pickupState = { contains: filters.pickupState, mode: 'insensitive' };
      if (filters.deliveryState) where.deliveryState = { contains: filters.deliveryState, mode: 'insensitive' };
      if (filters.minRpm || filters.maxRpm) {
        where.rpm = {};
        if (filters.minRpm) where.rpm.gte = filters.minRpm;
        if (filters.maxRpm) where.rpm.lte = filters.maxRpm;
      }
      if (filters.fromDate) where.createdAt = { gte: new Date(filters.fromDate) };
      if (filters.brokerName) where.broker = { name: { contains: filters.brokerName, mode: 'insensitive' } };

      const loads = await db.load.findMany({
        where,
        take: 25,
        orderBy: { updatedAt: 'desc' },
        include: {
          client: { select: { companyName: true } },
          driver: { select: { fullName: true } },
          broker: { select: { name: true } },
        },
      });

      return NextResponse.json({ result: loads, filtersApplied: filters, query });
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}, 'loads', 'read');
