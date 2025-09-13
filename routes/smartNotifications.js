const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Merchant = require('../models/Merchant');
const MerchantProduct = require('../models/MerchantProduct');
const { verifyToken, requireMerchantOrAdmin, requireAdmin } = require('../middleware/auth');
const { calculateDistance, isWithinWorkingHours, calculateMerchantScore } = require('../utils/geoUtils');

/**
 * Smart Merchant Selection API
 * Finds and ranks eligible merchants for order items based on:
 * - Distance from customer
 * - Merchant availability  
 * - Stock levels
 * - Working hours
 * - Recent activity
 */
router.post('/smart-merchant-selection', verifyToken, async (req, res) => {
  try {
    const { orderId, productId, customerLocation, maxDistance = 15, maxMerchants = 5 } = req.body;

    if (!productId || !customerLocation || !customerLocation.coordinates) {
      return res.status(400).json({ 
        message: 'Product ID and customer location with coordinates are required' 
      });
    }

    console.log('Smart merchant selection request:', {
      orderId,
      productId,
      customerLocation,
      maxDistance,
      maxMerchants
    });

    // Find eligible merchants
    const eligibleMerchants = await findEligibleMerchants({
      productId,
      customerLocation,
      maxDistance,
      maxCurrentOrders: 8
    });

    if (eligibleMerchants.length === 0) {
      return res.json({ 
        rankedMerchants: [],
        message: 'No eligible merchants found in the area'
      });
    }

    // Rank merchants by score
    const rankedMerchants = await rankMerchants(eligibleMerchants, {
      customerLocation,
      orderTime: new Date()
    });

    // Return top merchants
    const topMerchants = rankedMerchants.slice(0, maxMerchants);

    res.json({ 
      rankedMerchants: topMerchants,
      totalEligible: eligibleMerchants.length,
      searchRadius: maxDistance
    });

  } catch (error) {
    console.error('Smart merchant selection error:', error);
    res.status(500).json({ 
      message: 'Error finding eligible merchants',
      error: error.message 
    });
  }
});

/**
 * Find merchants eligible for a product order
 */
async function findEligibleMerchants({ productId, customerLocation, maxDistance, maxCurrentOrders }) {
  try {
    // Step 1: Find merchants who have this product in stock
    const merchantsWithProduct = await MerchantProduct.find({
      productId: productId,
      stock: { $gt: 0 },
      enabled: true
    }).populate({
      path: 'merchantId',
      match: {
        activeStatus: 'approved',
        'availability.isActive': true,
        'availability.currentDayOrders': { $lt: maxCurrentOrders }
      },
      populate: {
        path: 'userId',
        select: 'name email phone'
      }
    });

    // Filter out null merchants (those that didn't match the conditions)
    const validMerchants = merchantsWithProduct
      .filter(mp => mp.merchantId !== null)
      .map(mp => ({
        ...mp.merchantId.toObject(),
        stock: mp.stock,
        user: mp.merchantId.userId
      }));

    console.log(`Found ${validMerchants.length} merchants with product in stock`);

    // Step 2: Calculate distances and filter by proximity
    const merchantsWithDistance = [];
    
    for (const merchant of validMerchants) {
      // Skip if merchant has no location set
      if (!merchant.location || !merchant.location.coordinates || 
          merchant.location.coordinates[0] === 0 && merchant.location.coordinates[1] === 0) {
        console.log(`Skipping merchant ${merchant.name} - no location set`);
        continue;
      }

      const distance = calculateDistance(
        customerLocation.coordinates,
        merchant.location.coordinates
      );

      if (distance !== null && distance <= maxDistance) {
        merchantsWithDistance.push({
          ...merchant,
          distance: distance
        });
      }
    }

    console.log(`Found ${merchantsWithDistance.length} merchants within ${maxDistance}km`);

    // Step 3: Filter by working hours
    const currentTime = new Date();
    const eligibleMerchants = merchantsWithDistance.filter(merchant => {
      const withinHours = isWithinWorkingHours(merchant, currentTime);
      if (!withinHours) {
        console.log(`Filtering out merchant ${merchant.name} - outside working hours`);
      }
      return withinHours;
    });

    console.log(`Final eligible merchants: ${eligibleMerchants.length}`);

    return eligibleMerchants;
  } catch (error) {
    console.error('Error finding eligible merchants:', error);
    throw error;
  }
}

/**
 * Rank merchants by calculated score
 */
async function rankMerchants(merchants, context) {
  try {
    const rankedMerchants = merchants.map(merchant => {
      const score = calculateMerchantScore(merchant, context);
      return {
        ...merchant,
        score: score,
        // Include contact information for notifications
        contact: {
          phone: merchant.contact?.phone || merchant.user?.phone,
          email: merchant.contact?.email || merchant.user?.email,
          name: merchant.name || merchant.user?.name
        }
      };
    });

    // Sort by score (highest first)
    return rankedMerchants.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error('Error ranking merchants:', error);
    throw error;
  }
}

/**
 * Get merchant availability status
 */
router.get('/merchant-availability/:merchantId', [verifyToken, requireMerchantOrAdmin], async (req, res) => {
  try {
    const { merchantId } = req.params;
    
    const merchant = await Merchant.findById(merchantId)
      .populate('userId', 'name email phone');

    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    const currentTime = new Date();
    const availability = {
      isActive: merchant.availability?.isActive || false,
      withinWorkingHours: isWithinWorkingHours(merchant, currentTime),
      currentOrders: merchant.availability?.currentDayOrders || 0,
      maxOrders: merchant.availability?.maxDailyOrders || 10,
      capacityUsed: ((merchant.availability?.currentDayOrders || 0) / (merchant.availability?.maxDailyOrders || 10)) * 100,
      lastOrderAt: merchant.availability?.lastOrderAt,
      workingHours: merchant.availability?.workingHours
    };

    res.json({
      merchantId: merchant._id,
      name: merchant.name,
      availability,
      location: merchant.location
    });

  } catch (error) {
    console.error('Error getting merchant availability:', error);
    res.status(500).json({ message: 'Error getting merchant availability' });
  }
});

/**
 * Update merchant availability (for testing)
 */
router.patch('/merchant-availability/:merchantId', [verifyToken, requireAdmin], async (req, res) => {
  try {
    const { merchantId } = req.params;
    const updates = req.body;

    const merchant = await Merchant.findByIdAndUpdate(
      merchantId,
      { 
        $set: { 
          'availability': {
            ...updates
          }
        }
      },
      { new: true }
    );

    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    res.json({
      message: 'Merchant availability updated',
      availability: merchant.availability
    });

  } catch (error) {
    console.error('Error updating merchant availability:', error);
    res.status(500).json({ message: 'Error updating merchant availability' });
  }
});

/**
 * Test distance calculation
 */
router.post('/test-distance', verifyToken, async (req, res) => {
  try {
    const { coord1, coord2 } = req.body;
    
    if (!coord1 || !coord2) {
      return res.status(400).json({ message: 'Both coordinates are required' });
    }

    const distance = calculateDistance(coord1, coord2);
    
    res.json({
      coord1,
      coord2,
      distance,
      unit: 'kilometers'
    });

  } catch (error) {
    console.error('Distance calculation error:', error);
    res.status(500).json({ message: 'Error calculating distance' });
  }
});

module.exports = router;