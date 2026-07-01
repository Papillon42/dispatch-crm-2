'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import {
  Home, Package, UserCheck, DollarSign, FileText,
  BarChart2, ClipboardList, LifeBuoy, Truck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';

const NAV_ITEMS = [
  { label: 'Home',      href: '/portal',            icon: Home },
  { label: 'Loads',     href: '/portal/loads',       icon: Package },
  { label: 'Drivers',   href: '/portal/drivers',     icon: UserCheck },
  { label: 'Finance',   href: '/portal/finance',     icon: DollarSign },
  { label: 'Documents', href: '/portal/documents',   icon: FileText },
  { label: 'Reports',   href: '/portal/reports',     icon: BarChart2 },
  { label: 'Surveys',   href: '/portal/surveys',     icon: ClipboardList },
  { label: 'Support',   href: '/portal/support',     icon: LifeBuoy },
];

export function PortalSidebar({ companyName }: { companyName: string }) {
  const pathname = usePathname();

  return (
    <aside className="w-[220px] flex-shrink-0 border-r border-border bg-background-secondary flex flex-col h-screen sticky top-0">
      <div className="px-4 py-5 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
            <Truck className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary">Client Portal</p>
            <p className="text-2xs text-text-muted truncate">{companyName}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn('nav-item', pathname === href && 'active')}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-border-subtle space-y-2">
        <div className="flex items-center justify-between px-3">
          <span className="text-2xs text-text-muted">Theme</span>
          <ThemeSwitcher />
        </div>
        <div className="flex items-center gap-3 px-3 py-2">
          <UserButton afterSignOutUrl="/login" />
          <span className="text-sm text-text-secondary">Account</span>
        </div>
      </div>
    </aside>
  );
}
