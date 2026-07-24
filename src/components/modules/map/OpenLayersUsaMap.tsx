'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Feature from 'ol/Feature';
import Map from 'ol/Map';
import Overlay from 'ol/Overlay';
import View from 'ol/View';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat, toLonLat, transformExtent } from 'ol/proj';
import XYZ from 'ol/source/XYZ';
import VectorSource from 'ol/source/Vector';
import { Circle as CircleStyle, Fill, Icon, Stroke, Style, Text } from 'ol/style';
import { defaults as defaultControls, ScaleLine } from 'ol/control';
import { Moon, Monitor, Sun } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';
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
  color?: string;
  avatarUrl?: string | null;
};

export type OpenLayersRouteArc = {
  id: string;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  status: MarkerStatus;
  color?: string;
};

type ResolvedRoute = OpenLayersRouteArc & {
  geometry: Array<{ lat: number; lng: number }>;
};

type MapTheme = 'light' | 'dark';
type MapThemeMode = 'auto' | MapTheme;

type OpenLayersUsaMapProps = {
  markers: OpenLayersMarker[];
  routes?: OpenLayersRouteArc[];
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
const OSRM_ROUTE_URL = 'https://router.project-osrm.org/route/v1/driving';
const LIGHT_TILE_URL = 'https://{a-c}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const DARK_TILE_URL = 'https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const STATE_LABELS = [
  { label: 'WA', lng: -120.7, lat: 47.3 }, { label: 'OR', lng: -120.6, lat: 44.1 },
  { label: 'CA', lng: -119.4, lat: 37.2 }, { label: 'ID', lng: -114.5, lat: 44.2 },
  { label: 'MT', lng: -110.3, lat: 47.0 }, { label: 'WY', lng: -107.7, lat: 43.0 },
  { label: 'NV', lng: -116.6, lat: 39.3 }, { label: 'UT', lng: -111.7, lat: 39.3 },
  { label: 'AZ', lng: -111.8, lat: 34.1 }, { label: 'CO', lng: -105.6, lat: 39.0 },
  { label: 'NM', lng: -106.1, lat: 34.5 }, { label: 'ND', lng: -100.5, lat: 47.4 },
  { label: 'SD', lng: -100.0, lat: 44.4 }, { label: 'NE', lng: -99.9, lat: 41.5 },
  { label: 'KS', lng: -98.4, lat: 38.5 }, { label: 'OK', lng: -97.5, lat: 35.5 },
  { label: 'TX', lng: -99.2, lat: 31.0 }, { label: 'MN', lng: -94.7, lat: 46.0 },
  { label: 'IA', lng: -93.5, lat: 42.1 }, { label: 'MO', lng: -92.5, lat: 38.5 },
  { label: 'AR', lng: -92.4, lat: 34.9 }, { label: 'LA', lng: -91.9, lat: 31.1 },
  { label: 'WI', lng: -89.6, lat: 44.5 }, { label: 'IL', lng: -89.3, lat: 40.1 },
  { label: 'MS', lng: -89.7, lat: 32.8 }, { label: 'MI', lng: -85.6, lat: 44.4 },
  { label: 'IN', lng: -86.1, lat: 39.9 }, { label: 'KY', lng: -84.8, lat: 37.7 },
  { label: 'TN', lng: -86.4, lat: 35.8 }, { label: 'AL', lng: -86.8, lat: 32.8 },
  { label: 'OH', lng: -82.8, lat: 40.3 }, { label: 'GA', lng: -83.5, lat: 32.7 },
  { label: 'FL', lng: -81.7, lat: 27.8 }, { label: 'PA', lng: -77.8, lat: 41.0 },
  { label: 'NY', lng: -75.0, lat: 43.0 }, { label: 'NC', lng: -79.3, lat: 35.5 },
  { label: 'VA', lng: -78.5, lat: 37.5 }, { label: 'ME', lng: -69.2, lat: 45.2 },
];

function statusColors(status: MarkerStatus, selected: boolean) {
  if (selected) return { fill: '#f59e0b', stroke: '#fef3c7' };
  // Driver statuses (used by /map, /drivers)
  if (status === 'ON_LOAD') return { fill: '#60a5fa', stroke: '#dbeafe' };
  if (status === 'OFF_DUTY') return { fill: '#9ca3af', stroke: '#f3f4f6' };
  if (status === 'INACTIVE') return { fill: '#4b5563', stroke: '#d1d5db' };
  // Route statuses (used by the dashboard fleet map, see MapLegend)
  if (status === 'IN_TRANSIT') return { fill: '#3b82f6', stroke: '#bfdbfe' };
  if (status === 'LOADING' || status === 'UNLOADING') return { fill: '#f59e0b', stroke: '#fde68a' };
  if (status === 'WAITING') return { fill: '#8b5cf6', stroke: '#ddd6fe' };
  if (status === 'IDLE' || status === 'PROBLEM') return { fill: '#ef4444', stroke: '#fecaca' };
  return { fill: '#4ade80', stroke: '#dcfce7' };
}

function markerStyle(feature: Feature) {
  const selected = Boolean(feature.get('selected'));
  const customColor = feature.get('color') as string | undefined;
  const avatarUrl = feature.get('avatarUrl') as string | undefined;
  const colors = customColor && !selected
    ? { fill: customColor, stroke: '#ffffff' }
    : statusColors(feature.get('status'), selected);

  if (avatarUrl) {
    return [
      new Style({
        image: new CircleStyle({
          radius: selected ? 20 : 17,
          fill: new Fill({ color: `${colors.fill}33` }),
          stroke: new Stroke({ color: `${colors.fill}88`, width: 2 }),
        }),
      }),
      new Style({
        image: new CircleStyle({
          radius: selected ? 14 : 12,
          fill: new Fill({ color: '#233144' }),
          stroke: new Stroke({ color: colors.fill, width: selected ? 4 : 3 }),
        }),
      }),
      new Style({
        image: new Icon({
          src: avatarUrl,
          crossOrigin: 'anonymous',
          width: selected ? 22 : 18,
          height: selected ? 22 : 18,
        }),
      }),
    ];
  }

  return [
    new Style({
      image: new CircleStyle({
        radius: selected ? 20 : 17,
        fill: new Fill({ color: `${colors.fill}33` }),
        stroke: new Stroke({ color: `${colors.fill}88`, width: 2 }),
      }),
    }),
    new Style({
      image: new CircleStyle({
        radius: selected ? 13 : 11,
        fill: new Fill({ color: '#233144' }),
        stroke: new Stroke({ color: colors.fill, width: selected ? 4 : 3 }),
      }),
      text: new Text({
        text: '▰',
        font: 'bold 13px Inter, Arial, sans-serif',
        fill: new Fill({ color: '#ffffff' }),
        offsetY: -1,
      }),
    }),
  ];
}

function routeStyle(feature: Feature) {
  const selected = Boolean(feature.get('selected'));
  const customColor = feature.get('color') as string | undefined;
  const colors = customColor && !selected
    ? { fill: customColor, stroke: '#ffffff' }
    : statusColors(feature.get('status'), selected);

  return [
    new Style({
      stroke: new Stroke({
        color: `${colors.fill}1f`,
        width: selected ? 5 : 3.5,
        lineCap: 'round',
        lineJoin: 'round',
      }),
    }),
    new Style({
      stroke: new Stroke({
        color: `${colors.fill}52`,
        width: selected ? 3 : 2.25,
        lineCap: 'round',
        lineJoin: 'round',
      }),
    }),
    new Style({
      stroke: new Stroke({
        color: colors.fill,
        width: selected ? 1.5 : 1,
        lineDash: [1, 8],
        lineCap: 'round',
        lineJoin: 'round',
      }),
    }),
  ];
}

function featureStyle(feature: Feature) {
  return feature.get('kind') === 'route' ? routeStyle(feature) : markerStyle(feature);
}

function roadLikeCoordinates(from: OpenLayersRouteArc['from'], to: OpenLayersRouteArc['to']) {
  const dx = to.lng - from.lng;
  const dy = to.lat - from.lat;
  const distance = Math.hypot(dx, dy) || 1;
  const wiggle = Math.min(Math.max(distance * 0.035, 0.18), 0.65);
  const normalLng = -dy / distance;
  const normalLat = dx / distance;
  const points = [
    from,
    {
      lng: from.lng + dx * 0.32 + normalLng * wiggle,
      lat: from.lat + dy * 0.32 + normalLat * wiggle,
    },
    {
      lng: from.lng + dx * 0.66 - normalLng * wiggle * 0.55,
      lat: from.lat + dy * 0.66 - normalLat * wiggle * 0.55,
    },
    to,
  ];

  return points.map((point) => fromLonLat([point.lng, point.lat]));
}

function fallbackRouteGeometry(route: OpenLayersRouteArc) {
  return roadLikeCoordinates(route.from, route.to);
}

function routeMapCoordinates(route: ResolvedRoute | OpenLayersRouteArc) {
  return 'geometry' in route && route.geometry.length >= 2
    ? route.geometry.map((point) => fromLonLat([point.lng, point.lat]))
    : fallbackRouteGeometry(route);
}

async function fetchRoadGeometry(route: OpenLayersRouteArc, signal: AbortSignal) {
  const coordinates = `${route.from.lng},${route.from.lat};${route.to.lng},${route.to.lat}`;
  const url = `${OSRM_ROUTE_URL}/${coordinates}?overview=full&geometries=geojson&alternatives=false&steps=false`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Route geometry request failed: ${response.status}`);

  const data = await response.json();
  const geometry = data?.routes?.[0]?.geometry?.coordinates;
  if (!Array.isArray(geometry) || geometry.length < 2) {
    throw new Error('Route geometry response did not include coordinates');
  }

  return geometry
    .filter((coordinate: unknown): coordinate is [number, number] => (
      Array.isArray(coordinate)
      && coordinate.length >= 2
      && Number.isFinite(coordinate[0])
      && Number.isFinite(coordinate[1])
    ))
    .map(([lng, lat]) => ({ lng, lat }));
}

function endpointStyle(feature: Feature) {
  const color = (feature.get('color') as string | undefined) ?? '#3b82f6';

  return new Style({
    image: new CircleStyle({
      radius: 2.5,
      fill: new Fill({ color }),
      stroke: new Stroke({ color: '#f8fafc', width: 1 }),
    }),
  });
}

function combinedFeatureStyle(feature: Feature) {
  if (feature.get('kind') === 'endpoint') return endpointStyle(feature);
  if (feature.get('kind') === 'state-label') {
    const isDark = feature.get('mapTheme') === 'dark';
    return new Style({
      text: new Text({
        text: feature.get('label'),
        font: '700 13px Inter, Arial, sans-serif',
        fill: new Fill({ color: isDark ? 'rgba(226, 232, 240, 0.76)' : 'rgba(51, 65, 85, 0.72)' }),
        stroke: new Stroke({ color: isDark ? 'rgba(15, 23, 42, 0.82)' : 'rgba(248, 250, 252, 0.86)', width: 3 }),
      }),
    });
  }
  return featureStyle(feature);
}

export function OpenLayersUsaMap({
  markers,
  routes = [],
  selectedId,
  onSelect,
  loading = false,
  emptyLabel = 'USA map ready · no truck locations yet',
  className,
  popup,
}: OpenLayersUsaMapProps) {
  const { theme: pageTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const tileSourceRef = useRef<XYZ | null>(null);
  const sourceRef = useRef<VectorSource | null>(null);
  const overlayRef = useRef<Overlay | null>(null);
  const onSelectRef = useRef(onSelect);
  const routeGeometryCacheRef = useRef<globalThis.Map<string, Array<{ lat: number; lng: number }>>>(new globalThis.Map());
  const [resolvedRoutes, setResolvedRoutes] = useState<ResolvedRoute[]>([]);
  const [mapThemeMode, setMapThemeMode] = useState<MapThemeMode>('auto');
  const mapTheme: MapTheme = mapThemeMode === 'auto'
    ? (pageTheme === 'night' ? 'dark' : 'light')
    : mapThemeMode;

  onSelectRef.current = onSelect;

  const routeLineById = useMemo(() => {
    const next = new globalThis.Map<string, LineString>();
    resolvedRoutes.forEach((route) => {
      next.set(route.id, new LineString(routeMapCoordinates(route)));
    });
    return next;
  }, [resolvedRoutes]);

  const displayMarkers = useMemo(() => markers.map((marker) => {
    const routeLine = routeLineById.get(marker.id);
    if (!routeLine) return marker;

    const closestPoint = routeLine.getClosestPoint(fromLonLat([marker.lng, marker.lat]));
    const [lng, lat] = toLonLat(closestPoint);
    return { ...marker, lat, lng };
  }), [markers, routeLineById]);

  const selectedMarker = useMemo(
    () => displayMarkers.find((marker) => marker.id === selectedId) ?? null,
    [displayMarkers, selectedId],
  );
  const routeSignature = useMemo(
    () => routes
      .map((route) => `${route.id}:${route.from.lat},${route.from.lng}:${route.to.lat},${route.to.lng}`)
      .join('|'),
    [routes],
  );

  useEffect(() => {
    if (!routes.length) {
      setResolvedRoutes([]);
      return;
    }

    const ac = new AbortController();

    async function resolveRoutes() {
      const nextRoutes = await Promise.all(routes.map(async (route) => {
        const cacheKey = `${route.from.lng},${route.from.lat};${route.to.lng},${route.to.lat}`;
        const cached = routeGeometryCacheRef.current.get(cacheKey);
        if (cached) return { ...route, geometry: cached };

        try {
          const geometry = await fetchRoadGeometry(route, ac.signal);
          routeGeometryCacheRef.current.set(cacheKey, geometry);
          return { ...route, geometry };
        } catch {
          return { ...route, geometry: [] };
        }
      }));

      if (!ac.signal.aborted) setResolvedRoutes(nextRoutes);
    }

    void resolveRoutes();

    return () => ac.abort();
  }, [routeSignature]);

  useEffect(() => {
    if (!containerRef.current || !popupRef.current || mapRef.current) return;

    const source = new VectorSource();
    const tileSource = new XYZ({
      url: mapTheme === 'dark' ? DARK_TILE_URL : LIGHT_TILE_URL,
      attributions: ['© OpenStreetMap contributors', '© CARTO'],
      crossOrigin: 'anonymous',
    });
    const vectorLayer = new VectorLayer({
      source,
      style: (feature) => combinedFeatureStyle(feature as Feature),
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
          source: tileSource,
        }),
        vectorLayer,
      ],
      overlays: [overlay],
      controls: defaultControls({ attribution: false, rotate: false, zoom: false }).extend([new ScaleLine({ units: 'us' })]),
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
      const id = feature?.get('selectable') ? feature.get('id') : null;
      if (id && onSelectRef.current) onSelectRef.current(id);
    });

    map.on('pointermove', (event) => {
      const hit = map.hasFeatureAtPixel(event.pixel);
      map.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });

    mapRef.current = map;
    tileSourceRef.current = tileSource;
    sourceRef.current = source;
    overlayRef.current = overlay;
    map.getView().fit(USA_EXTENT, { padding: [32, 32, 32, 32], duration: 0 });

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
      tileSourceRef.current = null;
      sourceRef.current = null;
      overlayRef.current = null;
    };
  }, []);

  useEffect(() => {
    tileSourceRef.current?.setUrl(mapTheme === 'dark' ? DARK_TILE_URL : LIGHT_TILE_URL);
  }, [mapTheme]);

  useEffect(() => {
    const source = sourceRef.current;
    const map = mapRef.current;
    if (!source || !map) return;

    source.clear();
    STATE_LABELS.forEach((state) => {
      source.addFeature(new Feature({
        geometry: new Point(fromLonLat([state.lng, state.lat])),
        kind: 'state-label',
        label: state.label,
        mapTheme,
        selectable: false,
      }));
    });

    resolvedRoutes.forEach((route) => {
      const routeCoordinates = routeMapCoordinates(route);
      const feature = new Feature({
        geometry: new LineString(routeCoordinates),
        id: route.id,
        status: route.status,
        kind: 'route',
        selected: route.id === selectedId,
        selectable: true,
        color: route.color,
      });
      source.addFeature(feature);
      [
        { endpoint: 'pickup', point: route.from },
        { endpoint: 'delivery', point: route.to },
      ].forEach(({ endpoint, point }) => {
        source.addFeature(new Feature({
          geometry: new Point(fromLonLat([point.lng, point.lat])),
          id: route.id,
          status: route.status,
          kind: 'endpoint',
          endpoint,
          selected: route.id === selectedId,
          selectable: true,
          color: route.color,
        }));
      });
    });

    displayMarkers.forEach((marker) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([marker.lng, marker.lat])),
        id: marker.id,
        status: marker.status,
        label: marker.label,
        kind: 'marker',
        selected: marker.id === selectedId,
        selectable: true,
        color: marker.color,
        avatarUrl: marker.avatarUrl,
      });
      source.addFeature(feature);
    });
    source.changed();
  }, [displayMarkers, mapTheme, resolvedRoutes, selectedId]);

  function zoomBy(delta: number) {
    const view = mapRef.current?.getView();
    if (!view) return;
    const zoom = view.getZoom() ?? 4;
    view.animate({ zoom: Math.min(13, Math.max(3, zoom + delta)), duration: 220 });
  }

  function resetView() {
    mapRef.current?.getView().fit(USA_EXTENT, { padding: [32, 32, 32, 32], duration: 350 });
  }

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
    <div className={cn('relative h-full min-h-[360px] overflow-hidden', mapTheme === 'dark' ? 'bg-[#172338]' : 'bg-[#dbe7f3]', className)}>
      <div ref={containerRef} className="absolute inset-0" />
      <div
        className={cn(
          'pointer-events-none absolute inset-0',
          mapTheme === 'dark'
            ? 'bg-[radial-gradient(circle_at_50%_45%,rgba(96,165,250,0.14),transparent_46%),linear-gradient(90deg,rgba(15,23,42,0.08),transparent_24%,transparent_78%,rgba(15,23,42,0.20)),linear-gradient(0deg,rgba(255,255,255,0.08),rgba(255,255,255,0.08))]'
            : 'bg-[radial-gradient(circle_at_50%_45%,rgba(59,130,246,0.08),transparent_46%),linear-gradient(90deg,rgba(15,23,42,0.08),transparent_22%,transparent_80%,rgba(15,23,42,0.18))]',
        )}
      />
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
      <div className={cn(
        'absolute left-4 top-4 rounded-md px-3 py-2 text-xs shadow-xl backdrop-blur',
        mapTheme === 'dark'
          ? 'border border-slate-500/30 bg-slate-900/72 text-slate-100'
          : 'border border-slate-200 bg-white/92 text-slate-700',
      )}
      >
        {loading ? 'Loading fleet map' : markers.length ? 'OpenLayers USA fleet map' : emptyLabel}
      </div>
      <div className="absolute right-4 top-4 flex flex-col gap-3">
        <div className="overflow-hidden rounded-lg border border-slate-500/25 bg-slate-950/70 text-slate-200 shadow-xl backdrop-blur">
          {[
            { mode: 'auto' as const, label: 'Follow page theme', icon: Monitor },
            { mode: 'light' as const, label: 'Use light map', icon: Sun },
            { mode: 'dark' as const, label: 'Use dark map', icon: Moon },
          ].map(({ mode, label, icon: ThemeIcon }) => {
            const active = mapThemeMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setMapThemeMode(mode)}
                className={cn(
                  'flex h-10 w-10 items-center justify-center hover:bg-slate-900',
                  active && 'bg-slate-200 text-slate-950 hover:bg-slate-200',
                )}
                aria-label={label}
                title={label}
              >
                <ThemeIcon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-500/25 bg-slate-950/70 text-slate-200 shadow-xl backdrop-blur hover:bg-slate-900"
          aria-label="Routes"
        >
          <span className="text-lg leading-none">⌁</span>
        </button>
        <div className="overflow-hidden rounded-lg border border-slate-500/25 bg-slate-950/70 text-slate-200 shadow-xl backdrop-blur">
          <button
            type="button"
            onClick={() => zoomBy(1)}
            className="flex h-10 w-10 items-center justify-center text-xl hover:bg-slate-900"
            aria-label="Zoom in"
          >
            +
          </button>
          <div className="h-px bg-slate-500/25" />
          <button
            type="button"
            onClick={() => zoomBy(-1)}
            className="flex h-10 w-10 items-center justify-center text-xl hover:bg-slate-900"
            aria-label="Zoom out"
          >
            -
          </button>
        </div>
        <button
          type="button"
          onClick={resetView}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-500/25 bg-slate-950/70 text-slate-200 shadow-xl backdrop-blur hover:bg-slate-900"
          aria-label="Reset map view"
        >
          <span className="h-4 w-4 rounded-full border-2 border-slate-200 shadow-[0_0_0_4px_rgba(148,163,184,0.12)]" />
        </button>
      </div>
    </div>
  );
}
