import Link from 'next/link';
import { Crown, Headset, Radar, Wallet2, Building2, Truck as TruckIcon, ArrowRight } from 'lucide-react';

interface RoleCardsProps {
  admin: number;
  dispatcher: number;
  updater: number;
  finance: number;
  clients: number;
  drivers: number;
}

const CARDS = (counts: RoleCardsProps) => [
  { label: 'Admin / Owner', value: counts.admin, href: '/team?role=ADMIN', icon: Crown, color: 'text-amber-400 bg-amber-500/15' },
  { label: 'Dispatcher', value: counts.dispatcher, href: '/team?role=DISPATCHER', icon: Headset, color: 'text-brand-light bg-brand-muted' },
  { label: 'Updater', value: counts.updater, href: '/team?role=UPDATER', icon: Radar, color: 'text-cyan-400 bg-cyan-500/15' },
  { label: 'Finance / Accounting', value: counts.finance, href: '/team?role=FINANCE', icon: Wallet2, color: 'text-emerald-400 bg-emerald-500/15' },
  { label: 'Client', value: counts.clients, href: '/clients', icon: Building2, color: 'text-violet-400 bg-violet-500/15' },
  { label: 'Driver', value: counts.drivers, href: '/drivers', icon: TruckIcon, color: 'text-orange-400 bg-orange-500/15' },
];

export function RoleCards(props: RoleCardsProps) {
  return (
    <div className="bg-background-card border border-border rounded-lg p-4">
      <h2 className="text-sm font-semibold text-text-primary mb-3">Team &amp; Users by Role</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {CARDS(props).map(({ label, value, href, icon: Icon, color }) => (
          <Link
            key={label}
            href={href}
            className="group flex flex-col gap-2 rounded-lg border border-border-subtle bg-background-hover px-3 py-3 hover:border-border hover:bg-background-tertiary transition-colors"
          >
            <div className={`w-8 h-8 rounded-md flex items-center justify-center ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary leading-none">{value}</p>
              <p className="text-2xs text-text-muted mt-1">{label}</p>
            </div>
            <span className="flex items-center gap-1 text-2xs text-text-secondary group-hover:text-brand-light mt-auto">
              View <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
