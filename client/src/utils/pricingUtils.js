/**
 * Pricing Utilities for GST Calculations
 * Handles inclusive/exclusive pricing based on platform settings
 */

/**
 * Calculate display price based on GST display mode
 * @param {Number} basePrice - Admin set price (base price)
 * @param {Number} gstRate - GST rate in percentage (0, 5, 12, 18, 28)
 * @param {String} displayMode - 'inclusive' or 'exclusive'
 * @returns {Object} { displayPrice, gstAmount, totalPrice, breakdown }
 */
export const calculateDisplayPrice = (basePrice, gstRate = 18, displayMode = 'exclusive') => {
  const gstAmount = Math.round(basePrice * (gstRate / 100));
  const totalPrice = basePrice + gstAmount;

  if (displayMode === 'inclusive') {
    return {
      displayPrice: totalPrice, // Show total price
      gstAmount,
      basePrice,
      totalPrice,
      breakdown: `₹${totalPrice} (incl. ${gstRate}% GST)`,
      showGstSeparately: false
    };
  } else {
    return {
      displayPrice: basePrice, // Show base price
      gstAmount,
      basePrice,
      totalPrice,
      breakdown: `₹${basePrice} + ₹${gstAmount} GST`,
      showGstSeparately: true
    };
  }
};

/**
 * Calculate cart totals with per-item GST
 * @param {Array} cartItems - Cart items with product details
 * @returns {Object} Cart totals breakdown
 */
export const calculateCartTotals = (cartItems) => {
  let subtotal = 0;
  let totalGst = 0;
  const itemBreakdowns = [];

  cartItems.forEach(item => {
    const basePrice = item.price || 0;
    const gstRate = item.gstRate || 18;
    const quantity = item.quantity || 1;

    const itemBaseTotal = basePrice * quantity;
    const itemGst = Math.round(itemBaseTotal * (gstRate / 100));
    const itemTotal = itemBaseTotal + itemGst;

    subtotal += itemBaseTotal;
    totalGst += itemGst;

    itemBreakdowns.push({
      productId: item._id,
      productName: item.name,
      quantity,
      basePrice,
      gstRate,
      itemBaseTotal,
      itemGst,
      itemTotal
    });
  });

  return {
    subtotal,
    totalGst,
    grandTotal: subtotal + totalGst,
    itemBreakdowns
  };
};

/**
 * Format price for display
 * @param {Number} price
 * @param {Boolean} includeCurrency
 * @returns {String}
 */
export const formatPrice = (price, includeCurrency = true) => {
  const formatted = Math.round(price).toLocaleString('en-IN');
  return includeCurrency ? `₹${formatted}` : formatted;
};
