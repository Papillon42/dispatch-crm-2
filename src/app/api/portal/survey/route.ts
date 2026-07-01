import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPortalAuthContext } from '@/lib/auth/portal';
import { db } from '@/lib/db';

const SurveySchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

function isoWeek(d: Date) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNo = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${date.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// POST /api/portal/survey — client submits a weekly quality rating for their dispatcher
export async function POST(req: Request) {
  const ctx = await getPortalAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const data = SurveySchema.parse(body);

  const client = await db.client.findUnique({ where: { id: ctx.clientId }, select: { dispatcherId: true } });

  const survey = await db.survey.create({
    data: {
      clientId: ctx.clientId,
      dispatcherId: client?.dispatcherId ?? undefined,
      rating: data.rating,
      comment: data.comment,
      week: isoWeek(new Date()),
    },
  });

  return NextResponse.json(survey, { status: 201 });
}
