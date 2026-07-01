import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = auth();
  if (!userId) redirect('/login');

  return <AppShell>{children}</AppShell>;
}
