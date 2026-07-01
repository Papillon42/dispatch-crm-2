import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = auth();
  if (!userId) redirect('/login');

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
