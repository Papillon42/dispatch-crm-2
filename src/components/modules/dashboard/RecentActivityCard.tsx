import Link from 'next/link';
import { Package, RefreshCw, DollarSign, MessageSquare, Activity as ActivityIcon } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import type { ActivityRow } from '@/lib/services/types';

const ACTION_ICON: Record<string, any> = {
  created: Package,
  status_changed: RefreshCw,
  payment_received: DollarSign,
  message_received: MessageSquare,
};

export function RecentActivityCard({ activity }: { activity: ActivityRow[] }) {
  return (
    <div className="bg-background-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Недавняя активность</h2>
        <Link href="/reports" className="text-2xs text-brand-light hover:underline">Смотреть все</Link>
      </div>

      {activity.length === 0 ? (
        <div className="p-6 text-center text-text-muted text-sm">Пока нет активности.</div>
      ) : (
        <div className="divide-y divide-border-subtle max-h-[360px] overflow-y-auto">
          {activity.map((a) => {
            const Icon = ACTION_ICON[a.action] ?? ActivityIcon;
            return (
              <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                <div className="w-7 h-7 rounded-md bg-brand-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5 text-brand-light" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-text-primary truncate">{a.title}</p>
                  {a.description && <p className="text-2xs text-text-muted truncate">{a.description}</p>}
                  <p className="text-2xs text-text-muted mt-0.5">{timeAgo(a.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
