/**
 * Merchant Payout Calculation Utility
 *
 * Handles calculation of merchant payouts for multi-merchant orders
 * Splits delivery fees and platform fees proportionally
 */

/**
 * Calculate merchant-specific payout breakdown
 * @param {Object} order - The order object
 * @param {String} merchantId - Merchant ID to calculate payout for
 * @returns {Object} Payout breakdown
 */
async function calculateMerchantPayout(order, merchantId) {
  console.log(`\n🔍 calculateMerchantPayout called for order ${order?.orderNumber}, merchant ${merchantId}`);

  if (!order || !order.items || order.items.length === 0) {
    console.log('❌ No order or items');
    return null;
  }

  console.log(`   Order has ${order.items.length} total items`);

  // Debug: Log first item's assignedMerchantId type
  if (order.items[0]) {
    console.log(`   First item assignedMerchantId type:`, typeof order.items[0].assignedMerchantId);
    console.log(`   First item assignedMerchantId value:`, order.items[0].assignedMerchantId);
  }

  // Filter items for this merchant
  // Handle both populated (object with _id) and unpopulated (ObjectId) cases
  const merchantItems = order.items.filter(item => {
    if (!item.assignedMerchantId) return false;

    // If populated (object), compare _id
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

  // Calculate merchant's item values
  const itemsCustomerValue = merchantItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

  // Calculate base value - if merchantTotalPrice not set, fetch from MerchantProduct
  let itemsBaseValue = 0;

  for (const item of merchantItems) {
    if (item.merchantTotalPrice) {
      // Use stored merchant price if available
      itemsBaseValue += item.merchantTotalPrice;
    } else {
      // Fetch merchant price from MerchantProduct table
      const MerchantProduct = require('../models/MerchantProduct');
      const merchantProduct = await MerchantProduct.findOne({
        merchantId: merchantId,
        productId: item.productId
      });

      if (merchantProduct && merchantProduct.price) {
        itemsBaseValue += merchantProduct.price * item.quantity;
      } else {
        // Fallback: assume merchant gets 80% of customer price
        itemsBaseValue += (item.totalPrice || 0) * 0.80;
      }
    }
  }

  // Calculate total order customer value (for proportional split)
  const totalOrderCustomerValue = order.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

  // Calculate merchant's share percentage
  const merchantSharePercent = totalOrderCustomerValue > 0
    ? (itemsCustomerValue / totalOrderCustomerValue)
    : 0;

  // Calculate proportional delivery share (merchant keeps 100% of delivery charges)
  const deliveryShare = Math.round((order.deliveryCharge || 0) * merchantSharePercent);

  // Calculate proportional platform fee share
  const platformFeeShare = Math.round((order.platformFee || 0) * merchantSharePercent);

  // Calculate proportional tax share (for display purposes only)
  const taxShare = Math.round((order.tax || 0) * merchantSharePercent);

  // Calculate platform commission (markup on merchant's items)
  const platformCommission = itemsCustomerValue - itemsBaseValue;

  // FIXED: Calculate COD collection amount for THIS MERCHANT ONLY
  // COD amount = merchant's items + their share of delivery + their share of platform fee
  // NOTE: Tax is NOT added separately because it's already included in itemsCustomerValue
  // (either inclusive in price or added via order.totalAmount for exclusive mode)
  const codCollectionAmount = itemsCustomerValue + deliveryShare + platformFeeShare;

  // Amount merchant owes back to platform
  // - Commission (markup on items)
  // - Platform fee (merchant collects but must remit to platform)
  // NOTE: Delivery charges are NOT included - merchant keeps 100%
  // NOTE: Tax is NOT included - it's already part of item prices or handled separately
  const amountOwePlatform = platformCommission + platformFeeShare;

  // Net payout to merchant = COD collected - amount owe platform
  // = (itemsCustomerValue + deliveryShare + platformFeeShare) - (platformCommission + platformFeeShare)
  // = itemsCustomerValue - platformCommission + deliveryShare
  // = itemsBaseValue + deliveryShare
  const netPayout = codCollectionAmount - amountOwePlatform;

  console.log(`\n📊 Merchant Payout Breakdown:`);
  console.log(`   Items Value (Customer Price): ₹${itemsCustomerValue.toFixed(2)} (includes GST)`);
  console.log(`   + Delivery Share (${Math.round(merchantSharePercent * 100)}%): ₹${deliveryShare.toFixed(2)} (merchant keeps 100%)`);
  console.log(`   + Platform Fee Share: ₹${platformFeeShare.toFixed(2)}`);
  console.log(`   = COD to Collect: ₹${codCollectionAmount.toFixed(2)}`);
  console.log(`   - Commission (markup): ₹${platformCommission.toFixed(2)}`);
  console.log(`   - Platform Fee to Remit: ₹${platformFeeShare.toFixed(2)}`);
  console.log(`   = Amount Owe Platform: ₹${amountOwePlatform.toFixed(2)}`);
  console.log(`   = Net Merchant Payout: ₹${netPayout.toFixed(2)} (base cost + delivery)`);

  // Create itemized bill for merchant
  const itemizedBill = {
    items: merchantItems.map(item => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice || (item.totalPrice / item.quantity),
      totalPrice: item.totalPrice,
      sku: item.sku
    })),
    subtotal: itemsCustomerValue, // Already includes GST
    deliveryCharge: deliveryShare, // Merchant keeps 100%
    platformFee: platformFeeShare, // Merchant must remit to platform
    tax: taxShare, // For display only - already included in subtotal
    totalAmount: codCollectionAmount // Total COD to collect from customer
  };

  return {
    merchantId,
    merchantItems,
    itemsCount: merchantItems.length,
    itemsBaseValue,           // What merchant gets for items (base cost)
    itemsCustomerValue,       // What customer pays for items (subtotal)
    deliveryShare,            // Merchant's share of delivery fee
    platformFeeShare,         // Merchant's share of platform fee
    taxShare,                 // Merchant's share of tax (GST)
    platformCommission,       // Platform's profit (markup)
    codCollectionAmount,      // Total COD merchant collects from customer
    amountOwePlatform,        // Total merchant owes to platform
    netPayout,                // Final amount merchant keeps (base value)
    merchantSharePercent: Math.round(merchantSharePercent * 100),
    itemizedBill              // Detailed bill for merchant to show customer
  };
}

/**
 * Calculate platform total earnings from an order
 * @param {Object} order - The order object
 * @returns {Object} Platform earnings breakdown
 */
async function calculatePlatformEarnings(order) {
  console.log(`\n💰 calculatePlatformEarnings for order ${order?.orderNumber}`);

  if (!order || !order.items || order.items.length === 0) {
    return {
      totalCommission: 0,
      deliveryRevenue: 0,
      platformFeeRevenue: 0,
      totalEarnings: 0,
      breakdown: []
    };
  }

  const breakdown = [];
  let totalCommission = 0;
  let deliveryRevenue = order.deliveryCharge || 0;
  let platformFeeRevenue = order.platformFee || 0;

  console.log(`   Order has ${order.items.length} items, delivery ₹${deliveryRevenue}, platform fee ₹${platformFeeRevenue}`);

  // Group items by merchant
  const merchantGroups = {};
  order.items.forEach(item => {
    const merchantId = item.assignedMerchantId?._id?.toString() || item.assignedMerchantId?.toString() || 'unassigned';
    if (!merchantGroups[merchantId]) {
      merchantGroups[merchantId] = [];
    }
    merchantGroups[merchantId].push(item);
  });

  // Calculate commission for each merchant (async to fetch merchant prices)
  const MerchantProduct = require('../models/MerchantProduct');

  for (const merchantId of Object.keys(merchantGroups)) {
    if (merchantId === 'unassigned') continue;

    const items = merchantGroups[merchantId];
    const customerValue = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

    // Calculate base value by fetching merchant prices
    let baseValue = 0;
    for (const item of items) {
      if (item.merchantTotalPrice) {
        baseValue += item.merchantTotalPrice;
      } else {
        // Fetch merchant price from database
        const merchantProduct = await MerchantProduct.findOne({
          merchantId: merchantId,
          productId: item.productId
        });

        if (merchantProduct && merchantProduct.price) {
          const itemBaseValue = merchantProduct.price * item.quantity;
          baseValue += itemBaseValue;
          console.log(`   ${item.productName}: Customer ₹${item.totalPrice}, Merchant ₹${itemBaseValue} (₹${merchantProduct.price} × ${item.quantity})`);
        } else {
          // Fallback: assume merchant gets 80% of customer price
          const fallbackValue = (item.totalPrice || 0) * 0.80;
          baseValue += fallbackValue;
          console.log(`   ${item.productName}: No merchant price found! Using fallback ₹${fallbackValue}`);
        }
      }
    }

    const commission = customerValue - baseValue;
    console.log(`   Merchant ${items[0]?.assignedMerchantName}: Customer ₹${customerValue}, Base ₹${baseValue}, Commission: ₹${commission}`);
    totalCommission += commission;

    breakdown.push({
      merchantId,
      merchantName: items[0]?.assignedMerchantName || 'Unknown',
      itemsCount: items.length,
      customerValue,
      baseValue,
      commission
    });
  }

  return {
    orderId: order._id,
    orderNumber: order.orderNumber,
    orderDate: order.createdAt,
    totalCommission,
    deliveryRevenue,
    platformFeeRevenue,
    totalEarnings: totalCommission + deliveryRevenue + platformFeeRevenue,
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
  const totalDeliveryRevenue = orderEarnings.reduce((sum, e) => sum + e.deliveryRevenue, 0);
  const totalPlatformFeeRevenue = orderEarnings.reduce((sum, e) => sum + e.platformFeeRevenue, 0);

  return {
    totalOrders: orders.length,
    totalCommission,
    totalDeliveryRevenue,
    totalPlatformFeeRevenue,
    totalEarnings: totalCommission + totalDeliveryRevenue + totalPlatformFeeRevenue,
    orders: orderEarnings
  };
}

module.exports = {
  calculateMerchantPayout,
  calculatePlatformEarnings,
  calculateTotalPlatformEarnings
};
