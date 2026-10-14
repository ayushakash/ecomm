/**
 * Location names for the app.
 *
 * Primary: backend GET /api/geo/* (Ola Maps, cached, OSM fallback server-side) —
 * names Ranchi the way people do ("Kadru, Ashok Nagar").
 * Fallback: OpenStreetMap Nominatim straight from the device, so location still
 * works if the backend is unreachable or not yet deployed with /geo.
 */
import type { Coordinates, GeocodedPlace, PlaceSuggestion } from '../types/models';
import { geoAPI } from './api';

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const HEADERS = {
  Accept: 'application/json',
  'Accept-Language': 'en',
  'User-Agent': 'ChardeevariApp/1.0 (https://chardeevari.in)',
};

type NominatimAddress = Record<string, string | undefined>;
type NominatimResult = { lat: string; lon: string; display_name?: string; address?: NominatimAddress };

const uniq = (parts: (string | undefined)[]): string[] =>
  parts.filter((p, i): p is string => !!p && parts.indexOf(p) === i);

/** Same mapping as services/GeocodingService.js fromNominatim (block "Namkum" is never the city). */
const fromNominatim = (a: NominatimAddress, coordinates: Coordinates): GeocodedPlace => {
  const neighborhood = a.neighbourhood || a.quarter || a.hamlet;
  const sublocality = a.suburb || a.locality || a.village;
  const city = a.city || a.town || a.state_district || a.municipality || a.village || a.county;
  const area = uniq([neighborhood, sublocality]).join(', ') || undefined;
  const line = uniq([a.road, neighborhood, sublocality, city, a.state]).join(', ');
  return {
    area,
    city,
    state: a.state,
    country: a.country,
    pincode: a.postcode,
    formattedAddress: line + (a.postcode ? ` - ${a.postcode}` : ''),
    coordinates,
  };
};

const nominatim = async <T>(path: string): Promise<T> => {
  const res = await fetch(`${NOMINATIM}${path}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  return (await res.json()) as T;
};

/** Coordinates → address parts. Returns null on failure (never throws). */
export async function reverseGeocode(coordinates: Coordinates): Promise<GeocodedPlace | null> {
  try {
    return await geoAPI.reverse(coordinates);
  } catch {
    // Backend unreachable / older deploy → device-side OSM.
  }
  try {
    const { latitude, longitude } = coordinates;
    const data = await nominatim<{ address?: NominatimAddress }>(
      `/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
    );
    return data.address ? fromNominatim(data.address, coordinates) : null;
  } catch {
    return null;
  }
}

/** Search-as-you-type for the map picker (max 6), biased toward `near` (default Ranchi). */
export async function searchPlaces(text: string, near?: Coordinates): Promise<PlaceSuggestion[]> {
  const q = text.trim();
  if (q.length < 3) return [];
  try {
    const results = await geoAPI.search(q, near);
    if (results.length) return results;
  } catch {
    // fall through to OSM
  }
  try {
    const results = await nominatim<NominatimResult[]>(
      `/search?format=json&countrycodes=in&addressdetails=1&limit=6&q=${encodeURIComponent(q)}`,
    );
    return results.map((r) => {
      const place = fromNominatim(r.address ?? {}, { latitude: parseFloat(r.lat), longitude: parseFloat(r.lon) });
      return {
        title: place.area || place.city || q,
        subtitle: place.formattedAddress,
        formattedAddress: place.formattedAddress,
        pincode: place.pincode,
        coordinates: place.coordinates,
      };
    });
  } catch {
    return [];
  }
}
