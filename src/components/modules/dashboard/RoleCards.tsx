import Link from 'next/link';
import { Crown, Headset, Radar, Wallet2, Building2, Truck as TruckIcon, ArrowRight } from 'lucide-react';
import type { RoleSummaryRow } from '@/lib/services/types';

const ICONS: Record<string, { icon: any; color: string }> = {
  ADMIN:      { icon: Crown,      color: 'text-amber-400 bg-amber-500/15' },
  DISPATCHER: { icon: Headset,    color: 'text-brand-light bg-brand-muted' },
  UPDATER:    { icon: Radar,      color: 'text-cyan-400 bg-cyan-500/15' },
  FINANCE:    { icon: Wallet2,    color: 'text-emerald-400 bg-emerald-500/15' },
  CLIENT:     { icon: Building2,  color: 'text-violet-400 bg-violet-500/15' },
  DRIVER:     { icon: TruckIcon,  color: 'text-orange-400 bg-orange-500/15' },
};

export function RoleCards({ roles }: { roles: RoleSummaryRow[] }) {
  if (roles.length === 0) return null;

  return (
    <div className="bg-background-card border border-border rounded-lg p-4">
      <h2 className="text-sm font-semibold text-text-primary mb-3">Team by Role</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {roles.map(({ role, label, count, href }) => {
          const { icon: Icon, color } = ICONS[role] ?? { icon: Building2, color: 'text-text-secondary bg-background-hover' };
          return (
            <Link
              key={role}
              href={href}
              className="group flex flex-col gap-2 rounded-lg border border-border-subtle bg-background-hover px-3 py-3 hover:border-border hover:bg-background-tertiary transition-colors"
            >
              <div className={`w-8 h-8 rounded-md flex items-center justify-center ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary leading-none">{count}</p>
                <p className="text-2xs text-text-muted mt-1">{label}</p>
              </div>
              <span className="flex items-center gap-1 text-2xs text-text-secondary group-hover:text-brand-light mt-auto">
                Open <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
