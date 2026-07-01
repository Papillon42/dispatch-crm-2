import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDriverAppAuthContext } from '@/lib/auth/driverApp';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { DocumentType } from '@prisma/client';

const BodySchema = z.object({
  loadId: z.string(),
  docType: z.nativeEnum(DocumentType),
  fileName: z.string(),
  fileUrl: z.string(),
});

// POST /api/driver-app/documents — driver uploads BOL/POD from camera/file (FR-M13-05)
export async function POST(req: Request) {
  const ctx = await getDriverAppAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const data = BodySchema.parse(body);

  const load = await db.load.findUnique({ where: { id: data.loadId }, select: { id: true, driverId: true } });
  if (!load || load.driverId !== ctx.driverId) {
    return NextResponse.json({ error: 'Load not found or not assigned to you' }, { status: 403 });
  }

  const document = await db.document.create({
    data: {
      entityType: 'LOAD',
      entityId: data.loadId,
      docType: data.docType,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      uploadedById: undefined,
    },
  });

  await audit({ action: 'create', entityType: 'Document', entityId: document.id, after: document });

  return NextResponse.json(document, { status: 201 });
}
