/**
 * Geospatial utility functions for distance calculation and location services
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Array} coord1 - [longitude, latitude] of first point
 * @param {Array} coord2 - [longitude, latitude] of second point
 * @returns {Number} Distance in kilometers
 */
function calculateDistance(coord1, coord2) {
  if (!coord1 || !coord2 || coord1.length !== 2 || coord2.length !== 2) {
    return null;
  }

  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  if (lon1 === 0 && lat1 === 0) return null;
  if (lon2 === 0 && lat2 === 0) return null;

  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Convert degrees to radians
 * @param {Number} degrees 
 * @returns {Number} radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Check if merchant is within working hours
 * @param {Object} merchant - Merchant object with availability.workingHours
 * @param {Date} currentTime - Current time to check against
 * @returns {Boolean} true if within working hours
 */
function isWithinWorkingHours(merchant, currentTime = new Date()) {
  try {
    const workingHours = merchant.availability?.workingHours;
    if (!workingHours) return true; // If no working hours set, assume always available

    const currentDay = getCurrentDay(currentTime);
    if (!workingHours.days.includes(currentDay)) {
      return false; // Not a working day
    }

    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = workingHours.start.split(':').map(Number);
    const [endHour, endMinute] = workingHours.end.split(':').map(Number);
    
    const startTimeInMinutes = startHour * 60 + startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;

    return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
  } catch (error) {
    console.error('Error checking working hours:', error);
    return true; // Default to available if error
  }
}

/**
 * Get current day in short format (mon, tue, etc.)
 * @param {Date} date 
 * @returns {String} Day in short format
 */
function getCurrentDay(date = new Date()) {
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return days[date.getDay()];
}

/**
 * Calculate merchant score based on multiple factors
 * @param {Object} merchant - Merchant object
 * @param {Object} context - Context object with customerLocation, orderTime, etc.
 * @returns {Number} Score (0-100)
 */
function calculateMerchantScore(merchant, context) {
  let score = 0;
  
  try {
    // Distance factor (50% weight) - closer is better
    if (merchant.distance !== null && merchant.distance !== undefined) {
      const maxDistance = 20; // Max reasonable distance in km
      const distanceScore = Math.max(0, 50 - (merchant.distance * 2.5));
      score += distanceScore;
    }

    // Availability factor (25% weight)
    const availabilityScore = calculateAvailabilityScore(merchant);
    score += availabilityScore * 0.25;

    // Recent activity factor (15% weight)
    const activityScore = calculateActivityScore(merchant);
    score += activityScore * 0.15;

    // Rating factor (10% weight)
    const ratingScore = (merchant.rating || 4) * 2; // Scale 0-5 to 0-10
    score += ratingScore * 0.10;

    return Math.round(score);
  } catch (error) {
    console.error('Error calculating merchant score:', error);
    return 0;
  }
}

/**
 * Calculate availability score based on current orders vs capacity
 * @param {Object} merchant 
 * @returns {Number} Score (0-100)
 */
function calculateAvailabilityScore(merchant) {
  try {
    const availability = merchant.availability;
    if (!availability) return 50; // Default score

    if (!availability.isActive) return 0;

    const capacityUsed = availability.currentDayOrders / availability.maxDailyOrders;
    return Math.max(0, 100 - (capacityUsed * 100));
  } catch (error) {
    return 50;
  }
}

/**
 * Calculate activity score based on recent orders
 * @param {Object} merchant 
 * @returns {Number} Score (0-100)
 */
function calculateActivityScore(merchant) {
  try {
    if (!merchant.availability?.lastOrderAt) return 50;

    const hoursSinceLastOrder = (Date.now() - new Date(merchant.availability.lastOrderAt)) / (1000 * 60 * 60);
    
    if (hoursSinceLastOrder < 2) return 100; // Very recent activity
    if (hoursSinceLastOrder < 6) return 80;  // Recent activity
    if (hoursSinceLastOrder < 24) return 60; // Within last day
    return 30; // Older activity
  } catch (error) {
    return 50;
  }
}

/**
 * Parse location from various input formats
 * @param {String|Object} locationInput 
 * @returns {Object} Standardized location object
 */
function parseLocation(locationInput) {
  if (!locationInput) return null;

  try {
    // If already an object with coordinates
    if (locationInput.coordinates && Array.isArray(locationInput.coordinates)) {
      return locationInput;
    }

    // If it's a string (address), return as is for geocoding later
    if (typeof locationInput === 'string') {
      return {
        address: locationInput,
        coordinates: [0, 0] // Will be geocoded later
      };
    }

    return null;
  } catch (error) {
    console.error('Error parsing location:', error);
    return null;
  }
}

/**
 * Smart merchant selection logic for internal use
 * @param {Object} params - Parameters for merchant selection
 * @returns {Promise<Object>} Ranked merchants
 */
async function smartMerchantSelection({ 
  orderId, 
  productId, 
  customerLocation, 
  maxDistance = 15, 
  maxMerchants = 3 
}) {
  try {
    const Merchant = require('../models/Merchant');
    const Product = require('../models/Product');

    // Validate customer location
    if (!customerLocation?.coordinates || 
        !Array.isArray(customerLocation.coordinates) || 
        customerLocation.coordinates.length !== 2) {
      throw new Error('Valid customer location with coordinates is required');
    }

    // Find merchants with the product and within distance
    const merchants = await Merchant.find({
      'availability.isActive': true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: customerLocation.coordinates
          },
          $maxDistance: maxDistance * 1000 // Convert km to meters
        }
      }
    }).limit(maxMerchants * 2); // Get more than needed for scoring

    // Calculate distance and score for each merchant
    const merchantsWithScores = merchants.map(merchant => {
      const distance = calculateDistance(
        customerLocation.coordinates,
        merchant.location.coordinates
      );

      const score = calculateMerchantScore(merchant.toObject(), {
        customerLocation,
        orderTime: new Date()
      });

      return {
        ...merchant.toObject(),
        distance,
        score,
        priority: score > 80 ? 'high' : score > 60 ? 'medium' : 'low'
      };
    });

    // Filter out merchants with invalid distances and sort by score
    const validMerchants = merchantsWithScores
      .filter(merchant => merchant.distance !== null && merchant.distance <= maxDistance)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxMerchants);

    return {
      success: true,
      rankedMerchants: validMerchants,
      totalFound: merchants.length,
      criteria: {
        maxDistance,
        maxMerchants,
        customerLocation
      }
    };

  } catch (error) {
    console.error('Error in smart merchant selection:', error);
    return {
      success: false,
      error: error.message,
      rankedMerchants: []
    };
  }
}

module.exports = {
  calculateDistance,
  isWithinWorkingHours,
  getCurrentDay,
  calculateMerchantScore,
  calculateAvailabilityScore,
  calculateActivityScore,
  parseLocation,
  toRadians,
  smartMerchantSelection
};