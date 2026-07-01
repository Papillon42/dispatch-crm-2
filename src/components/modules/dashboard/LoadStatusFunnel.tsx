import { db } from '@/lib/db';
import { LoadStatus } from '@prisma/client';

const FUNNEL_STAGES: { status: LoadStatus; label: string; color: string }[] = [
  { status: 'NEW_LEAD',           label: 'New Lead',    color: 'bg-purple-500' },
  { status: 'BOOKED',             label: 'Booked',       color: 'bg-blue-500' },
  { status: 'ASSIGNED',           label: 'Assigned',     color: 'bg-sky-500' },
  { status: 'IN_TRANSIT',         label: 'In Transit',   color: 'bg-emerald-500' },
  { status: 'DELIVERED',          label: 'Delivered',    color: 'bg-green-500' },
  { status: 'PAID',               label: 'Paid',         color: 'bg-lime-500' },
];

export async function LoadStatusFunnel() {
  const counts = await Promise.all(
    FUNNEL_STAGES.map((s) => db.load.count({ where: { status: s.status } })),
  );

  const max = Math.max(...counts, 1);

  return (
    <div className="bg-background-card border border-border rounded-lg p-4">
      <h2 className="text-sm font-semibold text-text-primary mb-4">Load Pipeline</h2>
      <div className="flex items-end gap-3 h-24">
        {FUNNEL_STAGES.map((stage, i) => (
          <div key={stage.status} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full flex items-end justify-center h-16">
              <div
                className={`w-full rounded-t-md ${stage.color} opacity-80`}
                style={{ height: `${Math.max((counts[i] / max) * 100, 6)}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-text-primary">{counts[i]}</span>
            <span className="text-2xs text-text-muted text-center">{stage.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
