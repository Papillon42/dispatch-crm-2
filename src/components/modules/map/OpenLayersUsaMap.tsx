'use client';

import { useEffect, useMemo, useRef } from 'react';
import Feature from 'ol/Feature';
import Map from 'ol/Map';
import Overlay from 'ol/Overlay';
import View from 'ol/View';
import Point from 'ol/geom/Point';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat, transformExtent } from 'ol/proj';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import { defaults as defaultControls, ScaleLine, Zoom } from 'ol/control';
import { cn } from '@/lib/utils';
import 'ol/ol.css';

type MarkerStatus = 'AVAILABLE' | 'ON_LOAD' | 'OFF_DUTY' | 'INACTIVE' | string;

export type OpenLayersMarker = {
  id: string;
  label: string;
  subtitle?: string | null;
  lat: number;
  lng: number;
  status: MarkerStatus;
};

type OpenLayersUsaMapProps = {
  markers: OpenLayersMarker[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  loading?: boolean;
  emptyLabel?: string;
  className?: string;
  popup?: {
    title: string;
    rows: string[];
  } | null;
};

const USA_CENTER = fromLonLat([-98.5795, 39.8283]);
const USA_EXTENT = transformExtent([-127.5, 23, -65, 50.8], 'EPSG:4326', 'EPSG:3857');

function statusColors(status: MarkerStatus, selected: boolean) {
  if (selected) return { fill: '#f59e0b', stroke: '#fef3c7' };
  if (status === 'ON_LOAD') return { fill: '#60a5fa', stroke: '#dbeafe' };
  if (status === 'OFF_DUTY') return { fill: '#9ca3af', stroke: '#f3f4f6' };
  if (status === 'INACTIVE') return { fill: '#4b5563', stroke: '#d1d5db' };
  return { fill: '#4ade80', stroke: '#dcfce7' };
}

function markerStyle(feature: Feature, selectedId?: string | null) {
  const selected = feature.get('id') === selectedId;
  const colors = statusColors(feature.get('status'), selected);

  return new Style({
    image: new CircleStyle({
      radius: selected ? 9 : 7,
      fill: new Fill({ color: colors.fill }),
      stroke: new Stroke({ color: colors.stroke, width: selected ? 4 : 3 }),
    }),
  });
}

export function OpenLayersUsaMap({
  markers,
  selectedId,
  onSelect,
  loading = false,
  emptyLabel = 'USA map ready · no truck locations yet',
  className,
  popup,
}: OpenLayersUsaMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const sourceRef = useRef<VectorSource | null>(null);
  const overlayRef = useRef<Overlay | null>(null);
  const onSelectRef = useRef(onSelect);

  onSelectRef.current = onSelect;

  const selectedMarker = useMemo(
    () => markers.find((marker) => marker.id === selectedId) ?? null,
    [markers, selectedId],
  );

  useEffect(() => {
    if (!containerRef.current || !popupRef.current || mapRef.current) return;

    const source = new VectorSource();
    const vectorLayer = new VectorLayer({
      source,
      style: (feature) => markerStyle(feature as Feature, selectedId),
    });
    const overlay = new Overlay({
      element: popupRef.current,
      positioning: 'bottom-center',
      offset: [0, -14],
      stopEvent: false,
    });
    const map = new Map({
      target: containerRef.current,
      layers: [
        new TileLayer({
          source: new OSM({
            attributions: ['© OpenStreetMap contributors'],
          }),
        }),
        vectorLayer,
      ],
      overlays: [overlay],
      controls: defaultControls({ attribution: false, rotate: false, zoom: false }).extend([
        new Zoom({ className: 'ol-zoom fleet-ol-zoom' }),
        new ScaleLine({ units: 'us' }),
      ]),
      view: new View({
        center: USA_CENTER,
        zoom: 4,
        minZoom: 3,
        maxZoom: 13,
        extent: USA_EXTENT,
      }),
    });

    map.on('click', (event) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (hit) => hit as Feature);
      const id = feature?.get('id');
      if (id && onSelectRef.current) onSelectRef.current(id);
    });

    map.on('pointermove', (event) => {
      const hit = map.hasFeatureAtPixel(event.pixel);
      map.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });

    mapRef.current = map;
    sourceRef.current = source;
    overlayRef.current = overlay;
    map.getView().fit(USA_EXTENT, { padding: [32, 32, 32, 32], duration: 0 });

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
      sourceRef.current = null;
      overlayRef.current = null;
    };
  }, [selectedId]);

  useEffect(() => {
    const source = sourceRef.current;
    const map = mapRef.current;
    if (!source || !map) return;

    source.clear();
    markers.forEach((marker) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([marker.lng, marker.lat])),
        id: marker.id,
        status: marker.status,
        label: marker.label,
      });
      source.addFeature(feature);
    });
    source.changed();
  }, [markers, selectedId]);

  useEffect(() => {
    const overlay = overlayRef.current;
    const map = mapRef.current;
    if (!overlay || !map) return;

    if (!selectedMarker) {
      overlay.setPosition(undefined);
      return;
    }

    const position = fromLonLat([selectedMarker.lng, selectedMarker.lat]);
    overlay.setPosition(position);
    map.getView().animate({ center: position, zoom: Math.max(map.getView().getZoom() ?? 4, 5), duration: 350 });
  }, [selectedMarker]);

  return (
    <div className={cn('relative h-full min-h-[360px] overflow-hidden bg-[#111827]', className)}>
      <div ref={containerRef} className="absolute inset-0" />
      <div
        ref={popupRef}
        className={cn(
          'pointer-events-none min-w-[220px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-xl',
          !selectedMarker && 'hidden',
        )}
      >
        <p className="font-semibold">{popup?.title ?? selectedMarker?.label}</p>
        {(popup?.rows ?? [selectedMarker?.subtitle].filter(Boolean) as string[]).map((row) => (
          <p key={row} className="mt-1 text-xs text-slate-600">{row}</p>
        ))}
      </div>
      <div className="absolute left-4 top-4 rounded-md border border-border bg-background-card/95 px-3 py-2 text-xs text-text-secondary shadow-xl">
        {loading ? 'Loading fleet map' : markers.length ? 'OpenLayers USA fleet map' : emptyLabel}
      </div>
    </div>
  );
}
