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

/** Store pin exactly as on the Google Business Profile (Kadru, Ranchi). */
export const BUSINESS_GEO = { latitude: 23.3571794, longitude: 85.3129745 };

// Name / address exactly as on the Google Business Profile. Every page that
// shows NAP (footer, /contact, /about) reads these constants.
export const BUSINESS_NAME = 'Chardeevari';
export const BUSINESS_ALT_NAMES = ['चारदीवारी', 'Char Deevari'];
export const BUSINESS_STREET = '217, Kadru, AG Colony';
export const BUSINESS_CITY = 'Ranchi';
export const BUSINESS_REGION = 'Jharkhand';
export const BUSINESS_POSTCODE = '834002';
/** "217, Kadru, AG Colony, Ranchi, Jharkhand 834002" */
export const BUSINESS_ADDRESS = `${BUSINESS_STREET}, ${BUSINESS_CITY}, ${BUSINESS_REGION} ${BUSINESS_POSTCODE}`;
export const BUSINESS_EMAIL = 'hello@chardeevari.in';

/** Google Maps listing (GBP CID). */
export const BUSINESS_MAPS_URL = 'https://maps.google.com/?cid=5686756681345402583';

/**
 * Opening hours (schema.org day names, 24h times). Single source for the
 * HardwareStore JSON-LD; must match the Google Business Profile hours.
 * Current value: Mon–Sat 09:00–18:00, Sunday closed.
 */
export const BUSINESS_HOURS = [
  { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '09:00', closes: '18:00' },
];

/** Localities we deliver to (≈5 km around each), in display order. */
export const SERVICE_AREAS = ['Kadru', 'Harmu', 'Ashok Nagar', 'Doranda'];

/** wa.me link with an optional prefilled message. */
export const whatsappLink = (text) =>
  `https://wa.me/${BUSINESS_PHONE_WA}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
