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
 * @param {Object} context - Context object with customerLocation, orderTime, stock, etc.
 * @returns {Number} Score (0-100)
 */
function calculateMerchantScore(merchant, context) {
  let score = 0;
  const scoreBreakdown = {};

  try {
    // Distance factor (30% weight) - closer is better
    if (merchant.distance !== null && merchant.distance !== undefined) {
      const maxDistance = 20; // Max reasonable distance in km
      let distanceScore = 0;

      if (merchant.distance <= 2) distanceScore = 30; // Excellent
      else if (merchant.distance <= 5) distanceScore = 25; // Very good
      else if (merchant.distance <= 10) distanceScore = 20; // Good
      else if (merchant.distance <= 15) distanceScore = 15; // Fair
      else if (merchant.distance <= 20) distanceScore = 10; // Poor
      else distanceScore = 0; // Too far

      score += distanceScore;
      scoreBreakdown.distance = distanceScore;
    }

    // Stock factor (25% weight) - more stock is better
    if (context.stock !== undefined && context.requiredQuantity) {
      const stockScore = calculateStockScore(context.stock, context.requiredQuantity);
      const weightedStockScore = stockScore * 0.25;
      score += weightedStockScore;
      scoreBreakdown.stock = weightedStockScore;
    }

    // Availability factor (20% weight)
    const availabilityScore = calculateAvailabilityScore(merchant);
    const weightedAvailabilityScore = availabilityScore * 0.20;
    score += weightedAvailabilityScore;
    scoreBreakdown.availability = weightedAvailabilityScore;

    // Recent activity factor (15% weight)
    const activityScore = calculateActivityScore(merchant);
    const weightedActivityScore = activityScore * 0.15;
    score += weightedActivityScore;
    scoreBreakdown.activity = weightedActivityScore;

    // Rating factor (10% weight) - enhanced rating system
    const ratingScore = calculateRatingScore(merchant);
    const weightedRatingScore = ratingScore * 0.10;
    score += weightedRatingScore;
    scoreBreakdown.rating = weightedRatingScore;

    // Time-based bonus factors
    const timeBonusScore = calculateTimeBonusScore(merchant, context);
    score += timeBonusScore;
    scoreBreakdown.timeBonus = timeBonusScore;

    // Log detailed scoring for debugging
    console.log(`📊 Score breakdown for ${merchant.name}:`, {
      distance: scoreBreakdown.distance || 0,
      stock: scoreBreakdown.stock || 0,
      availability: scoreBreakdown.availability || 0,
      activity: scoreBreakdown.activity || 0,
      rating: scoreBreakdown.rating || 0,
      timeBonus: scoreBreakdown.timeBonus || 0,
      total: Math.round(score)
    });

    return Math.round(score);
  } catch (error) {
    console.error('Error calculating merchant score:', error);
    return 0;
  }
}

/**
 * Calculate enhanced rating score
 */
function calculateRatingScore(merchant) {
  const rating = merchant.rating || 0;
  const totalOrders = merchant.totalOrders || 0;
  const completedOrders = merchant.completedOrders || 0;

  let ratingScore = rating * 20; // Scale 0-5 to 0-100

  // Completion rate bonus
  if (totalOrders > 0) {
    const completionRate = completedOrders / totalOrders;
    ratingScore += completionRate * 20; // Up to 20 bonus points
  }

  // Experience bonus (more orders = more experience)
  if (totalOrders >= 100) ratingScore += 10;
  else if (totalOrders >= 50) ratingScore += 5;

  return Math.min(100, ratingScore);
}

/**
 * Calculate time-based bonus scores
 */
function calculateTimeBonusScore(merchant, context) {
  let bonusScore = 0;
  const currentTime = context.orderTime || new Date();
  const currentHour = currentTime.getHours();

  // Peak hours bonus (lunch: 11-14, dinner: 18-21)
  const isLunchTime = currentHour >= 11 && currentHour <= 14;
  const isDinnerTime = currentHour >= 18 && currentHour <= 21;

  if (isLunchTime || isDinnerTime) {
    bonusScore += 5; // Peak time readiness bonus
  }

  // Quick response history bonus
  if (merchant.availability?.averageResponseTime) {
    const avgResponseMinutes = merchant.availability.averageResponseTime;
    if (avgResponseMinutes <= 5) bonusScore += 5;
    else if (avgResponseMinutes <= 10) bonusScore += 3;
    else if (avgResponseMinutes <= 15) bonusScore += 1;
  }

  // Consistent availability bonus
  if (merchant.availability?.consistencyScore >= 0.9) bonusScore += 3;
  else if (merchant.availability?.consistencyScore >= 0.8) bonusScore += 2;

  return bonusScore;
}

/**
 * Calculate stock score based on available stock vs required quantity
 * @param {Number} availableStock - Available stock quantity
 * @param {Number} requiredQuantity - Required quantity for order
 * @returns {Number} Score (0-100)
 */
function calculateStockScore(availableStock, requiredQuantity) {
  try {
    if (availableStock < requiredQuantity) return 0; // Not enough stock

    // Calculate how many times the required quantity can be fulfilled
    const stockRatio = availableStock / requiredQuantity;

    if (stockRatio >= 10) return 100; // Excellent stock (10x or more than needed)
    if (stockRatio >= 5) return 90;   // Very good stock (5-10x needed)
    if (stockRatio >= 3) return 80;   // Good stock (3-5x needed)
    if (stockRatio >= 2) return 70;   // Adequate stock (2-3x needed)
    if (stockRatio >= 1.5) return 60; // Minimal good stock (1.5-2x needed)
    return 50; // Just enough stock (exactly what's needed)
  } catch (error) {
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
  variantLabel = null,
  customerLocation,
  maxDistance = 15,
  maxMerchants = 3,
  requiredQuantity = 1
}) {
  console.log(`🔍 Starting smart merchant selection for order ${orderId}:`);
  console.log(`   Product ID: ${productId}`);
  console.log(`   Required Quantity: ${requiredQuantity}`);
  console.log(`   Customer Location: ${JSON.stringify(customerLocation)}`);
  console.log(`   Max Distance: ${maxDistance}km`);
  console.log(`   Max Merchants: ${maxMerchants}`);

  try {
    const Merchant = require('../models/Merchant');
    const MerchantProduct = require('../models/MerchantProduct');

    // Validate customer location
    if (!customerLocation?.coordinates ||
        !Array.isArray(customerLocation.coordinates) ||
        customerLocation.coordinates.length !== 2) {
      console.log('❌ Invalid customer location coordinates');
      throw new Error('Valid customer location with coordinates is required');
    }

    // Check for [0,0] coordinates
    if (customerLocation.coordinates[0] === 0 && customerLocation.coordinates[1] === 0) {
      console.log('❌ Customer location coordinates are [0,0] - invalid');
      throw new Error('Customer location coordinates cannot be [0,0]');
    }

    // Validate productId is provided
    if (!productId) {
      console.log('❌ Product ID is missing');
      throw new Error('Product ID is required for merchant selection');
    }

    // First, find merchants who have this product in stock
    console.log(`📦 Searching for merchants with product ${productId}${variantLabel ? ` variant "${variantLabel}"` : ''} and stock >= ${requiredQuantity}`);

    // For variant products stock lives in variantPricing[].stock, not the root stock field
    const stockQuery = variantLabel
      ? {
          productId: productId,
          enabled: true,
          variantPricing: { $elemMatch: { label: variantLabel, stock: { $gte: requiredQuantity } } }
        }
      : {
          productId: productId,
          enabled: true,
          stock: { $gte: requiredQuantity }
        };

    const merchantsWithStock = await MerchantProduct.find(stockQuery).select('merchantId stock variantPricing');

    console.log(`📦 Found ${merchantsWithStock.length} merchants with sufficient stock:`);
    merchantsWithStock.forEach((mp, index) => {
      const effectiveStock = variantLabel
        ? (mp.variantPricing?.find(v => v.label === variantLabel)?.stock || 0)
        : mp.stock;
      console.log(`   ${index + 1}. Merchant: ${mp.merchantId}, Stock: ${effectiveStock}`);
    });

    if (merchantsWithStock.length === 0) {
      console.log('❌ No merchants have this product in stock with required quantity');

      const anyMerchants = await MerchantProduct.find({ productId: productId }).select('merchantId stock variantPricing enabled');
      console.log(`📦 Total merchants with this product (any stock): ${anyMerchants.length}`);
      anyMerchants.forEach((mp, index) => {
        const effectiveStock = variantLabel
          ? (mp.variantPricing?.find(v => v.label === variantLabel)?.stock || 0)
          : mp.stock;
        console.log(`   ${index + 1}. Merchant: ${mp.merchantId}, Stock: ${effectiveStock}, Enabled: ${mp.enabled}`);
      });

      return {
        success: false,
        error: 'No merchants have this product in stock',
        rankedMerchants: []
      };
    }

    const merchantIds = merchantsWithStock.map(mp => mp.merchantId);
    const stockByMerchant = merchantsWithStock.reduce((acc, mp) => {
      const effectiveStock = variantLabel
        ? (mp.variantPricing?.find(v => v.label === variantLabel)?.stock || 0)
        : mp.stock;
      acc[mp.merchantId.toString()] = effectiveStock;
      return acc;
    }, {});

    // Find merchants with the product in stock and within distance
    console.log(`🌍 Searching for merchants within ${maxDistance}km of customer location ${customerLocation.coordinates}`);
    console.log(`🔍 Merchant IDs to search: ${merchantIds.map(id => id.toString())}`);

    const merchants = await Merchant.find({
      _id: { $in: merchantIds }, // Only merchants with stock
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
    }).limit(maxMerchants * 3); // Get more than needed for scoring

    console.log(`🌍 Found ${merchants.length} merchants within distance and active:`);
    merchants.forEach((merchant, index) => {
      console.log(`   ${index + 1}. ${merchant.name} (${merchant._id})`);
      console.log(`      Location: ${merchant.location.coordinates}`);
      console.log(`      Active: ${merchant.availability?.isActive}`);
    });

    if (merchants.length === 0) {
      console.log('❌ No active merchants found within distance. Checking all merchants...');

      // Debug: Check all merchants with stock regardless of distance/activity
      const allMerchantsWithStock = await Merchant.find({
        _id: { $in: merchantIds }
      }).select('name location availability');

      console.log(`🔍 All merchants with stock (${allMerchantsWithStock.length}):`);
      allMerchantsWithStock.forEach((merchant, index) => {
        const distance = calculateDistance(customerLocation.coordinates, merchant.location.coordinates);
        console.log(`   ${index + 1}. ${merchant.name} (${merchant._id})`);
        console.log(`      Location: ${merchant.location.coordinates}`);
        console.log(`      Distance: ${distance}km`);
        console.log(`      Active: ${merchant.availability?.isActive}`);
        console.log(`      Within Range: ${distance <= maxDistance ? 'YES' : 'NO'}`);
      });
    }

    // Calculate distance and score for each merchant
    const merchantsWithScores = merchants.map(merchant => {
      const distance = calculateDistance(
        customerLocation.coordinates,
        merchant.location.coordinates
      );

      const merchantStock = stockByMerchant[merchant._id.toString()] || 0;

      const score = calculateMerchantScore(merchant.toObject(), {
        customerLocation,
        orderTime: new Date(),
        stock: merchantStock,
        requiredQuantity
      });

      return {
        ...merchant.toObject(),
        distance,
        score,
        stock: merchantStock,
        priority: score > 80 ? 'high' : score > 60 ? 'medium' : 'low'
      };
    });

    // Filter out merchants with invalid distances and sort by score
    const validMerchants = merchantsWithScores
      .filter(merchant => merchant.distance !== null && merchant.distance <= maxDistance)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxMerchants);

    console.log(`✅ Final selection: ${validMerchants.length} merchants ranked by score:`);
    validMerchants.forEach((merchant, index) => {
      console.log(`   ${index + 1}. ${merchant.name} - Score: ${merchant.score}, Distance: ${merchant.distance}km, Stock: ${merchant.stock}`);
    });

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
  calculateStockScore,
  calculateAvailabilityScore,
  calculateActivityScore,
  parseLocation,
  toRadians,
  smartMerchantSelection
};