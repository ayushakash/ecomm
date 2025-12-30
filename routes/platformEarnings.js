const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { calculateTotalPlatformEarnings } = require('../utils/merchantPayoutUtils');

/**
 * GET /api/platform-earnings
 * Get platform earnings with date filters
 */
router.get('/', [verifyToken, requireAdmin], async (req, res) => {
  try {
    const { startDate, endDate, period = 'day' } = req.query;

    // Build date filter
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // End of day
        dateFilter.createdAt.$lte = end;
      }
    } else {
      // Default to current month if no dates provided
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter.createdAt = { $gte: startOfMonth };
    }

    // Fetch orders with delivered status (only count completed orders)
    const orders = await Order.find({
      ...dateFilter,
      orderStatus: { $in: ['delivered', 'processing', 'shipped'] } // Include all revenue-generating statuses
    })
      .populate('items.assignedMerchantId', 'name businessName')
      .sort({ createdAt: -1 });

    // Calculate earnings
    const earnings = await calculateTotalPlatformEarnings(orders);

    // Group by period (day/month/year)
    let groupedEarnings = [];
    if (period === 'day') {
      const dayGroups = {};
      orders.forEach(order => {
        const day = new Date(order.createdAt).toISOString().split('T')[0];
        if (!dayGroups[day]) {
          dayGroups[day] = [];
        }
        dayGroups[day].push(order);
      });

      groupedEarnings = await Promise.all(
        Object.keys(dayGroups).map(async (day) => {
          const dayEarnings = await calculateTotalPlatformEarnings(dayGroups[day]);
          return {
            period: day,
            ...dayEarnings
          };
        })
      );
      groupedEarnings.sort((a, b) => new Date(b.period) - new Date(a.period));
    } else if (period === 'month') {
      const monthGroups = {};
      orders.forEach(order => {
        const month = new Date(order.createdAt).toISOString().slice(0, 7); // YYYY-MM
        if (!monthGroups[month]) {
          monthGroups[month] = [];
        }
        monthGroups[month].push(order);
      });

      groupedEarnings = await Promise.all(
        Object.keys(monthGroups).map(async (month) => {
          const monthEarnings = await calculateTotalPlatformEarnings(monthGroups[month]);
          return {
            period: month,
            ...monthEarnings
          };
        })
      );
      groupedEarnings.sort((a, b) => b.period.localeCompare(a.period));
    }

    res.json({
      success: true,
      period,
      totalEarnings: earnings,
      groupedEarnings,
      dateRange: {
        start: startDate || dateFilter.createdAt?.$gte?.toISOString(),
        end: endDate || new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Platform earnings error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * GET /api/platform-earnings/summary
 * Get quick summary of platform earnings
 */
router.get('/summary', [verifyToken, requireAdmin], async (req, res) => {
  try {
    const now = new Date();

    // Today's earnings
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayOrders = await Order.find({
      createdAt: { $gte: todayStart },
      orderStatus: { $in: ['delivered', 'processing', 'shipped'] }
    });
    const todayEarnings = await calculateTotalPlatformEarnings(todayOrders);

    // This month's earnings
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthOrders = await Order.find({
      createdAt: { $gte: monthStart },
      orderStatus: { $in: ['delivered', 'processing', 'shipped'] }
    });
    const monthEarnings = await calculateTotalPlatformEarnings(monthOrders);

    // Last month's earnings
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthOrders = await Order.find({
      createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
      orderStatus: { $in: ['delivered', 'processing', 'shipped'] }
    });
    const lastMonthEarnings = await calculateTotalPlatformEarnings(lastMonthOrders);

    // All time earnings
    const allOrders = await Order.find({
      orderStatus: { $in: ['delivered', 'processing', 'shipped'] }
    });
    const allTimeEarnings = await calculateTotalPlatformEarnings(allOrders);

    res.json({
      success: true,
      summary: {
        today: {
          orders: todayEarnings.totalOrders,
          earnings: todayEarnings.totalEarnings,
          commission: todayEarnings.totalCommission,
          deliveryRevenue: todayEarnings.totalDeliveryRevenue,
          platformFeeRevenue: todayEarnings.totalPlatformFeeRevenue
        },
        thisMonth: {
          orders: monthEarnings.totalOrders,
          earnings: monthEarnings.totalEarnings,
          commission: monthEarnings.totalCommission,
          deliveryRevenue: monthEarnings.totalDeliveryRevenue,
          platformFeeRevenue: monthEarnings.totalPlatformFeeRevenue
        },
        lastMonth: {
          orders: lastMonthEarnings.totalOrders,
          earnings: lastMonthEarnings.totalEarnings,
          commission: lastMonthEarnings.totalCommission,
          deliveryRevenue: lastMonthEarnings.totalDeliveryRevenue,
          platformFeeRevenue: lastMonthEarnings.totalPlatformFeeRevenue
        },
        allTime: {
          orders: allTimeEarnings.totalOrders,
          earnings: allTimeEarnings.totalEarnings,
          commission: allTimeEarnings.totalCommission,
          deliveryRevenue: allTimeEarnings.totalDeliveryRevenue,
          platformFeeRevenue: allTimeEarnings.totalPlatformFeeRevenue
        }
      }
    });
  } catch (error) {
    console.error('Platform earnings summary error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
