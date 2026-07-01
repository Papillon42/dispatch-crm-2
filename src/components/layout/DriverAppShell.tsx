'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, ListChecks, Map as MapIcon, FileText, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/driver-app', label: 'Load', icon: Package },
  { href: '/driver-app/status', label: 'Status', icon: ListChecks },
  { href: '/driver-app/trip', label: 'Route', icon: MapIcon },
  { href: '/driver-app/documents', label: 'Docs & Chat', icon: FileText },
];

export function DriverAppShell({ title, children }: { title: string; children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-background-secondary border-x border-border-subtle flex flex-col">
        <header className="flex items-center justify-between px-4 py-4 border-b border-border-subtle">
          <h1 className="text-base font-semibold text-text-primary">{title}</h1>
          <button className="relative w-8 h-8 rounded-full bg-background-hover flex items-center justify-center">
            <Bell className="w-4 h-4 text-text-secondary" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-danger" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto pb-20">{children}</main>

        <nav className="fixed bottom-0 w-full max-w-md border-t border-border bg-background-secondary flex">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 py-2.5 text-2xs',
                  active ? 'text-brand-light' : 'text-text-muted',
                )}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
