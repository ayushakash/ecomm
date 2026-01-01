/**
 * Geocoding Service
 * Converts coordinates to address information using browser's built-in API
 */

/**
 * Reverse geocode coordinates to get address details
 * Uses Nominatim (OpenStreetMap) API - free and no API key required
 */
export const reverseGeocode = async (latitude, longitude) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ConstructionMaterialsMarketplace/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const data = await response.json();

    // Extract address components
    const address = data.address || {};

    // Try to get city from various possible fields
    const city = address.city ||
                 address.town ||
                 address.village ||
                 address.municipality ||
                 address.county ||
                 address.state_district;

    const state = address.state;
    const country = address.country;
    const pincode = address.postcode;
    const area = address.suburb ||
                 address.neighbourhood ||
                 address.locality ||
                 address.quarter;

    // Full formatted address
    const formattedAddress = data.display_name;

    return {
      success: true,
      city,
      state,
      country,
      pincode,
      area,
      formattedAddress,
      coordinates: {
        latitude,
        longitude
      },
      raw: data // Keep raw data for debugging
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return {
      success: false,
      error: error.message,
      coordinates: {
        latitude,
        longitude
      }
    };
  }
};

/**
 * Forward geocode address to get coordinates
 * Converts address text (area, city, state, pincode) to GPS coordinates
 * Uses Nominatim (OpenStreetMap) API - free and no API key required
 */
export const forwardGeocode = async ({ addressLine1, area, city, state, pincode, country = 'India' }) => {
  try {
    // Build search query - more specific fields first
    const queryParts = [];

    if (addressLine1) queryParts.push(addressLine1);
    if (area) queryParts.push(area);
    if (city) queryParts.push(city);
    if (state) queryParts.push(state);
    if (pincode) queryParts.push(pincode);
    if (country) queryParts.push(country);

    const query = queryParts.join(', ');

    if (!query) {
      throw new Error('No address information provided');
    }

    console.log('🌍 Forward geocoding query:', query);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=1`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ConstructionMaterialsMarketplace/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Forward geocoding failed');
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      throw new Error('No results found for this address');
    }

    // Get the first (best) result
    const result = data[0];
    const latitude = parseFloat(result.lat);
    const longitude = parseFloat(result.lon);

    console.log('✅ Forward geocoding successful:', { latitude, longitude });

    return {
      success: true,
      coordinates: {
        latitude,
        longitude
      },
      accuracy: result.importance, // OSM importance score (0-1)
      displayName: result.display_name,
      raw: result
    };
  } catch (error) {
    console.error('Forward geocoding error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get current position and reverse geocode
 */
export const getCurrentLocationWithAddress = async () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const addressData = await reverseGeocode(latitude, longitude);
        resolve(addressData);
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
};

export default {
  reverseGeocode,
  forwardGeocode,
  getCurrentLocationWithAddress
};
