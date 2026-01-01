/**
 * Location and Distance Calculation Utilities
 * Provides functions for geospatial calculations and merchant filtering
 */

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Get nearby pincodes for fallback search
 * This is a simplified version - in production, use a pincode database
 * @param {string} pincode - Primary pincode
 * @returns {Array<string>} Array of nearby pincodes
 */
function getNearbyPincodes(pincode) {
  if (!pincode || pincode.length !== 6) return [pincode];

  // Extract base pincode (first 3 digits typically represent region)
  const basePin = pincode.substring(0, 3);
  const lastThree = parseInt(pincode.substring(3));

  // Generate nearby pincodes (±5 range)
  const nearbyPins = [pincode];
  for (let i = -5; i <= 5; i++) {
    if (i !== 0) {
      const newLast = lastThree + i;
      if (newLast >= 0 && newLast <= 999) {
        nearbyPins.push(basePin + String(newLast).padStart(3, '0'));
      }
    }
  }

  return nearbyPins;
}

/**
 * Find merchants near a given address with smart fallbacks
 * @param {Object} address - Customer address with coordinates
 * @param {Object} settings - App settings with delivery configuration
 * @param {Object} Merchant - Mongoose Merchant model
 * @returns {Promise<Array>} Array of nearby merchants with distances
 */
async function findNearbyMerchants(address, settings, Merchant) {
  const {
    maxDeliveryRadius = 10,
    maxExpandedRadius = 25,
    minimumMerchantsBeforeExpand = 3,
    fallbackStrategy = 'expand',
    enablePincodeGrouping = true,
    alwaysIncludeCityWide = true // NEW: Always include all city merchants
  } = settings.deliveryConfig || {};

  const { latitude, longitude } = address.coordinates || {};
  const city = address.city;

  // City is always required, coordinates are optional (will fallback to city-only search)
  if (!city) {
    throw new Error('Address must have city');
  }

  console.log(`🔍 Finding merchants for ${city} ${latitude && longitude ? `at [${latitude}, ${longitude}]` : '(city-wide only)'}`);

  let nearbyMerchants = [];
  let cityWideMerchants = [];

  // STEP 1: If coordinates are available, do radius-based search
  if (latitude && longitude) {
    // Try primary radius search
    nearbyMerchants = await searchMerchantsByDistance(
      Merchant,
      longitude,
      latitude,
      city,
      maxDeliveryRadius
    );

    console.log(`📍 Found ${nearbyMerchants.length} merchants within ${maxDeliveryRadius}km`);

    // If too few merchants, try expanded radius
    if (nearbyMerchants.length < minimumMerchantsBeforeExpand && fallbackStrategy === 'expand') {
      console.log(`⚠️ Only ${nearbyMerchants.length} merchants found, expanding to ${maxExpandedRadius}km`);

      nearbyMerchants = await searchMerchantsByDistance(
        Merchant,
        longitude,
        latitude,
        city,
        maxExpandedRadius
      );
      console.log(`📍 Expanded search: ${nearbyMerchants.length} merchants`);
    }
  }

  // STEP 2: ALWAYS fetch all city-wide merchants (NEW BEHAVIOR)
  if (alwaysIncludeCityWide) {
    cityWideMerchants = await Merchant.find({
      city: { $regex: new RegExp(`^${city}$`, 'i') }, // Case-insensitive exact match
      activeStatus: 'approved',
      'availability.isActive': true
    }).limit(200);

    console.log(`🏙️ City-wide search: ${cityWideMerchants.length} total merchants in ${city}`);
  }

  // STEP 3: Merge nearby and city-wide merchants (deduplicate)
  const merchantMap = new Map();

  // Add nearby merchants first (they have priority in sorting)
  nearbyMerchants.forEach(m => {
    merchantMap.set(m._id.toString(), { merchant: m, isNearby: true });
  });

  // Add city-wide merchants (skip if already in nearby)
  cityWideMerchants.forEach(m => {
    const id = m._id.toString();
    if (!merchantMap.has(id)) {
      merchantMap.set(id, { merchant: m, isNearby: false });
    }
  });

  // Convert map back to array
  let allMerchants = Array.from(merchantMap.values());

  console.log(`🔗 Combined: ${allMerchants.length} unique merchants (${nearbyMerchants.length} nearby + ${cityWideMerchants.length - nearbyMerchants.length} city-wide)`);

  // STEP 4: Calculate distances for ALL merchants
  allMerchants = allMerchants.map(({ merchant, isNearby }) => {
    const merchantCoords = merchant.location?.coordinates;
    let distance = null;

    // Only calculate distance if customer has coordinates and merchant has coordinates
    if (latitude && longitude && merchantCoords && merchantCoords.length === 2) {
      distance = calculateDistance(
        latitude,
        longitude,
        merchantCoords[1], // MongoDB stores as [lng, lat]
        merchantCoords[0]
      );
    }

    return {
      ...merchant.toObject(),
      distance: distance ? Math.round(distance * 10) / 10 : null, // Round to 1 decimal
      isNearby // Tag for UI display
    };
  });

  // STEP 5: Sort: nearby first (by distance), then city-wide (alphabetically)
  allMerchants.sort((a, b) => {
    // Both have distances - sort by distance
    if (a.distance !== null && b.distance !== null) {
      return a.distance - b.distance;
    }
    // One has distance, one doesn't - distance comes first
    if (a.distance !== null) return -1;
    if (b.distance !== null) return 1;
    // Neither has distance - sort alphabetically by business name
    return (a.businessName || '').localeCompare(b.businessName || '');
  });

  const nearbyCount = allMerchants.filter(m => m.isNearby).length;
  const cityWideCount = allMerchants.length - nearbyCount;

  console.log(`✅ Returning ${allMerchants.length} merchants:`);
  console.log(`   • ${nearbyCount} nearby (${allMerchants[0]?.distance || 'N/A'}km - ${allMerchants[nearbyCount - 1]?.distance || 'N/A'}km)`);
  console.log(`   • ${cityWideCount} city-wide only`);

  return allMerchants;
}

/**
 * Search merchants by distance using MongoDB geospatial query
 */
async function searchMerchantsByDistance(Merchant, longitude, latitude, city, maxDistanceKm) {
  return await Merchant.find({
    city: city, // Always filter by city first
    activeStatus: 'approved',
    'availability.isActive': true,
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistanceKm * 1000 // Convert km to meters
      }
    }
  }).limit(50);
}

module.exports = {
  calculateDistance,
  getNearbyPincodes,
  findNearbyMerchants
};
