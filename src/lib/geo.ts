// Lightweight city/state geocoding lookup for demo + map rendering.
// Real deployments should replace this with Mapbox/Google geocoding (see TZ §12),
// but the map UI is source-agnostic: it just needs { lat, lng }.

export const US_CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'Dallas,TX': { lat: 32.7767, lng: -96.797 },
  'Chicago,IL': { lat: 41.8781, lng: -87.6298 },
  'Memphis,TN': { lat: 35.1495, lng: -90.049 },
  'Atlanta,GA': { lat: 33.749, lng: -84.388 },
  'Los Angeles,CA': { lat: 34.0522, lng: -118.2437 },
  'Phoenix,AZ': { lat: 33.4484, lng: -112.074 },
  'Columbus,OH': { lat: 39.9612, lng: -82.9988 },
  'Detroit,MI': { lat: 42.3314, lng: -83.0458 },
  'Seattle,WA': { lat: 47.6062, lng: -122.3321 },
  'Portland,OR': { lat: 45.5152, lng: -122.6784 },
  'Houston,TX': { lat: 29.7604, lng: -95.3698 },
  'San Antonio,TX': { lat: 29.4241, lng: -98.4936 },
  'Indianapolis,IN': { lat: 39.7684, lng: -86.158 },
  'Nashville,TN': { lat: 36.1627, lng: -86.7816 },
  'Jacksonville,FL': { lat: 30.3322, lng: -81.6557 },
  'Orlando,FL': { lat: 28.5383, lng: -81.3792 },
  'Denver,CO': { lat: 39.7392, lng: -104.9903 },
  'Kansas City,MO': { lat: 39.0997, lng: -94.5786 },
  'St. Louis,MO': { lat: 38.627, lng: -90.1994 },
  'New York,NY': { lat: 40.7128, lng: -74.006 },
  'Miami,FL': { lat: 25.7617, lng: -80.1918 },
  'Charlotte,NC': { lat: 35.2271, lng: -80.8431 },
  'Olathe,KS': { lat: 38.8814, lng: -94.8191 },
  'Colby,KS': { lat: 39.3958, lng: -101.0526 },
  'Hays,KS': { lat: 38.8792, lng: -99.3268 },
};

export function cityKey(city?: string | null, state?: string | null): string | null {
  if (!city || !state) return null;
  return `${city},${state}`;
}

// State centroid fallback so unknown cities still land in roughly the right place.
const STATE_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  TX: { lat: 31.0, lng: -99.0 }, IL: { lat: 40.0, lng: -89.2 }, TN: { lat: 35.8, lng: -86.4 },
  GA: { lat: 32.7, lng: -83.4 }, CA: { lat: 36.7, lng: -119.6 }, AZ: { lat: 34.2, lng: -111.6 },
  OH: { lat: 40.3, lng: -82.9 }, MI: { lat: 44.3, lng: -85.6 }, WA: { lat: 47.4, lng: -120.5 },
  OR: { lat: 44.0, lng: -120.5 }, IN: { lat: 40.3, lng: -86.1 }, FL: { lat: 27.8, lng: -81.6 },
  CO: { lat: 39.0, lng: -105.5 }, MO: { lat: 38.5, lng: -92.5 }, NY: { lat: 42.9, lng: -75.5 },
  NC: { lat: 35.5, lng: -79.4 }, KS: { lat: 38.5, lng: -98.4 },
};

export function geocode(city?: string | null, state?: string | null): { lat: number; lng: number } | null {
  const key = cityKey(city, state);
  if (key && US_CITY_COORDS[key]) return US_CITY_COORDS[key];
  if (state && STATE_CENTROIDS[state]) return STATE_CENTROIDS[state];
  return null;
}
