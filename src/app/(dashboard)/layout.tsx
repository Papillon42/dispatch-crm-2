import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ensureUserForClerkId } from '@/lib/auth/rbac';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = auth();
  if (!userId) redirect('/login');

  // Registration gating: pending/rejected users go to onboarding, and
  // role-bound accounts land in their own cabinets instead of the CRM shell.
  const user = await ensureUserForClerkId(userId);
  if (!user || user.status === 'PENDING' || user.status === 'REJECTED') redirect('/onboarding');
  if (user.status !== 'ACTIVE') redirect('/login');
  if (user.role === 'CLIENT') redirect('/portal');
  if (user.role === 'DRIVER') redirect('/driver-app');

  return <AppShell>{children}</AppShell>;
}
