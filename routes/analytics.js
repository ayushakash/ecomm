const express = require('express');
const router = express.Router();
const Analytics = require('../models/Analytics');
const { verifyToken, requireAdmin } = require('../middleware/auth');

/**
 * @route   POST /api/analytics/track
 * @desc    Track analytics event
 * @access  Public
 */
router.post('/track', async (req, res) => {
  try {
    const { eventType, searchTerm, productId, productName, category, metadata } = req.body;

    // Create analytics entry
    const analyticsEntry = new Analytics({
      eventType,
      searchTerm,
      productId,
      productName,
      category,
      userId: req.user?._id, // Optional - if user is logged in
      metadata
    });

    await analyticsEntry.save();

    res.status(201).json({
      success: true,
      message: 'Analytics tracked successfully'
    });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track analytics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/analytics/search-terms
 * @desc    Get popular search terms with counts
 * @access  Admin
 */
router.get('/search-terms', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 20, days = 30 } = req.query;

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - parseInt(days));

    const searchTerms = await Analytics.aggregate([
      {
        $match: {
          eventType: 'search',
          searchTerm: { $exists: true, $ne: null, $ne: '' },
          timestamp: { $gte: dateFrom }
        }
      },
      {
        $group: {
          _id: { $toLower: '$searchTerm' },
          count: { $sum: 1 },
          lastSearched: { $max: '$timestamp' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: parseInt(limit)
      },
      {
        $project: {
          _id: 0,
          searchTerm: '$_id',
          count: 1,
          lastSearched: 1
        }
      }
    ]);

    res.json({
      success: true,
      searchTerms,
      totalUnique: searchTerms.length
    });
  } catch (error) {
    console.error('Error fetching search terms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch search terms',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/analytics/popular-products
 * @desc    Get most viewed/added products
 * @access  Admin
 */
router.get('/popular-products', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { eventType = 'product_view', limit = 10, days = 30 } = req.query;

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - parseInt(days));

    const popularProducts = await Analytics.aggregate([
      {
        $match: {
          eventType,
          productId: { $exists: true, $ne: null },
          timestamp: { $gte: dateFrom }
        }
      },
      {
        $group: {
          _id: '$productId',
          productName: { $first: '$productName' },
          category: { $first: '$category' },
          count: { $sum: 1 },
          lastEvent: { $max: '$timestamp' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: parseInt(limit)
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: {
          path: '$product',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          productName: { $ifNull: ['$product.name', '$productName'] },
          category: { $ifNull: ['$product.category', '$category'] },
          count: 1,
          lastEvent: 1,
          currentPrice: '$product.price',
          image: { $arrayElemAt: ['$product.images', 0] }
        }
      }
    ]);

    res.json({
      success: true,
      products: popularProducts
    });
  } catch (error) {
    console.error('Error fetching popular products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch popular products',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/analytics/overview
 * @desc    Get analytics overview/dashboard data
 * @access  Admin
 */
router.get('/overview', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - parseInt(days));

    // Get counts for each event type
    const eventCounts = await Analytics.aggregate([
      {
        $match: {
          timestamp: { $gte: dateFrom }
        }
      },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get daily trend for searches
    const dailySearches = await Analytics.aggregate([
      {
        $match: {
          eventType: 'search',
          timestamp: { $gte: dateFrom }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          count: 1
        }
      }
    ]);

    // Get top categories searched/viewed
    const topCategories = await Analytics.aggregate([
      {
        $match: {
          category: { $exists: true, $ne: null, $ne: '' },
          timestamp: { $gte: dateFrom }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          count: 1
        }
      }
    ]);

    const overview = {
      eventCounts: eventCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      dailySearches,
      topCategories
    };

    res.json({
      success: true,
      overview
    });
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics overview',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/analytics/calculator-usage
 * @desc    Get calculator usage statistics
 * @access  Admin
 */
router.get('/calculator-usage', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - parseInt(days));

    const calculatorStats = await Analytics.aggregate([
      {
        $match: {
          eventType: 'calculator_use',
          timestamp: { $gte: dateFrom }
        }
      },
      {
        $group: {
          _id: null,
          totalUsage: { $sum: 1 },
          avgArea: { $avg: '$metadata.area' },
          avgFloors: { $avg: '$metadata.floors' },
          avgCost: { $avg: '$metadata.totalCost' },
          totalEstimatedValue: { $sum: '$metadata.totalCost' }
        }
      }
    ]);

    // Daily usage trend
    const dailyUsage = await Analytics.aggregate([
      {
        $match: {
          eventType: 'calculator_use',
          timestamp: { $gte: dateFrom }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          count: { $sum: 1 },
          avgCost: { $avg: '$metadata.totalCost' }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          count: 1,
          avgCost: { $round: ['$avgCost', 2] }
        }
      }
    ]);

    res.json({
      success: true,
      stats: calculatorStats[0] || {
        totalUsage: 0,
        avgArea: 0,
        avgFloors: 0,
        avgCost: 0,
        totalEstimatedValue: 0
      },
      dailyUsage
    });
  } catch (error) {
    console.error('Error fetching calculator usage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch calculator usage',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/analytics/city-prices/:city
 * @desc    Get average material prices for a city
 * @access  Public
 */
router.get('/city-prices/:city', async (req, res) => {
  try {
    const { city } = req.params;
    const Merchant = require('../models/Merchant');
    const Product = require('../models/Product');

    // Find merchants in this city
    const merchants = await Merchant.find({
      'businessAddress.city': new RegExp(city, 'i'),
      activeStatus: 'approved',
      isActive: true
    }).select('_id');

    if (merchants.length === 0) {
      return res.json({
        success: true,
        city,
        merchantCount: 0,
        prices: null,
        message: 'No merchants found in this city'
      });
    }

    const merchantIds = merchants.map(m => m._id);

    // Get average prices for common construction materials
    const materials = {
      cement: ['cement', 'opc', 'ppc'],
      steel: ['steel', 'tmt', 'bar', 'rod'],
      sand: ['sand', 'm-sand', 'msand'],
      aggregate: ['aggregate', 'stone', 'gravel', 'jalli'],
      bricks: ['brick', 'red brick']
    };

    const prices = {};

    for (const [material, keywords] of Object.entries(materials)) {
      const regex = new RegExp(keywords.join('|'), 'i');

      const products = await Product.find({
        merchant: { $in: merchantIds },
        $or: [
          { name: regex },
          { category: regex }
        ],
        isActive: true
      }).select('price name');

      if (products.length > 0) {
        const priceValues = products.map(p => p.price).filter(p => p > 0);
        if (priceValues.length > 0) {
          prices[material] = {
            avg: Math.round(priceValues.reduce((a, b) => a + b, 0) / priceValues.length),
            min: Math.min(...priceValues),
            max: Math.max(...priceValues),
            count: priceValues.length,
            brands: products.map(p => p.name).filter((name, index, self) => self.indexOf(name) === index).slice(0, 5) // Unique product names, max 5
          };
        }
      }
    }

    // Add default prices if no products found for a material
    const defaults = {
      cement: { avg: 350, min: 340, max: 360 },
      steel: { avg: 72, min: 70, max: 75 },
      sand: { avg: 40, min: 38, max: 42 },
      aggregate: { avg: 70, min: 65, max: 75 },
      bricks: { avg: 10000, min: 9500, max: 10500 }
    };

    Object.keys(defaults).forEach(material => {
      if (!prices[material]) {
        prices[material] = { ...defaults[material], count: 0 };
      }
    });

    res.json({
      success: true,
      city,
      merchantCount: merchants.length,
      lastUpdated: new Date(),
      prices
    });
  } catch (error) {
    console.error('Error fetching city prices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch city prices',
      error: error.message
    });
  }
});

module.exports = router;
