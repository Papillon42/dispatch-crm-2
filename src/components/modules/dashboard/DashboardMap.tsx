'use client';

import { useEffect, useState } from 'react';
import { OpenLayersUsaMap, type OpenLayersMarker } from '@/components/modules/map/OpenLayersUsaMap';

interface DriverPoint {
  id: string;
  fullName: string;
  status: string;
  lat: number;
  lng: number;
  label?: string | null;
}

export function DashboardMap() {
  const [drivers, setDrivers] = useState<DriverPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/map/drivers')
      .then((r) => r.json())
      .then((data) => {
        const points: DriverPoint[] = (data.drivers ?? [])
          .filter((d: any) => d.locationUpdates?.[0])
          .map((d: any) => ({
            id: d.id,
            fullName: d.fullName,
            status: d.status,
            lat: d.locationUpdates[0].lat,
            lng: d.locationUpdates[0].lng,
            label: d.locationUpdates[0].label,
          }));
        setDrivers(points);
      })
      .catch(() => setDrivers([]))
      .finally(() => setLoading(false));
  }, []);

  const markers: OpenLayersMarker[] = drivers.map((driver) => ({
    id: driver.id,
    label: driver.fullName,
    subtitle: driver.label,
    lat: driver.lat,
    lng: driver.lng,
    status: driver.status,
  }));

  return (
    <OpenLayersUsaMap
      markers={markers}
      loading={loading}
      emptyLabel="USA map ready · no truck locations yet"
      className="h-[360px] min-h-[360px]"
    />
  );
}
