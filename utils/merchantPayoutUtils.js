/**
 * Merchant Payout Calculation Utility
 *
 * Handles calculation of merchant payouts for multi-merchant orders
 * Splits delivery fees and platform fees proportionally
 */

/**
 * Calculate merchant-specific payout breakdown using split GST
 * @param {Object} order - The order object with gstBreakdown
 * @param {String} merchantId - Merchant ID to calculate payout for
 * @returns {Object} Payout breakdown
 */
async function calculateMerchantPayout(order, merchantId) {
  console.log(`\n🔍 calculateMerchantPayout called for order ${order?.orderNumber}, merchant ${merchantId}`);

  if (!order || !order.items || order.items.length === 0) {
    console.log('❌ No order or items');
    return null;
  }

  // Extract GST breakdown from order
  const gstBreakdown = order.gstBreakdown || {};
  const deliverySplit = order.deliverySplit || {};
  const gstMode = gstBreakdown.mode || 'no-gst';

  console.log(`   Order has ${order.items.length} total items, GST mode: ${gstMode}`);

  // Filter items for this merchant
  const merchantItems = order.items.filter(item => {
    if (!item.assignedMerchantId) return false;
    const itemMerchantId = item.assignedMerchantId._id
      ? item.assignedMerchantId._id.toString()
      : item.assignedMerchantId.toString();
    return itemMerchantId === merchantId.toString();
  });

  console.log(`   Found ${merchantItems.length} items for this merchant`);

  if (merchantItems.length === 0) {
    console.log('❌ No items for this merchant');
    return null;
  }

  // Calculate merchant's base value (cost price)
  let itemsBaseValue = 0;
  let itemsCustomerValue = 0;

  for (const item of merchantItems) {
    // Merchant base cost
    if (item.merchantTotalPrice) {
      itemsBaseValue += item.merchantTotalPrice;
    } else if (item.merchantUnitPrice) {
      itemsBaseValue += item.merchantUnitPrice * item.quantity;
    } else {
      // Fetch from MerchantProduct
      const MerchantProduct = require('../models/MerchantProduct');
      const merchantProduct = await MerchantProduct.findOne({
        merchantId: merchantId,
        productId: item.productId
      });
      if (merchantProduct && merchantProduct.price) {
        itemsBaseValue += merchantProduct.price * item.quantity;
      } else {
        // Fallback: 80% of customer price
        itemsBaseValue += (item.totalPrice || 0) * 0.80;
      }
    }

    // Customer pays (what they see)
    itemsCustomerValue += item.totalPrice || 0;
  }

  // Calculate merchant's share percentage (for delivery/platform fee split)
  const totalOrderCustomerValue = order.subtotal || 0;
  const merchantSharePercent = totalOrderCustomerValue > 0
    ? (itemsCustomerValue / totalOrderCustomerValue)
    : 0;

  // Derive GST directly from actual item prices (not from stored gstBreakdown estimate)
  // This ensures the payout reflects the claiming merchant's real price, not the order-creation estimate
  let merchantGSTShare = 0;
  let platformGSTShare = 0;
  let platformCommission = 0;

  for (const item of merchantItems) {
    const itemMerchantPrice = item.merchantUnitPrice || (item.merchantTotalPrice ? item.merchantTotalPrice / item.quantity : 0);
    const itemCustomerPrice = item.unitPrice || 0;
    const itemGSTRate = (item.gstRate || 0) / 100;
    const qty = item.quantity || 1;

    if (gstMode === 'exclusive') {
      merchantGSTShare += itemMerchantPrice * itemGSTRate * qty;
      const commission = (itemCustomerPrice - itemMerchantPrice) * qty;
      platformCommission += commission;
      platformGSTShare += commission * itemGSTRate;
    } else if (gstMode === 'inclusive') {
      const merchantBase = itemMerchantPrice / (1 + itemGSTRate);
      merchantGSTShare += (itemMerchantPrice - merchantBase) * qty;
      const commission = (itemCustomerPrice - itemMerchantPrice) * qty;
      const commissionBase = commission / (1 + itemGSTRate);
      platformCommission += commissionBase * qty / qty; // normalised below
      platformGSTShare += (commission - commissionBase) * qty;
      // recalculate commission as base (exclusive) amount
      platformCommission = platformCommission - (commission - commissionBase) * qty / qty;
    } else {
      // no-gst
      platformCommission += (itemCustomerPrice - itemMerchantPrice) * qty;
    }
  }

  // Fix inclusive mode commission (above was getting confused, redo cleanly)
  if (gstMode === 'inclusive') {
    merchantGSTShare = 0; platformGSTShare = 0; platformCommission = 0;
    for (const item of merchantItems) {
      const mp = item.merchantUnitPrice || (item.merchantTotalPrice ? item.merchantTotalPrice / item.quantity : 0);
      const cp = item.unitPrice || 0;
      const rate = (item.gstRate || 0) / 100;
      const qty = item.quantity || 1;
      merchantGSTShare += (mp - mp / (1 + rate)) * qty;
      const comm = (cp - mp) * qty;
      platformGSTShare += comm - comm / (1 + rate);
      platformCommission += comm / (1 + rate);
    }
  }

  merchantGSTShare = Math.round(merchantGSTShare * 100) / 100;
  platformGSTShare = Math.round(platformGSTShare * 100) / 100;
  platformCommission = Math.round(platformCommission * 100) / 100;

  console.log(`\n🔍 Merchant share calculation (from actual item prices):`);
  console.log(`   Items Base Value: ₹${itemsBaseValue.toFixed(2)}`);
  console.log(`   Items Customer Value: ₹${itemsCustomerValue.toFixed(2)}`);
  console.log(`   Merchant Share Percent: ${(merchantSharePercent * 100).toFixed(2)}%`);

  // Calculate merchant's share of delivery fee and platform fee (proportional)
  const merchantDeliveryShare = deliverySplit.merchantShare
    ? Math.round(deliverySplit.merchantShare * merchantSharePercent * 100) / 100
    : Math.round((order.deliveryCharge || 0) * merchantSharePercent * 100) / 100;

  const platformFeeShare = Math.round((order.platformFee || 0) * merchantSharePercent * 100) / 100;

  // Calculate COD collection amount
  // Merchant collects FULL amount from customer, including platform's GST
  // Then owes platform back (commission + platform GST + platform fee)
  let codCollectionAmount;
  if (gstMode === 'exclusive') {
    codCollectionAmount = itemsCustomerValue + merchantGSTShare + platformGSTShare + merchantDeliveryShare + platformFeeShare;
  } else {
    codCollectionAmount = itemsCustomerValue + merchantDeliveryShare + platformFeeShare;
  }
  codCollectionAmount = Math.round(codCollectionAmount * 100) / 100;

  // Platform's share of delivery
  const platformDeliveryShare = deliverySplit.platformShare
    ? Math.round(deliverySplit.platformShare * merchantSharePercent * 100) / 100
    : 0;

  // Amount merchant owes platform
  const amountOwePlatform = Math.round((platformCommission + platformGSTShare + platformFeeShare + platformDeliveryShare) * 100) / 100;

  // Net payout to merchant
  const netPayout = Math.round((codCollectionAmount - amountOwePlatform) * 100) / 100;

  console.log(`\n📊 Merchant Payout Breakdown:`);
  console.log(`   Items Customer Value: ₹${itemsCustomerValue}`);
  console.log(`   Merchant GST Share: ₹${merchantGSTShare} (goes to govt)`);
  console.log(`   Delivery Share: ₹${merchantDeliveryShare}`);
  console.log(`   Platform Fee Share: ₹${platformFeeShare}`);
  console.log(`   COD to Collect: ₹${codCollectionAmount}`);
  console.log(`   Platform Commission: ₹${platformCommission}`);
  console.log(`   Platform GST Share: ₹${platformGSTShare}`);
  console.log(`   Platform Delivery Share: ₹${platformDeliveryShare}`);
  console.log(`   🚨 Amount Owe Platform: ₹${amountOwePlatform}`);
  console.log(`   ✅ Net Merchant Payout: ₹${netPayout}`);

  // Create itemized bill
  const itemizedBill = {
    items: merchantItems.map(item => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice || 0,
      totalPrice: item.totalPrice || 0,
      sku: item.sku
    })),
    subtotal: itemsCustomerValue,
    gst: merchantGSTShare,
    deliveryCharge: merchantDeliveryShare,
    platformFee: platformFeeShare,
    totalAmount: codCollectionAmount
  };

  return {
    merchantId,
    merchantItems,
    itemsCount: merchantItems.length,
    itemsBaseValue: Math.round(itemsBaseValue * 100) / 100,
    itemsCustomerValue: Math.round(itemsCustomerValue * 100) / 100,
    merchantGSTShare,
    deliveryShare: merchantDeliveryShare,
    platformFeeShare,
    platformCommission: Math.round(platformCommission * 100) / 100,
    platformGSTShare,
    platformDeliveryShare,
    codCollectionAmount,
    amountOwePlatform,
    netPayout,
    merchantSharePercent: Math.round(merchantSharePercent * 100),
    gstMode,
    isDummyGST: gstBreakdown.isDummyGST || false,
    itemizedBill
  };
}

/**
 * Calculate platform total earnings from an order using split GST
 * @param {Object} order - The order object with gstBreakdown
 * @returns {Object} Platform earnings breakdown
 */
async function calculatePlatformEarnings(order) {
  console.log(`\n💰 calculatePlatformEarnings for order ${order?.orderNumber}`);

  if (!order || !order.items || order.items.length === 0) {
    return {
      totalCommission: 0,
      platformGSTRevenue: 0,
      deliveryRevenue: 0,
      platformFeeRevenue: 0,
      totalEarnings: 0,
      breakdown: []
    };
  }

  const gstBreakdown = order.gstBreakdown || {};
  const deliverySplit = order.deliverySplit || {};

  // Platform's revenue from GST
  const platformGSTRevenue = gstBreakdown.platformGST || 0;

  // Platform's share of delivery fees
  const deliveryRevenue = deliverySplit.platformShare || 0;

  // Platform fee revenue (full amount goes to platform)
  const platformFeeRevenue = order.platformFee || 0;

  console.log(`   Order Total: ₹${order.totalAmount}`);
  console.log(`   Platform GST: ₹${platformGSTRevenue}`);
  console.log(`   Platform Delivery Share: ₹${deliveryRevenue}`);
  console.log(`   Platform Fee: ₹${platformFeeRevenue}`);

  // Calculate commission per merchant
  const breakdown = [];
  let totalCommission = 0;

  // Group items by merchant
  const merchantGroups = {};
  order.items.forEach(item => {
    const merchantId = item.assignedMerchantId?._id?.toString() || item.assignedMerchantId?.toString() || 'unassigned';
    if (!merchantGroups[merchantId]) {
      merchantGroups[merchantId] = [];
    }
    merchantGroups[merchantId].push(item);
  });

  for (const merchantId of Object.keys(merchantGroups)) {
    if (merchantId === 'unassigned') continue;

    const items = merchantGroups[merchantId];
    let customerValue = 0;
    let baseValue = 0;

    for (const item of items) {
      customerValue += item.totalPrice || 0;

      // Get merchant base cost
      if (item.merchantTotalPrice) {
        baseValue += item.merchantTotalPrice;
      } else if (item.merchantUnitPrice) {
        baseValue += item.merchantUnitPrice * item.quantity;
      } else {
        const MerchantProduct = require('../models/MerchantProduct');
        const merchantProduct = await MerchantProduct.findOne({
          merchantId: merchantId,
          productId: item.productId
        });
        if (merchantProduct && merchantProduct.price) {
          baseValue += merchantProduct.price * item.quantity;
        } else {
          baseValue += (item.totalPrice || 0) * 0.80;
        }
      }
    }

    // Commission is markup (customer price - merchant cost)
    // In inclusive mode, need to subtract GST to get base commission
    let commission;
    const gstMode = gstBreakdown.mode || 'no-gst';

    if (gstMode === 'inclusive') {
      // Calculate merchant's share percentage for this merchant
      const merchantShare = (order.subtotal > 0) ? (customerValue / order.subtotal) : 0;
      const merchantGST = Math.round((gstBreakdown.merchantGST || 0) * merchantShare * 100) / 100;
      const platformGST = Math.round((gstBreakdown.platformGST || 0) * merchantShare * 100) / 100;
      const totalBase = customerValue - merchantGST - platformGST;
      commission = totalBase - baseValue;
    } else {
      commission = customerValue - baseValue;
    }
    totalCommission += commission;

    console.log(`   Merchant ${items[0]?.assignedMerchantName}:`);
    console.log(`     Customer Value: ₹${customerValue}`);
    console.log(`     Base Value: ₹${baseValue}`);
    console.log(`     Commission: ₹${commission}`);

    breakdown.push({
      merchantId,
      merchantName: items[0]?.assignedMerchantName || 'Unknown',
      itemsCount: items.length,
      customerValue,
      baseValue,
      commission
    });
  }

  const totalEarnings = totalCommission + platformGSTRevenue + deliveryRevenue + platformFeeRevenue;

  console.log(`\n💰 Platform Total Earnings: ₹${totalEarnings}`);
  console.log(`   Commission: ₹${totalCommission}`);
  console.log(`   Platform GST: ₹${platformGSTRevenue}`);
  console.log(`   Delivery Share: ₹${deliveryRevenue}`);
  console.log(`   Platform Fee: ₹${platformFeeRevenue}`);

  return {
    orderId: order._id,
    orderNumber: order.orderNumber,
    orderDate: order.createdAt,
    totalCommission,
    platformGSTRevenue,
    deliveryRevenue,
    platformFeeRevenue,
    totalEarnings,
    gstMode: gstBreakdown.mode || 'no-gst',
    breakdown
  };
}

/**
 * Calculate total platform earnings for multiple orders
 * @param {Array} orders - Array of order objects
 * @returns {Object} Aggregated platform earnings
 */
async function calculateTotalPlatformEarnings(orders) {
  if (!orders || orders.length === 0) {
    return {
      totalOrders: 0,
      totalCommission: 0,
      totalDeliveryRevenue: 0,
      totalPlatformFeeRevenue: 0,
      totalEarnings: 0,
      orders: []
    };
  }

  // Use Promise.all to calculate earnings for all orders in parallel
  const orderEarnings = await Promise.all(
    orders.map(order => calculatePlatformEarnings(order))
  );

  const totalCommission = orderEarnings.reduce((sum, e) => sum + e.totalCommission, 0);
  const totalPlatformGSTRevenue = orderEarnings.reduce((sum, e) => sum + (e.platformGSTRevenue || 0), 0);
  const totalDeliveryRevenue = orderEarnings.reduce((sum, e) => sum + e.deliveryRevenue, 0);
  const totalPlatformFeeRevenue = orderEarnings.reduce((sum, e) => sum + e.platformFeeRevenue, 0);

  return {
    totalOrders: orders.length,
    totalCommission,
    totalPlatformGSTRevenue,
    totalDeliveryRevenue,
    totalPlatformFeeRevenue,
    totalEarnings: totalCommission + totalPlatformGSTRevenue + totalDeliveryRevenue + totalPlatformFeeRevenue,
    orders: orderEarnings
  };
}

module.exports = {
  calculateMerchantPayout,
  calculatePlatformEarnings,
  calculateTotalPlatformEarnings
};
