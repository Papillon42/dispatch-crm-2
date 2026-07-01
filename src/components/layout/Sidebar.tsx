'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Truck, UserCheck, Package,
  Map, MessageSquare, DollarSign, BarChart2, Settings,
  Shield, Bot, Send, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuickAddCard } from '@/components/ui/QuickAddCard';

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
  { label: 'Documents',      href: '/documents',         icon: FileText },
  { label: 'AI Assistant',   href: '/ai',                icon: Bot },
];

const BOTTOM_ITEMS = [
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Security',  href: '/security',  icon: Shield },
];

export function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'flex-shrink-0 border-r border-border bg-background-secondary flex flex-col h-screen sticky top-0 transition-[width] duration-200',
        collapsed ? 'w-[68px]' : 'w-[220px]',
      )}
    >
      {/* Logo */}
      <div className={cn('py-5 border-b border-border-subtle', collapsed ? 'px-3' : 'px-4')}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center flex-shrink-0">
            <Truck className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">Dispatch CRM</p>
              <p className="text-2xs text-text-muted">Operations</p>
            </div>
          )}
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn('nav-item', active && 'active', collapsed && 'justify-center px-2')}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-border-subtle space-y-0.5">
        {BOTTOM_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn('nav-item', active && 'active', collapsed && 'justify-center px-2')}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </div>

      <QuickAddCard collapsed={collapsed} />
    </aside>
  );
}
