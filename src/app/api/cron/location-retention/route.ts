import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/cron/location-retention — GPS history retention policy.
// Deletes LocationUpdate rows older than CompanySettings.locationRetentionDays,
// keeping one point per driver per day beyond the window (coarse archive) so
// long-term analytics still have a trail. Protect with CRON_SECRET and call it
// from a scheduler (Vercel Cron / GitHub Actions / any cron).
export async function POST(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
    ?? new URL(req.url).searchParams.get('secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const settings = await db.companySettings.findFirst({ select: { locationRetentionDays: true } });
  const retentionDays = settings?.locationRetentionDays ?? 90;
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  // Coarse archive: keep the newest point per driver per calendar day, delete the rest.
  const deleted = await db.$executeRaw`
    DELETE FROM "LocationUpdate" lu
    WHERE lu."at" < ${cutoff}
      AND lu."id" NOT IN (
        SELECT DISTINCT ON ("driverId", date_trunc('day', "at")) "id"
        FROM "LocationUpdate"
        WHERE "at" < ${cutoff}
        ORDER BY "driverId", date_trunc('day', "at"), "at" DESC
      )
  `;

  return NextResponse.json({ ok: true, retentionDays, cutoff: cutoff.toISOString(), deleted });
}
