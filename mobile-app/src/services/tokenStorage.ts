import * as SecureStore from 'expo-secure-store';
import type { AuthTokens } from '../types/models';

const ACCESS_KEY = 'chardeevari.accessToken';
const REFRESH_KEY = 'chardeevari.refreshToken';

/** In-memory mirror so the axios interceptor reads tokens synchronously. */
let cache: AuthTokens | null = null;

export const tokenStorage = {
  /** Hydrate the cache from SecureStore; call once at startup (AuthProvider). */
  async load(): Promise<AuthTokens | null> {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
    ]);
    cache = accessToken && refreshToken ? { accessToken, refreshToken } : null;
    return cache;
  },
  get(): AuthTokens | null {
    return cache;
  },
  async set(tokens: AuthTokens): Promise<void> {
    cache = tokens;
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken),
      SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken),
    ]);
  },
  async clear(): Promise<void> {
    cache = null;
    await Promise.all([SecureStore.deleteItemAsync(ACCESS_KEY), SecureStore.deleteItemAsync(REFRESH_KEY)]);
  },
};
