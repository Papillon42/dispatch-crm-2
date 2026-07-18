import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';

// GET /api/settings — company-wide finance & app settings (FR-M11-09)
export const GET = withAuth(async () => {
  const settings = await db.companySettings.findFirst();
  return NextResponse.json(settings ?? {
    companyName: 'Your Dispatch Co.',
    companyPercentage: 10,
    seniorCommissionRate: 1.5,
    targetRpm: 2.5,
    fixedExpenses: 0,
    timezone: 'America/Chicago',
  });
}, 'settings', 'read');

const UpdateSchema = z.object({
  companyName: z.string().optional(),
  companyPercentage: z.number().min(0).max(100).optional(),
  seniorCommissionRate: z.number().min(0).max(100).optional(),
  targetRpm: z.number().min(0).optional(),
  fixedExpenses: z.number().min(0).optional(),
  timezone: z.string().optional(),
  // Driver status automation (geofences / GPS)
  autoStatusEnabled: z.boolean().optional(),
  autoStatusMode: z.enum(['SUGGEST', 'AUTO']).optional(),
  pickupGeofenceRadiusMiles: z.number().min(0.1).max(50).optional(),
  deliveryGeofenceRadiusMiles: z.number().min(0.1).max(50).optional(),
  minGeofenceMinutes: z.number().int().min(0).max(720).optional(),
  autoInTransitOnMove: z.boolean().optional(),
  gpsStaleMinutes: z.number().int().min(1).max(1440).optional(),
  notifyOnStatusChange: z.boolean().optional(),
  locationRetentionDays: z.number().int().min(7).max(3650).optional(),
});

// PATCH /api/settings
export const PATCH = withAuth(async (req, ctx) => {
  const body = await req.json();
  const data = UpdateSchema.parse(body);

  const existing = await db.companySettings.findFirst();
  const settings = existing
    ? await db.companySettings.update({ where: { id: existing.id }, data })
    : await db.companySettings.create({ data: { companyName: 'Your Dispatch Co.', ...data } });

  await audit({
    actorId: ctx.userId,
    action: 'update',
    entityType: 'CompanySettings',
    entityId: settings.id,
    before: existing ?? undefined,
    after: settings,
  });

  return NextResponse.json(settings);
}, 'settings', 'update');
