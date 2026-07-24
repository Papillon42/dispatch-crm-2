'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Truck, UserCheck, Package,
  Map, MessageSquare, DollarSign, BarChart2, Settings,
  Shield, Bot, Send, FileText, UsersRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuickAddCard } from '@/components/ui/QuickAddCard';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { canSeeNavResource, type NavResource } from '@/lib/auth/navVisibility';

// Main navigation order follows the product reference while keeping the
// existing Telegram Bot and AI Assistant pages available.
const NAV_ITEMS: Array<{ label: string; href: string; icon: typeof LayoutDashboard; resource?: NavResource }> = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Clients', href: '/clients', icon: Users, resource: 'clients' },
  { label: 'Drivers', href: '/drivers', icon: UserCheck, resource: 'drivers' },
  { label: 'Trucks', href: '/trucks', icon: Truck, resource: 'trucks' },
  { label: 'Loads', href: '/loads', icon: Package, resource: 'loads' },
  { label: 'Map', href: '/map', icon: Map, resource: 'map' },
  { label: 'Finance', href: '/finance', icon: DollarSign, resource: 'finance' },
  { label: 'Comms', href: '/communications', icon: MessageSquare, resource: 'communications' },
  { label: 'Reports', href: '/reports', icon: BarChart2, resource: 'reports' },
  { label: 'Documents', href: '/documents', icon: FileText, resource: 'documents' },
  { label: 'Telegram Bot', href: '/telegram', icon: Send, resource: 'settings' },
  { label: 'AI Assistant', href: '/ai', icon: Bot },
  { label: 'Team', href: '/team', icon: UsersRound, resource: 'users' },
];

const BOTTOM_ITEMS: Array<{ label: string; href: string; icon: typeof Settings; resource?: NavResource }> = [
  { label: 'Settings', href: '/settings', icon: Settings, resource: 'settings' },
  { label: 'Security', href: '/security', icon: Shield, resource: 'audit_log' },
];

export function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const { user } = useCurrentUser();
  const visibleNavItems = NAV_ITEMS.filter((item) => !item.resource || canSeeNavResource(user?.role, item.resource));
  const visibleBottomItems = BOTTOM_ITEMS.filter((item) => !item.resource || canSeeNavResource(user?.role, item.resource));

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
        {visibleNavItems.map(({ label, href, icon: Icon }) => {
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
        {visibleBottomItems.map(({ label, href, icon: Icon }) => {
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
