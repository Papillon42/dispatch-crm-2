'use client';

import { OpenLayersUsaMap, type OpenLayersMarker } from '@/components/modules/map/OpenLayersUsaMap';
import type { MapRoute, MapLegend } from '@/lib/services/types';

const LEGEND_CONFIG: Array<{ key: keyof MapLegend; label: string; dot: string }> = [
  { key: 'inTransit', label: 'В пути', dot: 'bg-[#3b82f6]' },
  { key: 'loadingUnloading', label: 'Загрузка / Выгрузка', dot: 'bg-[#f59e0b]' },
  { key: 'waiting', label: 'Ожидание', dot: 'bg-[#8b5cf6]' },
  { key: 'idle', label: 'Простой', dot: 'bg-[#ef4444]' },
];

interface FleetOverviewMapProps {
  routes: MapRoute[];
  legend: MapLegend;
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
}

export function FleetOverviewMap({ routes, legend, selectedId, onSelect, loading }: FleetOverviewMapProps) {
  const markers: OpenLayersMarker[] = routes
    .filter((r) => r.currentLocation)
    .map((r) => ({
      id: r.id,
      label: r.driverName,
      subtitle: `${r.loadCode} · ${r.pickup.city ?? '—'} → ${r.delivery.city ?? '—'}`,
      lat: r.currentLocation!.lat,
      lng: r.currentLocation!.lng,
      status: r.status,
    }));

  return (
    <div className="relative">
      <OpenLayersUsaMap
        markers={markers}
        selectedId={selectedId}
        onSelect={onSelect}
        loading={loading}
        emptyLabel="Карта готова · нет активных маршрутов"
        className="h-[360px] min-h-[360px]"
      />
      <div className="absolute left-4 bottom-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-md border border-border bg-background-card/95 px-3 py-2 text-2xs text-text-secondary shadow-xl">
        {LEGEND_CONFIG.map(({ key, label, dot }) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${dot}`} />
            {label} {legend[key]}
          </span>
        ))}
      </div>
    </div>
  );
}
