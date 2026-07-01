import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/rbac';
import { db } from '@/lib/db';

// GET /api/documents — org-wide document library across loads/clients/drivers/trucks
export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get('entityType');
  const docType = searchParams.get('docType');
  const search = searchParams.get('search')?.trim();

  const documents = await db.document.findMany({
    where: {
      ...(entityType && entityType !== 'ALL' ? { entityType: entityType as any } : {}),
      ...(docType && docType !== 'ALL' ? { docType: docType as any } : {}),
      ...(search ? { fileName: { contains: search, mode: 'insensitive' } } : {}),
    },
    orderBy: { uploadedAt: 'desc' },
    take: 200,
    include: {
      load: { select: { loadCode: true } },
      client: { select: { companyName: true } },
      driver: { select: { fullName: true } },
      truck: { select: { truckNumber: true } },
    },
  });

  return NextResponse.json({ documents });
}, 'documents', 'read');
