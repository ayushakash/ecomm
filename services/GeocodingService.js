const axios = require('axios');

class GeocodingService {
  constructor() {
    // You can use Google Maps API, OpenStreetMap Nominatim, or MapBox
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    this.baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
  }

  /**
   * Convert address to coordinates using Google Maps Geocoding API
   */
  async addressToCoordinates(address) {
    try {
      if (!address) throw new Error('Address is required');

      // For free alternative, use OpenStreetMap Nominatim
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;

      const response = await axios.get(nominatimUrl, {
        headers: {
          'User-Agent': 'YourAppName/1.0' // Required by Nominatim
        }
      });

      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        return {
          success: true,
          coordinates: [parseFloat(result.lon), parseFloat(result.lat)], // [longitude, latitude]
          formatted_address: result.display_name,
          confidence: parseFloat(result.importance || 0.5)
        };
      }

      return {
        success: false,
        error: 'No coordinates found for this address'
      };

    } catch (error) {
      console.error('Geocoding error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Convert coordinates to address (reverse geocoding)
   */
  async coordinatesToAddress(longitude, latitude) {
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;

      const response = await axios.get(nominatimUrl, {
        headers: {
          'User-Agent': 'YourAppName/1.0'
        }
      });

      if (response.data) {
        const result = response.data;
        return {
          success: true,
          address: result.display_name,
          components: {
            area: result.address?.neighbourhood || result.address?.suburb,
            city: result.address?.city || result.address?.town,
            state: result.address?.state,
            pincode: result.address?.postcode,
            country: result.address?.country
          }
        };
      }

      return {
        success: false,
        error: 'No address found for these coordinates'
      };

    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate if coordinates are within supported delivery areas
   */
  isWithinDeliveryArea(coordinates, supportedAreas = []) {
    // Add logic to check if coordinates are within your service areas
    // For now, check if it's within India bounds
    const [longitude, latitude] = coordinates;

    // India bounds (approximate)
    const indiaBounds = {
      north: 37.6,
      south: 6.4,
      east: 97.25,
      west: 68.7
    };

    return (
      latitude >= indiaBounds.south &&
      latitude <= indiaBounds.north &&
      longitude >= indiaBounds.west &&
      longitude <= indiaBounds.east
    );
  }
}

module.exports = new GeocodingService();