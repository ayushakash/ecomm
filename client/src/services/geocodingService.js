/**
 * Geocoding Service
 *
 * Primary: backend /api/geo/* (Ola Maps, cached, OpenStreetMap fallback server-side),
 * which names Ranchi the way people do ("Kadru, Ashok Nagar").
 * Fallback: OpenStreetMap Nominatim straight from the browser if the backend fails.
 * Uses plain fetch (not the axios client) so fallbacks never raise error toasts.
 */
import { getBackendUrlSync } from '../utils/getBackendUrl';

const NOMINATIM = 'https://nominatim.openstreetmap.org';

const uniq = (parts) => parts.filter((p, i) => p && parts.indexOf(p) === i);

// Same mapping as backend fromNominatim: OSM puts the block ("Namkum") in
// `county` and the district ("Ranchi") in `state_district` — never use the block as city.
const fromNominatim = (a = {}) => {
  const neighborhood = a.neighbourhood || a.quarter || a.hamlet;
  const sublocality = a.suburb || a.locality || a.village;
  const city = a.city || a.town || a.state_district || a.municipality || a.village || a.county;
  return {
    area: uniq([neighborhood, sublocality]).join(', ') || undefined,
    city,
    state: a.state,
    country: a.country,
    pincode: a.postcode,
    formattedAddress:
      uniq([a.road, neighborhood, sublocality, city, a.state]).join(', ') + (a.postcode ? ` - ${a.postcode}` : ''),
  };
};

const getJson = async (url, init) => {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
};

const backend = (path) => `${getBackendUrlSync()}/api/geo${path}`;

/**
 * Reverse geocode coordinates to get address details.
 * Returns { success, city, state, country, pincode, area, formattedAddress, coordinates }.
 */
export const reverseGeocode = async (latitude, longitude) => {
  const coordinates = { latitude, longitude };
  try {
    const { place } = await getJson(backend(`/reverse?lat=${latitude}&lng=${longitude}`));
    return { success: true, ...place, coordinates };
  } catch (backendError) {
    console.warn('Backend geocoding unavailable, using OpenStreetMap:', backendError.message);
  }
  try {
    const data = await getJson(
      `${NOMINATIM}/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=en`,
      { headers: { Accept: 'application/json' } }
    );
    return { success: true, ...fromNominatim(data.address), coordinates };
  } catch (error) {
    console.error('Geocoding error:', error);
    return { success: false, error: error.message, coordinates };
  }
};

/**
 * Forward geocode address to get coordinates.
 * Returns { success, coordinates, displayName } or { success: false, error }.
 */
export const forwardGeocode = async ({ addressLine1, area, city, state, pincode, country = 'India' }) => {
  const query = [addressLine1, area, city, state, pincode, country].filter(Boolean).join(', ');
  if (!query) return { success: false, error: 'No address information provided' };

  try {
    const { place } = await getJson(backend(`/geocode?address=${encodeURIComponent(query)}`));
    return { success: true, coordinates: place.coordinates, displayName: place.formattedAddress };
  } catch (backendError) {
    console.warn('Backend geocoding unavailable, using OpenStreetMap:', backendError.message);
  }
  try {
    const data = await getJson(
      `${NOMINATIM}/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=1&accept-language=en`,
      { headers: { Accept: 'application/json' } }
    );
    if (!data?.length) throw new Error('No results found for this address');
    return {
      success: true,
      coordinates: { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) },
      displayName: fromNominatim(data[0].address).formattedAddress || data[0].display_name,
    };
  } catch (error) {
    console.error('Forward geocoding error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get current position and reverse geocode
 */
export const getCurrentLocationWithAddress = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        resolve(await reverseGeocode(latitude, longitude));
      },
      reject,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });

export default {
  reverseGeocode,
  forwardGeocode,
  getCurrentLocationWithAddress
};
