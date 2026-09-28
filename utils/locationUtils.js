/**
 * Location and Distance Calculation Utilities
 * Provides functions for geospatial calculations and merchant filtering
 */

// Map of city name variations (all lowercase)
const CITY_VARIATIONS = {
  'bangalore': ['bangalore', 'bengaluru', 'bangaluru', 'bengalore'],
  'bengaluru': ['bangalore', 'bengaluru', 'bangaluru', 'bengalore'],
  'mumbai': ['mumbai', 'bombay'],
  'bombay': ['mumbai', 'bombay'],
  'chennai': ['chennai', 'madras'],
  'madras': ['chennai', 'madras'],
  'kolkata': ['kolkata', 'calcutta'],
  'calcutta': ['kolkata', 'calcutta'],
  'delhi': ['delhi', 'new delhi'],
  'new delhi': ['delhi', 'new delhi'],
  'pune': ['pune', 'poona'],
  'poona': ['pune', 'poona'],
  'kochi': ['kochi', 'cochin'],
  'cochin': ['kochi', 'cochin'],
  'thiruvananthapuram': ['thiruvananthapuram', 'trivandrum'],
  'trivandrum': ['thiruvananthapuram', 'trivandrum'],
  // Officially renamed cities — geocoders (Nominatim/Google) return the NEW
  // name while merchants are often onboarded with the traditional one.
  'mysore': ['mysore', 'mysuru'],
  'mysuru': ['mysore', 'mysuru'],
  'gurgaon': ['gurgaon', 'gurugram'],
  'gurugram': ['gurgaon', 'gurugram'],
  'allahabad': ['allahabad', 'prayagraj'],
  'prayagraj': ['allahabad', 'prayagraj'],
  'vadodara': ['vadodara', 'baroda'],
  'baroda': ['vadodara', 'baroda'],
  'mangalore': ['mangalore', 'mangaluru'],
  'mangaluru': ['mangalore', 'mangaluru'],
  'hubli': ['hubli', 'hubballi'],
  'hubballi': ['hubli', 'hubballi'],
  'belgaum': ['belgaum', 'belagavi'],
  'belagavi': ['belgaum', 'belagavi'],
  'shimoga': ['shimoga', 'shivamogga'],
  'shivamogga': ['shimoga', 'shivamogga'],
  'tumkur': ['tumkur', 'tumakuru'],
  'tumakuru': ['tumkur', 'tumakuru'],
  'gulbarga': ['gulbarga', 'kalaburagi'],
  'kalaburagi': ['gulbarga', 'kalaburagi'],
  'bijapur': ['bijapur', 'vijayapura'],
  'vijayapura': ['bijapur', 'vijayapura'],
  'varanasi': ['varanasi', 'banaras', 'benares'],
  'banaras': ['varanasi', 'banaras', 'benares'],
  'visakhapatnam': ['visakhapatnam', 'vizag'],
  'vizag': ['visakhapatnam', 'vizag'],
  'pondicherry': ['pondicherry', 'puducherry'],
  'puducherry': ['pondicherry', 'puducherry'],
  'tiruchirappalli': ['tiruchirappalli', 'trichy'],
  'trichy': ['tiruchirappalli', 'trichy'],
};

/**
 * Returns a MongoDB $in regex condition that matches all known variations of a city name
 */
function getCityQuery(cityName) {
  if (!cityName) return {};
  const normalized = cityName.toLowerCase().trim();
  const variations = CITY_VARIATIONS[normalized] || [normalized];
  return { $in: variations.map(v => new RegExp(`^${v}$`, 'i')) };
}

/**
 * Check if a merchant is currently open based on their working hours (IST)
 */
function isCurrentlyOpen(availability) {
  if (!availability || !availability.isActive) return false;
  const wh = availability.workingHours;
  if (!wh || !wh.start || !wh.end) return true; // No hours configured = always open

  // Use IST timezone for India
  const istDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const currentDay = dayNames[istDate.getDay()];

  const workingDays = wh.days && wh.days.length > 0 ? wh.days : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  if (!workingDays.includes(currentDay)) return false;

  const currentMinutes = istDate.getHours() * 60 + istDate.getMinutes();
  const [startH, startM] = wh.start.split(':').map(Number);
  const [endH, endM] = wh.end.split(':').map(Number);

  return currentMinutes >= (startH * 60 + startM) && currentMinutes <= (endH * 60 + endM);
}

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
    minimumMerchantsBeforeExpand = 3,
  } = settings.deliveryConfig || {};

  const { latitude, longitude } = address.coordinates || {};
  const city = address.city;
  const state = address.state;

  if (!city) throw new Error('Address must have city');

  console.log(`🔍 Finding merchants for ${city} ${latitude && longitude ? `at [${latitude}, ${longitude}]` : '(city-wide only)'}`);

  let nearbyMerchants = [];
  let cityWideMerchants = [];

  // STEP 1: Serviceability search if coordinates available.
  // Geo is PRIMARY: no city-name filter here — the customer's reverse-geocoded
  // city ("Mysuru") often differs from the merchant's onboarded one ("Mysore"),
  // and coordinates are ground truth. A merchant matches when the customer sits
  // inside that merchant's own delivery radius (merchant.deliveryRadius,
  // falling back to the global maxDeliveryRadius setting).
  if (latitude && longitude) {
    nearbyMerchants = await searchMerchantsByDistance(Merchant, longitude, latitude, maxDeliveryRadius);
    console.log(`📍 Found ${nearbyMerchants.length} merchants servicing this location`);
  }

  // STEP 2: City-wide search — skip if we already have enough nearby merchants
  const hasEnoughNearby = latitude && longitude && nearbyMerchants.length >= minimumMerchantsBeforeExpand;
  if (!hasEnoughNearby) {
    cityWideMerchants = await Merchant.find({
      city: getCityQuery(city),
      activeStatus: 'approved',
      'availability.isActive': true
    }).limit(200);
    console.log(`🏙️ City-wide search: ${cityWideMerchants.length} merchants in ${city}`);
  }

  // STEP 3: State-level fallback if no merchants found in city
  let stateFallback = false;
  if (nearbyMerchants.length === 0 && cityWideMerchants.length === 0 && state) {
    cityWideMerchants = await Merchant.find({
      state: { $regex: new RegExp(`^${state}$`, 'i') },
      activeStatus: 'approved',
      'availability.isActive': true
    }).limit(100);
    stateFallback = true;
    console.log(`🗺️ State fallback: ${cityWideMerchants.length} merchants in ${state}`);
  }

  // STEP 4: Merge + deduplicate
  const merchantMap = new Map();
  nearbyMerchants.forEach(m => merchantMap.set(m._id.toString(), { merchant: m, isNearby: true }));
  cityWideMerchants.forEach(m => {
    if (!merchantMap.has(m._id.toString())) {
      merchantMap.set(m._id.toString(), { merchant: m, isNearby: false });
    }
  });

  // STEP 5: Calculate distance + working hours flag for each merchant
  let allMerchants = Array.from(merchantMap.values()).map(({ merchant, isNearby }) => {
    // Nearby results come from aggregate() (plain objects); fallbacks from find() (documents)
    const { distanceMeters, ...plain } = merchant.toObject ? merchant.toObject() : merchant;
    const merchantCoords = plain.location?.coordinates;
    let distance = null;
    if (latitude && longitude && merchantCoords && merchantCoords.length === 2) {
      distance = calculateDistance(latitude, longitude, merchantCoords[1], merchantCoords[0]);
    }
    return {
      ...plain,
      distance: distance !== null ? Math.round(distance * 10) / 10 : null,
      isNearby,
      isOpen: isCurrentlyOpen(plain.availability),
      stateFallback
    };
  });

  // STEP 6: Sort — open first, then by distance, then alphabetically
  allMerchants.sort((a, b) => {
    // Open merchants before closed
    if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
    // Within same open/closed group: sort by distance if available
    if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
    if (a.distance !== null) return -1;
    if (b.distance !== null) return 1;
    return (a.businessName || '').localeCompare(b.businessName || '');
  });

  console.log(`✅ Returning ${allMerchants.length} merchants (stateFallback: ${stateFallback})`);
  return allMerchants;
}

/**
 * Search merchants by distance using MongoDB geospatial query
 */
async function searchMerchantsByDistance(Merchant, longitude, latitude, defaultRadiusKm) {
  // $geoNear computes the exact distance per merchant; cast a wide discovery
  // net (100km = schema max deliveryRadius), then enforce each merchant's own
  // serviceable radius. No city-name filter — coordinates are authoritative.
  const candidates = await Merchant.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [longitude, latitude] },
        distanceField: 'distanceMeters',
        maxDistance: 100 * 1000,
        query: { activeStatus: 'approved', 'availability.isActive': true },
        spherical: true
      }
    },
    { $limit: 200 }
  ]);

  return candidates
    .filter(m => m.distanceMeters <= (m.deliveryRadius || defaultRadiusKm) * 1000)
    .slice(0, 50);
}

module.exports = {
  calculateDistance,
  getNearbyPincodes,
  findNearbyMerchants,
  getCityQuery,
  isCurrentlyOpen
};
