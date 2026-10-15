/**
 * Delivery hours helper.
 *
 * Orders are accepted 24x7, but actual delivery only happens during the
 * delivery window (default 8 AM - 7 PM) for all merchants. When a customer
 * orders outside this window, we still accept the order but inform them that
 * delivery will happen in the next window.
 */
import i18n from '../i18n';

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
    return i18n.t('checkout:deliveryWindow.early', { window: DELIVERY_WINDOW_LABEL });
  }
  // Ordered in the evening/night -> delivered next morning
  return i18n.t('checkout:deliveryWindow.late', { window: DELIVERY_WINDOW_LABEL });
};
