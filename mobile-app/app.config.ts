import type { ConfigContext, ExpoConfig } from 'expo/config';

const WHITE = '#ffffff';

// Public values copied from client/.env — safe to ship (OAuth web client IDs
// and WhatsApp numbers are public). Override per build via EXPO_PUBLIC_* env.
const DEFAULT_API_URL = 'https://chardeevari.in';
const GOOGLE_WEB_CLIENT_ID =
  '442854886009-iuumbp8cmcch1i5ac859at44e7o6e5p8.apps.googleusercontent.com';
const BULK_WHATSAPP = '916201176610';

// iOS Google Sign-In needs the reversed iOS OAuth client ID as a URL scheme.
// Android needs no plugin (autolinked; only the SHA-1-bound Android OAuth client).
const GOOGLE_IOS_URL_SCHEME = process.env.GOOGLE_IOS_URL_SCHEME;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Chardeevari',
  slug: 'chardeevari',
  scheme: 'chardeevari',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'in.chardeevari.app',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Chardeevari uses your location to show stores that deliver to you.',
    },
  },
  android: {
    package: 'in.chardeevari.app',
    // EAS builds get the file from the GOOGLE_SERVICES_JSON file env var (it's gitignored).
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      monochromeImage: './assets/adaptive-icon-monochrome.png',
      backgroundColor: WHITE,
    },
    predictiveBackGestureEnabled: false,
    permissions: ['android.permission.ACCESS_COARSE_LOCATION', 'android.permission.ACCESS_FINE_LOCATION'],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-image',
    'expo-sharing',
    'expo-status-bar',
    'expo-font',
    'expo-secure-store',
    ['expo-notifications', { color: '#F18C34' }],
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 220,
        resizeMode: 'contain',
        backgroundColor: WHITE,
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Chardeevari uses your location to show stores that deliver to you.',
      },
    ],
    ...(GOOGLE_IOS_URL_SCHEME
      ? [['@react-native-google-signin/google-signin', { iosUrlScheme: GOOGLE_IOS_URL_SCHEME }] as [string, object]]
      : []),
  ],
  // Over-the-air JS updates (`eas update --channel production`). The fingerprint
  // runtime only delivers an update to builds with the same native code.
  runtimeVersion: { policy: 'fingerprint' },
  updates: { url: 'https://u.expo.dev/cc419c24-5a3a-4637-8ce2-a58335e03a70' },
  extra: {
    eas: { projectId: 'cc419c24-5a3a-4637-8ce2-a58335e03a70' },
    apiUrl: process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL,
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || GOOGLE_WEB_CLIENT_ID,
    bulkWhatsapp: process.env.EXPO_PUBLIC_BULK_WHATSAPP || BULK_WHATSAPP,
  },
});
