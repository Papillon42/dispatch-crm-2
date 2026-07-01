'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import {
  LayoutDashboard, Users, Truck, UserCheck, Package,
  Map, MessageSquare, DollarSign, BarChart2, Settings,
  Shield, Bot, Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Dashboard',      href: '/dashboard',        icon: LayoutDashboard },
  { label: 'Clients',        href: '/clients',           icon: Users },
  { label: 'Drivers',        href: '/drivers',           icon: UserCheck },
  { label: 'Trucks',         href: '/trucks',            icon: Truck },
  { label: 'Loads',          href: '/loads',             icon: Package },
  { label: 'Map',            href: '/map',               icon: Map },
  { label: 'Communications', href: '/communications',    icon: MessageSquare },
  { label: 'Telegram Bot',   href: '/telegram',          icon: Send },
  { label: 'Finance',        href: '/finance',           icon: DollarSign },
  { label: 'Reports',        href: '/reports',           icon: BarChart2 },
  { label: 'AI Assistant',   href: '/ai',                icon: Bot },
];

const BOTTOM_ITEMS = [
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Security',  href: '/security',  icon: Shield },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[220px] flex-shrink-0 border-r border-border bg-background-secondary flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
            <Truck className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">Dispatch CRM</p>
            <p className="text-2xs text-text-muted">Operations</p>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'nav-item',
              pathname.startsWith(href) && href !== '/dashboard'
                ? 'active'
                : pathname === href && href === '/dashboard'
                  ? 'active'
                  : '',
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-border-subtle space-y-0.5">
        {BOTTOM_ITEMS.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn('nav-item', pathname.startsWith(href) && 'active')}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{label}</span>
          </Link>
        ))}
        <div className="flex items-center gap-3 px-3 py-2 mt-1">
          <UserButton afterSignOutUrl="/login" />
          <span className="text-sm text-text-secondary">Account</span>
        </div>
      </div>
    </aside>
  );
}
