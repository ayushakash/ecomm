/**
 * REST client for the Express backend (routes/*.js under /api).
 * Port of client/src/services/api.js, customer surface only. Every function
 * resolves to the response BODY (never the axios response).
 */
import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../config';
import { toast } from '../utils/toast';
import { tokenStorage } from './tokenStorage';
import type {
  Address,
  AddressInput,
  AuthResponse,
  AuthTokens,
  AvailableCity,
  Banner,
  CalculatorLeadInput,
  CartTotals,
  CartTotalsItemInput,
  CityPricesResponse,
  Category,
  CityMaster,
  Coordinates,
  CreateOrderInput,
  CreateOrderResponse,
  DeliveryPreview,
  GeocodedPlace,
  GoogleAuthResponse,
  Merchant,
  NearbyMerchantsRequest,
  NearbyMerchantsResponse,
  Order,
  OrderLifecycleEvent,
  OrderListResponse,
  OrderStatus,
  PlaceSuggestion,
  PricingItemInput,
  Product,
  ProductListResponse,
  ProductQuery,
  PublicSettings,
  SendOtpResponse,
  User,
} from '../types/models';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Suppress the global error toast (caller handles/ignores the error). */
    silent?: boolean;
  }
}

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/** Extract the backend's message (`message` or express-validator `errors[0].msg`). */
export const getErrorMessage = (error: unknown, fallback = 'Something went wrong'): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: { msg?: string }[] } | undefined;
    if (data?.message) return data.message;
    if (data?.errors?.[0]?.msg) return data.errors[0].msg;
    if (!error.response) return 'Network error. Please check your connection.';
  }
  return fallback;
};

const sessionExpiredListeners = new Set<() => void>();

/** AuthContext subscribes to clear user state when refresh fails. Returns unsubscribe. */
export const onSessionExpired = (listener: () => void): (() => void) => {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
};

api.interceptors.request.use((config) => {
  const tokens = tokenStorage.get();
  if (tokens?.accessToken) config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  return config;
});

// Single-flight refresh: concurrent 401s share one /auth/refresh call.
let refreshInFlight: Promise<AuthTokens> | null = null;

const refreshTokens = (refreshToken: string): Promise<AuthTokens> => {
  refreshInFlight ??= axios
    .post<AuthTokens>(`${API_BASE_URL}/auth/refresh`, { refreshToken }, { timeout: 15000 })
    .then(async ({ data }) => {
      await tokenStorage.set({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      return data;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const tokens = tokenStorage.get();

    if (status === 401 && original && !original._retry && tokens?.refreshToken) {
      original._retry = true;
      try {
        const fresh = await refreshTokens(tokens.refreshToken);
        original.headers.Authorization = `Bearer ${fresh.accessToken}`;
        return api(original);
      } catch (refreshError) {
        await tokenStorage.clear();
        sessionExpiredListeners.forEach((listener) => listener());
        toast.info('Session expired', 'Please log in again.');
        return Promise.reject(refreshError);
      }
    }

    // Same policy as web: no toast for 404/422; callers may opt out with `silent`.
    if (!original?.silent && status !== 404 && status !== 422) {
      toast.error(getErrorMessage(error));
    }
    return Promise.reject(error);
  },
);

const SILENT: AxiosRequestConfig = { silent: true };

// ─── Auth (routes/auth.js) ───────────────────────────────────────────────────
// Auth calls are silent: AuthContext toasts its own contextual messages.
export const authAPI = {
  sendOtp: (phone: string) =>
    api.post<SendOtpResponse>('/auth/send-otp', { phone }, SILENT).then((r) => r.data),
  /** Existing user/merchant login. */
  verifyOtpLogin: (phone: string, otp: string) =>
    api.post<AuthResponse>('/auth/verify-otp-login', { phone, otp }, SILENT).then((r) => r.data),
  /** First-time user: creates a customer with `name` using the OTP from sendOtp. */
  verifyOtpRegister: (name: string, phone: string, otp: string) =>
    api.post<AuthResponse>('/auth/verify-otp-register', { name, phone, otp }, SILENT).then((r) => r.data),
  /** `credential` = Google ID token (audience = web client ID). */
  google: (credential: string) =>
    api.post<GoogleAuthResponse>('/auth/google', { credential }, SILENT).then((r) => r.data),
  sendLinkPhoneOtp: (phone: string) =>
    api
      .post<{ message: string; otp?: string }>('/auth/link-phone/send-otp', { phone }, SILENT)
      .then((r) => r.data),
  verifyLinkPhone: (phone: string, otp: string) =>
    api.post<{ message: string; user: User }>('/auth/link-phone/verify', { phone, otp }, SILENT).then((r) => r.data),
  sendChangeEmailOtp: (email: string) =>
    api
      .post<{ message: string; otp?: string }>('/auth/change-email/send-otp', { email }, SILENT)
      .then((r) => r.data),
  verifyChangeEmail: (email: string, otp: string) =>
    api.post<{ message: string; user: User }>('/auth/change-email/verify', { email, otp }, SILENT).then((r) => r.data),
  refresh: (refreshToken: string) =>
    api.post<AuthTokens>('/auth/refresh', { refreshToken }, SILENT).then((r) => r.data),
  me: () => api.get<{ user: User }>('/auth/me', SILENT).then((r) => r.data),
  logout: () => api.post<{ message: string }>('/auth/logout', undefined, SILENT).then((r) => r.data),
};

// ─── Users (routes/users.js) ─────────────────────────────────────────────────
export const userAPI = {
  getProfile: () => api.get<{ user: User }>('/users/profile').then((r) => r.data),
  updateProfile: (data: Partial<Pick<User, 'name' | 'email'>>) =>
    api.put<{ message: string; user: User }>('/users/profile', data, SILENT).then((r) => r.data),
  /** Permanently delete the signed-in customer's account (409 when orders are in progress). */
  deleteAccount: () =>
    api.delete<{ success: boolean; message: string }>('/users/me', { ...SILENT, data: { confirm: 'DELETE' } }).then((r) => r.data),
};

// ─── Merchants (routes/merchants.js) ─────────────────────────────────────────
export const merchantAPI = {
  getAvailableCities: () =>
    api
      .get<{ success: boolean; cities: AvailableCity[]; count: number }>('/merchants/available-cities', SILENT)
      .then((r) => r.data),
  /** Public when filtering by city + activeStatus=approved (guest city mode). */
  getMerchantsByCity: (city: string, state?: string) =>
    api
      .get<{ merchants: Merchant[] }>('/merchants', { params: { city, state, activeStatus: 'approved' }, silent: true })
      .then((r) => r.data),
  getNearbyMerchants: (body: NearbyMerchantsRequest) =>
    api.post<NearbyMerchantsResponse>('/merchants/nearby', body, SILENT).then((r) => r.data),
};

// ─── Products (routes/products.js) ───────────────────────────────────────────
export const productAPI = {
  getProducts: ({ merchantIds, ...params }: ProductQuery = {}) =>
    api
      .get<ProductListResponse>('/products', {
        params: { ...params, merchantIds: merchantIds?.length ? merchantIds.join(',') : undefined },
      })
      .then((r) => r.data),
  getProduct: (id: string) => api.get<Product>(`/products/${id}`).then((r) => r.data),
  getCategories: () => api.get<Category[]>('/products/categories').then((r) => r.data),
};

// ─── Orders (routes/orders.js) ───────────────────────────────────────────────
export const orderAPI = {
  /** Guest-accessible. addressId only honoured for logged-in users (city pricing). */
  calculateCartTotals: (items: CartTotalsItemInput[], customerArea?: string | null, addressId?: string | null) =>
    api
      .post<CartTotals>('/orders/calculate-cart-totals', { items, customerArea, addressId }, SILENT)
      .then((r) => r.data),
  createOrder: (body: CreateOrderInput) => api.post<CreateOrderResponse>('/orders', body).then((r) => r.data),
  getOrders: (params: { status?: OrderStatus; page?: number; limit?: number } = {}) =>
    api.get<OrderListResponse>('/orders', { params }).then((r) => r.data),
  getOrder: (id: string) => api.get<{ order: Order }>(`/orders/${id}`).then((r) => r.data.order),
  cancelOrder: (id: string) =>
    api.put<{ message: string; order: Order }>(`/orders/${id}/cancel`).then((r) => r.data),
  getOrderLifecycle: (orderId: string) =>
    api
      .get<{
        success: boolean;
        order: Pick<Order, 'orderNumber' | 'customerName' | 'orderStatus' | 'totalAmount'> & {
          lifecycle: OrderLifecycleEvent[];
        };
      }>(`/orders/${orderId}/lifecycle`)
      .then((r) => r.data),
};

// ─── Abandoned carts (routes/abandonedCarts.js) ──────────────────────────────
export const abandonedCartAPI = {
  /**
   * optionalAuth: token identifies users, guestId identifies guests. Always silent.
   * Conversion is server-side (POST /orders marks the cart converted) — no client call.
   */
  track: (
    cartItems: { productId: string; productName: string; variantLabel?: string; quantity: number; price: number }[],
    guestId: string,
  ) => api.post('/abandoned-carts/track', { cartItems, guestId }, SILENT).then((r) => r.data),
};

// ─── Settings (routes/settings.js) ───────────────────────────────────────────
export const settingsAPI = {
  getPublic: () => api.get<PublicSettings>('/settings/public', SILENT).then((r) => r.data),
  /** Auth required. */
  calculatePricing: (items: PricingItemInput[], customerData?: { distance?: number; area?: string }) =>
    api.post<CartTotals>('/settings/calculate-pricing', { items, customerData }).then((r) => r.data),
  /** Auth required. */
  getDeliveryPreview: () => api.get<DeliveryPreview>('/settings/delivery-preview').then((r) => r.data),
};

// ─── Addresses (routes/addresses.js) — all auth required ─────────────────────
export const addressAPI = {
  getAll: () => api.get<{ data: Address[] }>('/addresses').then((r) => r.data.data),
  get: (id: string) => api.get<{ data: Address }>(`/addresses/${id}`).then((r) => r.data.data),
  create: (body: AddressInput) => api.post<{ data: Address }>('/addresses', body).then((r) => r.data.data),
  update: (id: string, body: Partial<AddressInput>) =>
    api.put<{ data: Address }>(`/addresses/${id}`, body).then((r) => r.data.data),
  remove: (id: string) => api.delete<{ success: boolean; message: string }>(`/addresses/${id}`).then((r) => r.data),
  setDefault: (id: string) => api.put<{ data: Address }>(`/addresses/${id}/default`).then((r) => r.data.data),
  getDefault: () => api.get<{ data: Address | null }>('/addresses/default/get', SILENT).then((r) => r.data.data),
};

// ─── Geocoding (routes/geo.js — Ola Maps with OpenStreetMap fallback, public) ─
export const geoAPI = {
  reverse: ({ latitude, longitude }: Coordinates) =>
    api
      .get<{ success: boolean; place: GeocodedPlace }>('/geo/reverse', { ...SILENT, params: { lat: latitude, lng: longitude } })
      .then((r) => r.data.place),
  search: (q: string, near?: Coordinates) =>
    api
      .get<{ success: boolean; results: PlaceSuggestion[] }>('/geo/search', {
        ...SILENT,
        params: { q, lat: near?.latitude, lng: near?.longitude },
      })
      .then((r) => r.data.results),
};

// ─── Cities (routes/cities.js) ───────────────────────────────────────────────
export const cityAPI = {
  getAll: (params: { isActive?: boolean } = {}) =>
    api.get<{ success: boolean; cities: CityMaster[]; count: number }>('/cities', { params }).then((r) => r.data),
  /** Active CityMaster rows (admin-managed pricing cities). */
  getAvailable: () =>
    api
      .get<{ success: boolean; cities: { _id: string; city: string; state: string }[] }>('/cities/available', SILENT)
      .then((r) => r.data),
};

// ─── Calculator leads (routes/calculatorLeads.js) — public ───────────────────
export const calculatorLeadAPI = {
  create: (lead: CalculatorLeadInput) =>
    api.post<{ success: boolean; id: string }>('/calculator-leads', lead, SILENT).then((r) => r.data),
};

// ─── Banners (routes/banners.js) — public ────────────────────────────────────
export const bannerAPI = {
  /** Active, in-schedule offers for the home carousel. */
  getLive: () =>
    api.get<{ success: boolean; banners: Banner[] }>('/banners', SILENT).then((r) => r.data.banners),
};

// ─── Push tokens (routes/pushTokens.js) — customer auth required, always silent ──
export const pushAPI = {
  register: (token: string, platform: 'ios' | 'android') =>
    api.post<{ success: boolean }>('/push-tokens', { token, platform }, SILENT).then((r) => r.data),
  unregister: (token: string) =>
    api.delete<{ success: boolean }>('/push-tokens', { ...SILENT, data: { token } }).then((r) => r.data),
};

// ─── Analytics (routes/analytics.js) — public ─────────────────────────────────
export const analyticsAPI = {
  /** Average material prices from approved merchants in a city (calculator "Market price"). */
  getCityPrices: (city: string) =>
    api.get<CityPricesResponse>(`/analytics/city-prices/${encodeURIComponent(city)}`, SILENT).then((r) => r.data),
};

export default api;
