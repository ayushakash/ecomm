/**
 * Delivery hours helper.
 *
 * Orders are accepted 24x7, but actual delivery only happens during the
 * delivery window (default 8 AM - 7 PM) for all merchants. When a customer
 * orders outside this window, we still accept the order but inform them that
 * delivery will happen in the next window.
 */

// Delivery window in 24h hours. 8 => 08:00, 19 => 19:00 (7 PM).
export const DELIVERY_START_HOUR = 8;
export const DELIVERY_END_HOUR = 19;

export const DELIVERY_WINDOW_LABEL = '8 AM – 7 PM';

/**
 * Is the given time inside the delivery window?
 * @param {Date} [date=new Date()]
 * @returns {boolean}
 */
export const isWithinDeliveryHours = (date = new Date()) => {
  const hour = date.getHours();
  return hour >= DELIVERY_START_HOUR && hour < DELIVERY_END_HOUR;
};

/**
 * Customer-facing message describing when their order will be delivered,
 * given the current time is outside the delivery window.
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export const getDeliveryWindowMessage = (date = new Date()) => {
  const hour = date.getHours();
  if (hour < DELIVERY_START_HOUR) {
    // Ordered very early morning -> delivered same day once the window opens
    return `We accept orders 24×7, but deliveries run ${DELIVERY_WINDOW_LABEL}. Your order will be delivered today after 8 AM.`;
  }
  // Ordered in the evening/night -> delivered next morning
  return `We accept orders 24×7, but deliveries run ${DELIVERY_WINDOW_LABEL}. Since it's past delivery hours, your order will be delivered tomorrow from 8 AM.`;
};
