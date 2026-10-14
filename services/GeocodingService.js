const axios = require('axios');
const crypto = require('crypto');

/**
 * Geocoding for web + mobile.
 *
 * Provider order: Ola Maps (OLA_MAPS_API_KEY) → OpenStreetMap Nominatim.
 * Ola names Ranchi the way people do ("Kadru, Ashok Nagar"); OSM often returns
 * block names ("Namkum") or hamlets ("Delabaritoli"), so it is only a fallback.
 *
 * Normalized place shape (shared with client/mobile):
 *   { area, neighborhood, sublocality, city, state, country, pincode,
 *     formattedAddress, coordinates: { latitude, longitude }, provider }
 */

const OLA_BASE = 'https://api.olamaps.io/places/v1';
const NOMINATIM = 'https://nominatim.openstreetmap.org';
const HTTP_TIMEOUT_MS = 6000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 5000;
// Bias search to Ranchi when the caller gives no location.
const DEFAULT_BIAS = { latitude: 23.3441, longitude: 85.3096 };

const nominatimHeaders = () => ({
  'Accept-Language': 'en',
  // Nominatim usage policy requires a real app identifier + contact.
  'User-Agent':
    process.env.GEOCODER_USER_AGENT || 'Chardeevari/1.0 (https://chardeevari.in; chardeevari.construction@gmail.com)',
});

const olaKey = () => process.env.OLA_MAPS_API_KEY || '';

const olaGet = async (path, params) => {
  const { data } = await axios.get(`${OLA_BASE}${path}`, {
    params: { ...params, api_key: olaKey() },
    headers: { 'X-Request-Id': crypto.randomUUID() },
    timeout: HTTP_TIMEOUT_MS,
  });
  return data;
};

/** Small TTL + size-bounded cache (insertion-ordered Map → oldest evicted first). */
class TtlCache {
  constructor(max, ttlMs) {
    this.max = max;
    this.ttlMs = ttlMs;
    this.map = new Map();
  }
  get(key) {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (hit.expires < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    return hit.value;
  }
  set(key, value) {
    if (this.map.size >= this.max) this.map.delete(this.map.keys().next().value);
    this.map.set(key, { value, expires: Date.now() + this.ttlMs });
  }
}

const reverseCache = new TtlCache(CACHE_MAX, CACHE_TTL_MS);
const searchCache = new TtlCache(CACHE_MAX, CACHE_TTL_MS);

const uniq = (parts) => parts.filter((p, i) => p && parts.indexOf(p) === i);

const buildFormatted = ({ road, neighborhood, sublocality, city, state, pincode }) =>
  uniq([road, neighborhood, sublocality, city, state]).join(', ') + (pincode ? ` - ${pincode}` : '');

const toPlace = (fields, coordinates, provider) => {
  const area = uniq([fields.neighborhood, fields.sublocality]).join(', ') || undefined;
  return {
    area,
    neighborhood: fields.neighborhood,
    sublocality: fields.sublocality,
    city: fields.city,
    state: fields.state,
    country: fields.country,
    pincode: fields.pincode,
    formattedAddress: buildFormatted(fields),
    coordinates,
    provider,
  };
};

// ── Ola ──────────────────────────────────────────────────────────────────────

const olaComponent = (components, type) => components?.find((c) => c.types?.includes(type))?.long_name;

const fromOlaComponents = (components, coordinates) =>
  toPlace(
    {
      road: olaComponent(components, 'route'),
      neighborhood: olaComponent(components, 'neighborhood'),
      sublocality: olaComponent(components, 'sublocality') || olaComponent(components, 'sublocality_level_1'),
      // administrative_area_level_3 is the block (Kanke/Namkum) — never use it as a name.
      city: olaComponent(components, 'locality') || olaComponent(components, 'administrative_area_level_2'),
      state: olaComponent(components, 'administrative_area_level_1'),
      country: olaComponent(components, 'country'),
      pincode: olaComponent(components, 'postal_code'),
    },
    coordinates,
    'ola',
  );

const olaReverse = async (latitude, longitude) => {
  const data = await olaGet('/reverse-geocode', { latlng: `${latitude},${longitude}` });
  const results = data?.results ?? [];
  // Results are nearby POIs; prefer the first one that names a locality.
  const best =
    results.find((r) => olaComponent(r.address_components, 'neighborhood') || olaComponent(r.address_components, 'sublocality')) ||
    results[0];
  if (!best) return null;
  return fromOlaComponents(best.address_components, { latitude, longitude });
};

const olaGeocode = async (address) => {
  const data = await olaGet('/geocode', { address });
  const best = data?.geocodingResults?.[0];
  const loc = best?.geometry?.location;
  if (!loc) return null;
  return fromOlaComponents(best.address_components, { latitude: loc.lat, longitude: loc.lng });
};

const olaAutocomplete = async (input, bias) => {
  const data = await olaGet('/autocomplete', { input, location: `${bias.latitude},${bias.longitude}` });
  return (data?.predictions ?? [])
    .filter((p) => p.geometry?.location)
    .slice(0, 6)
    .map((p) => {
      const terms = (p.terms ?? []).map((t) => t.value);
      const pincode = terms.find((t) => /^\d{6}$/.test(t));
      return {
        title: p.structured_formatting?.main_text || terms[0] || p.description,
        subtitle: p.structured_formatting?.secondary_text || p.description,
        formattedAddress: p.description,
        pincode,
        coordinates: { latitude: p.geometry.location.lat, longitude: p.geometry.location.lng },
        provider: 'ola',
      };
    });
};

// ── OpenStreetMap fallback ───────────────────────────────────────────────────

const fromNominatim = (a = {}, coordinates) =>
  toPlace(
    {
      road: a.road,
      neighborhood: a.neighbourhood || a.quarter || a.hamlet,
      sublocality: a.suburb || a.locality || a.village,
      // OSM puts the block ("Namkum") in county and the district in state_district.
      city: a.city || a.town || a.state_district || a.municipality || a.village || a.county,
      state: a.state,
      country: a.country,
      pincode: a.postcode,
    },
    coordinates,
    'osm',
  );

const osmReverse = async (latitude, longitude) => {
  const { data } = await axios.get(`${NOMINATIM}/reverse`, {
    params: { format: 'json', lat: latitude, lon: longitude, addressdetails: 1, 'accept-language': 'en' },
    headers: nominatimHeaders(),
    timeout: HTTP_TIMEOUT_MS,
  });
  if (!data?.address) return null;
  return fromNominatim(data.address, { latitude, longitude });
};

const osmSearch = async (q, limit) => {
  const { data } = await axios.get(`${NOMINATIM}/search`, {
    params: { format: 'json', q, addressdetails: 1, limit, countrycodes: 'in', 'accept-language': 'en' },
    headers: nominatimHeaders(),
    timeout: HTTP_TIMEOUT_MS,
  });
  return (data ?? []).map((r) =>
    fromNominatim(r.address, { latitude: parseFloat(r.lat), longitude: parseFloat(r.lon) }),
  );
};

// ── Public API ───────────────────────────────────────────────────────────────

const withFallback = async (label, primary, fallback) => {
  if (olaKey()) {
    try {
      const result = await primary();
      if (result && (!Array.isArray(result) || result.length)) return result;
    } catch (error) {
      console.error(`Ola ${label} failed, falling back to OSM:`, error.response?.status || error.message);
    }
  }
  try {
    return await fallback();
  } catch (error) {
    console.error(`OSM ${label} failed:`, error.response?.status || error.message);
    return null;
  }
};

class GeocodingService {
  /** Coordinates → normalized place, or null. Cached ~11 m / 24 h. */
  async reverse(latitude, longitude) {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const cached = reverseCache.get(key);
    if (cached !== undefined) return cached;
    const place = await withFallback(
      'reverse',
      () => olaReverse(lat, lng),
      () => osmReverse(lat, lng),
    );
    if (place) reverseCache.set(key, place);
    return place;
  }

  /** Free-text address → best normalized place (with coordinates), or null. */
  async geocode(address) {
    const q = String(address || '').trim();
    if (!q) return null;
    const key = `geo:${q.toLowerCase()}`;
    const cached = searchCache.get(key);
    if (cached !== undefined) return cached;
    const place = await withFallback(
      'geocode',
      () => olaGeocode(q),
      async () => (await osmSearch(q, 1))[0] ?? null,
    );
    if (place) searchCache.set(key, place);
    return place;
  }

  /** Search-as-you-type suggestions (max 6) biased toward `near` (default Ranchi). */
  async search(text, near) {
    const q = String(text || '').trim();
    if (q.length < 3) return [];
    const bias = near && Number.isFinite(near.latitude) && Number.isFinite(near.longitude) ? near : DEFAULT_BIAS;
    const key = `ac:${q.toLowerCase()}@${bias.latitude.toFixed(2)},${bias.longitude.toFixed(2)}`;
    const cached = searchCache.get(key);
    if (cached !== undefined) return cached;
    let results = [];
    if (olaKey()) {
      try {
        results = await olaAutocomplete(q, bias);
      } catch (error) {
        console.error('Ola search failed, falling back to OSM:', error.response?.status || error.message);
      }
    }
    if (!results.length) {
      try {
        results = (await osmSearch(q, 6)).map((p) => ({
          title: p.area || p.city || q,
          subtitle: p.formattedAddress,
          formattedAddress: p.formattedAddress,
          pincode: p.pincode,
          coordinates: p.coordinates,
          provider: 'osm',
        }));
      } catch (error) {
        console.error('OSM search failed:', error.response?.status || error.message);
      }
    }
    if (results.length) searchCache.set(key, results);
    return results;
  }

  // ── Legacy shapes used by routes/addresses.js ──────────────────────────────

  async addressToCoordinates(address) {
    if (!address) return { success: false, error: 'Address is required' };
    const place = await this.geocode(address);
    if (!place) return { success: false, error: 'No coordinates found for this address' };
    return {
      success: true,
      coordinates: [place.coordinates.longitude, place.coordinates.latitude], // [longitude, latitude]
      formatted_address: place.formattedAddress,
      confidence: place.provider === 'ola' ? 0.9 : 0.5,
    };
  }

  async coordinatesToAddress(longitude, latitude) {
    const place = await this.reverse(latitude, longitude);
    if (!place) return { success: false, error: 'No address found for these coordinates' };
    return {
      success: true,
      address: place.formattedAddress,
      components: {
        area: place.area,
        city: place.city,
        state: place.state,
        pincode: place.pincode,
        country: place.country,
      },
    };
  }

  /**
   * Validate if coordinates are within supported delivery areas.
   * For now, checks India bounds.
   */
  isWithinDeliveryArea(coordinates) {
    const [longitude, latitude] = coordinates;
    const indiaBounds = { north: 37.6, south: 6.4, east: 97.25, west: 68.7 };
    return (
      latitude >= indiaBounds.south &&
      latitude <= indiaBounds.north &&
      longitude >= indiaBounds.west &&
      longitude <= indiaBounds.east
    );
  }
}

module.exports = new GeocodingService();
