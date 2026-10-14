import Constants, { ExecutionEnvironment } from 'expo-constants';

type Extra = {
  apiUrl?: string;
  googleWebClientId?: string;
  bulkWhatsapp?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

/** Server origin, e.g. https://chardeevari.in or http://192.168.1.4:5000 (EXPO_PUBLIC_API_URL). */
export const API_ORIGIN = (extra.apiUrl || 'https://chardeevari.in').replace(/\/+$/, '');

/** Axios baseURL. All service paths are relative to this (no leading /api). */
export const API_BASE_URL = `${API_ORIGIN}/api`;

/** Google OAuth *web* client ID — idToken audience must match backend GOOGLE_CLIENT_ID. */
export const GOOGLE_WEB_CLIENT_ID = extra.googleWebClientId || '';

/** Fallback bulk-order WhatsApp number (settings.bulkOrderPhone wins). */
export const BULK_WHATSAPP_FALLBACK = extra.bulkWhatsapp || '';

/** Public website, used for share links. */
export const WEBSITE_URL = 'https://chardeevari.in';

/** True inside the Expo Go client, where custom native modules (Google Sign-In) are absent. */
export const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Make relative upload paths absolute; leave absolute URLs untouched. */
export const resolveImageUrl = (uri?: string | null): string | undefined => {
  if (!uri) return undefined;
  if (/^(https?:|data:|file:)/i.test(uri)) return uri;
  return `${API_ORIGIN}${uri.startsWith('/') ? '' : '/'}${uri}`;
};
