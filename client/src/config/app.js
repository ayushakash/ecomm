// Android app listing on Google Play. The public settings endpoint does not
// expose the admin "App Link" (chardeevari.in/app redirect), so the website
// links straight to the store listing.
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=in.chardeevari.app';

/** Play link with an install referrer so installs are attributed to the website placement. */
export const playStoreLink = (medium) =>
  `${PLAY_STORE_URL}&referrer=utm_source%3Dwebsite%26utm_medium%3D${medium}`;
