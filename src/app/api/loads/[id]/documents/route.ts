import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { DocumentType } from '@prisma/client';
import { z } from 'zod';

const CreateDocumentSchema = z.object({
  docType: z.nativeEnum(DocumentType),
  fileName: z.string().min(1),
  fileUrl: z.string().min(1),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
});

// POST /api/loads/:id/documents — attach a document (Rate Conf, BOL, POD, Lumper Receipt, ...)
// NOTE: this endpoint stores document metadata only. Actual file bytes are expected to be
// uploaded to Supabase Storage / S3 by the client first (see §20 stack decision), and fileUrl
// passed here is the resulting object URL.
export const POST = withAuth(async (req, ctx, params) => {
  const loadId = params?.id;
  if (!loadId) return NextResponse.json({ error: 'Missing load ID' }, { status: 400 });

  const body = await req.json();
  const data = CreateDocumentSchema.parse(body);

  const load = await db.load.findUnique({ where: { id: loadId }, select: { id: true } });
  if (!load) return NextResponse.json({ error: 'Load not found' }, { status: 404 });

  const document = await db.document.create({
    data: {
      entityType: 'LOAD',
      entityId: loadId,
      docType: data.docType,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      uploadedById: ctx.userId,
    },
  });

  await audit({ actorId: ctx.userId, action: 'create', entityType: 'Document', entityId: document.id, after: document });

  return NextResponse.json(document, { status: 201 });
}, 'documents', 'create');
