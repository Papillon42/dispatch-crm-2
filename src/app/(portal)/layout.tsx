import { redirect } from 'next/navigation';
import { getPortalAuthContext } from '@/lib/auth/portal';
import { db } from '@/lib/db';
import { PortalSidebar } from '@/components/layout/PortalSidebar';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getPortalAuthContext();
  if (!ctx) redirect('/login');

  const client = await db.client.findUnique({ where: { id: ctx.clientId }, select: { companyName: true } });

  return (
    <div className="flex h-screen overflow-hidden">
      <PortalSidebar companyName={client?.companyName ?? 'Your Company'} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
