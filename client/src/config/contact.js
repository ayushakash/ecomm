// Single source for the business phone shown on the site. Must match the
// Google Business Profile exactly (NAP consistency for local SEO).
// Override per build with REACT_APP_BUSINESS_PHONE (10-digit Indian mobile).
const DIGITS = (process.env.REACT_APP_BUSINESS_PHONE || '9241514013').replace(/\D/g, '').slice(-10);

/** "+91 92415 14013" for display. */
export const BUSINESS_PHONE_LABEL = `+91 ${DIGITS.slice(0, 5)} ${DIGITS.slice(5)}`;
/** "+919241514013" for tel: links. */
export const BUSINESS_PHONE_TEL = `+91${DIGITS}`;
/** "+91-9241514013" for schema.org telephone. */
export const BUSINESS_PHONE_SCHEMA = `+91-${DIGITS}`;
/** "919241514013" for wa.me links. */
export const BUSINESS_PHONE_WA = `91${DIGITS}`;

/** Store pin as on Google Maps (Kadru, Ranchi). */
export const BUSINESS_GEO = { latitude: 23.3570551, longitude: 85.3129647 };
