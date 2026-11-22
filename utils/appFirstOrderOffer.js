/**
 * "App पर पहले ऑर्डर पर ₹50 छूट" — flat ₹50 off a customer's first order placed
 * from the Android app when the items subtotal is at least ₹1,000.
 *
 * The server is authoritative: eligibility is always recomputed here, never
 * taken from the client. The `X-Client: app` header is trusted ONLY to tag the
 * order source for this promo.
 *
 * Money flow: the platform funds the discount. GST and merchant payouts are
 * unchanged; utils/merchantPayoutUtils.js reduces the COD the merchant collects
 * and the amount the merchant owes the platform by the same promo share.
 */
const Order = require('../models/Order');

const APP_FIRST_ORDER_DISCOUNT = 50;
const APP_FIRST_ORDER_MIN_SUBTOTAL = 1000;

/** 'app' when the request carries `X-Client: app`, else 'web'. */
function getOrderSource(req) {
  return String(req.get('X-Client') || '').trim().toLowerCase() === 'app' ? 'app' : 'web';
}

/** True when the customer has no earlier app order that counts (cancelled / payment-failed don't). */
async function hasNoPriorAppOrder(customerId) {
  const prior = await Order.exists({
    customerId,
    source: 'app',
    orderStatus: { $ne: 'cancelled' },
    paymentStatus: { $ne: 'failed' }
  });
  return !prior;
}

/**
 * Discount (₹) to apply to a checkout. `subtotal` is the items subtotal before
 * delivery/platform fee (calculateOrderTotals().subtotal).
 */
async function getAppFirstOrderDiscount({ source, customerId, subtotal }) {
  if (source !== 'app' || !customerId) return 0;
  if (!(subtotal >= APP_FIRST_ORDER_MIN_SUBTOTAL)) return 0;
  return (await hasNoPriorAppOrder(customerId)) ? APP_FIRST_ORDER_DISCOUNT : 0;
}

module.exports = {
  APP_FIRST_ORDER_DISCOUNT,
  APP_FIRST_ORDER_MIN_SUBTOTAL,
  getOrderSource,
  hasNoPriorAppOrder,
  getAppFirstOrderDiscount
};
