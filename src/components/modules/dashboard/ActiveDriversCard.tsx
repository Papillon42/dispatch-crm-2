import Link from 'next/link';
import { Truck } from 'lucide-react';
import type { ActiveDriverRow } from '@/lib/services/types';

const STATUS_LABEL: Record<string, string> = {
  IN_TRANSIT: 'В пути',
  LOADING: 'Загрузка',
  UNLOADING: 'Выгрузка',
  WAITING: 'Ожидание',
  IDLE: 'Простой',
  PROBLEM: 'Проблема',
  AVAILABLE: 'Доступен',
};

const STATUS_CLASS: Record<string, string> = {
  IN_TRANSIT: 'bg-blue-500/15 text-blue-400',
  LOADING: 'bg-amber-500/15 text-amber-400',
  UNLOADING: 'bg-amber-500/15 text-amber-400',
  WAITING: 'bg-violet-500/15 text-violet-400',
  IDLE: 'bg-red-500/15 text-red-400',
  PROBLEM: 'bg-red-500/15 text-red-400',
  AVAILABLE: 'bg-green-500/15 text-green-400',
};

export function ActiveDriversCard({ drivers }: { drivers: ActiveDriverRow[] }) {
  return (
    <div className="bg-background-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Активные драйверы</h2>
        <Link href="/drivers" className="text-2xs text-brand-light hover:underline">Смотреть всех</Link>
      </div>

      {drivers.length === 0 ? (
        <div className="p-6 text-center text-text-muted text-sm">Нет активных драйверов.</div>
      ) : (
        <div className="divide-y divide-border-subtle max-h-[360px] overflow-y-auto">
          {drivers.map((d) => (
            <div key={d.id} className="flex items-center justify-between px-4 py-3 hover:bg-background-hover transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-background-hover flex items-center justify-center flex-shrink-0">
                  <Truck className="w-4 h-4 text-text-secondary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{d.name}</p>
                  <p className="text-2xs text-text-muted truncate">
                    {d.loadNumber ? `${d.loadNumber} · ` : ''}{d.route}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className={`badge ${STATUS_CLASS[d.status] ?? 'bg-gray-500/15 text-gray-400'}`}>
                  {STATUS_LABEL[d.status] ?? d.status}
                </span>
                <span className="text-2xs text-text-muted">{d.lastUpdate}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
