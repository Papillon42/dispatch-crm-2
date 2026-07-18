import { cn } from '@/lib/utils';
import { LoadStatus, ClientStatus, InvoiceStatus } from '@prisma/client';
import { statusMeta } from '@/lib/driverStatus';

const LOAD_STATUS_CONFIG: Record<LoadStatus, { label: string; className: string }> = {
  NEW_LEAD:                   { label: 'New Lead',         className: 'bg-purple-500/15 text-purple-400 border-purple-500/20' },
  NEGOTIATING:                { label: 'Negotiating',      className: 'bg-violet-500/15 text-violet-400 border-violet-500/20' },
  BOOKED:                     { label: 'Booked',           className: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  RATE_CONFIRMATION_RECEIVED: { label: 'Rate Conf.',       className: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20' },
  ASSIGNED:                   { label: 'Assigned',         className: 'bg-sky-500/15 text-sky-400 border-sky-500/20' },
  EN_ROUTE_TO_PICKUP:         { label: 'En Route',         className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  AT_PICKUP:                  { label: 'At Pickup',        className: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  LOADED:                     { label: 'Loaded',           className: 'bg-orange-500/15 text-orange-400 border-orange-500/20' },
  IN_TRANSIT:                 { label: 'In Transit',       className: 'bg-green-500/15 text-green-400 border-green-500/20' },
  AT_DELIVERY:                { label: 'At Delivery',      className: 'bg-teal-500/15 text-teal-400 border-teal-500/20' },
  DELIVERED:                  { label: 'Delivered',        className: 'bg-green-500/15 text-green-300 border-green-500/20' },
  POD_UPLOADED:               { label: 'POD Uploaded',     className: 'bg-lime-500/15 text-lime-400 border-lime-500/20' },
  INVOICED:                   { label: 'Invoiced',         className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' },
  PAID:                       { label: 'Paid',             className: 'bg-green-600/15 text-green-300 border-green-600/20' },
  CLOSED:                     { label: 'Closed',           className: 'bg-gray-500/15 text-gray-400 border-gray-500/20' },
  CANCELLED:                  { label: 'Cancelled',        className: 'bg-gray-600/15 text-gray-500 border-gray-600/20' },
  PROBLEM:                    { label: 'Problem',          className: 'bg-red-500/15 text-red-400 border-red-500/20' },
};

// Driver statuses are dictionary-driven (DriverStatusConfig). The badge takes
// the status CODE plus (optionally) the loaded dictionary so admin renames /
// recolors show up everywhere; statusMeta() provides seeded fallbacks.
export type DriverStatusConfigLite = {
  code: string;
  label: string;
  color: string;
  icon?: string | null;
};

const MOVING_STATUSES = ['TO_PICKUP', 'IN_TRANSIT', 'ON_LOAD'];

const CLIENT_STATUS_CONFIG: Record<ClientStatus, { label: string; className: string }> = {
  ACTIVE:   { label: 'Active',   className: 'bg-green-500/15 text-green-400' },
  WARNING:  { label: 'Warning',  className: 'bg-amber-500/15 text-amber-400' },
  INACTIVE: { label: 'Inactive', className: 'bg-gray-500/15 text-gray-400' },
  AT_RISK:  { label: 'At Risk',  className: 'bg-red-500/15 text-red-400' },
};

const INVOICE_STATUS_CONFIG: Record<InvoiceStatus, { label: string; className: string }> = {
  PENDING:  { label: 'Pending',  className: 'bg-blue-500/15 text-blue-400' },
  UNPAID:   { label: 'Unpaid',   className: 'bg-amber-500/15 text-amber-400' },
  PAID:     { label: 'Paid',     className: 'bg-green-500/15 text-green-400' },
  OVERDUE:  { label: 'Overdue',  className: 'bg-red-500/15 text-red-400' },
};

export function LoadStatusBadge({ status }: { status: LoadStatus }) {
  const config = LOAD_STATUS_CONFIG[status];
  return (
    <span className={cn('badge border', config.className)}>
      {config.label}
    </span>
  );
}

export function DriverStatusBadge({
  status,
  configs,
  className,
}: {
  status: string;
  configs?: DriverStatusConfigLite[];
  className?: string;
}) {
  const meta = statusMeta(status, configs);
  return (
    <span
      className={cn('badge border', className)}
      style={{
        backgroundColor: `${meta.color}26`,
        color: meta.color,
        borderColor: `${meta.color}40`,
      }}
    >
      <span
        className={cn('w-1.5 h-1.5 rounded-full', MOVING_STATUSES.includes(status) && 'animate-pulse-dot')}
        style={{ backgroundColor: meta.color }}
      />
      {meta.label}
    </span>
  );
}

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  const config = CLIENT_STATUS_CONFIG[status];
  return <span className={cn('badge', config.className)}>{config.label}</span>;
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const config = INVOICE_STATUS_CONFIG[status];
  return <span className={cn('badge', config.className)}>{config.label}</span>;
}
