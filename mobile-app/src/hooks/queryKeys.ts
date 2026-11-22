import type { CartTotalsItemInput, OrderStatus, ProductQuery } from '../types/models';

/**
 * Single source of React Query keys. Invalidate by prefix, e.g.
 * `queryClient.invalidateQueries({ queryKey: queryKeys.ordersAll })`.
 */
export const queryKeys = {
  publicSettings: ['public-settings'] as const,
  banners: ['banners'] as const,
  categories: ['categories'] as const,
  availableCities: ['available-cities'] as const,
  productsAll: ['products'] as const,
  products: (query: ProductQuery) => ['products', query] as const,
  productsInfinite: (query: Omit<ProductQuery, 'page'>) => ['products', 'infinite', query] as const,
  product: (id: string) => ['product', id] as const,
  /** userId: totals include the per-customer app first-order discount, so guest/user prices differ. */
  cartTotals: (items: CartTotalsItemInput[], addressId?: string | null, userId?: string | null) =>
    ['cart-pricing', items, addressId ?? null, userId ?? null] as const,
  ordersAll: ['orders'] as const,
  /** Under ['orders'] so placing an order (ordersAll invalidation) and logout refresh it. */
  appOffer: ['orders', 'app-offer'] as const,
  orders: (params: { status?: OrderStatus; page?: number; limit?: number }) => ['orders', params] as const,
  ordersInfinite: (params: { status?: OrderStatus; limit?: number }) => ['orders', 'infinite', params] as const,
  order: (id: string) => ['order', id] as const,
  orderLifecycle: (id: string) => ['order', id, 'lifecycle'] as const,
  cityPrices: (city: string) => ['city-prices', city] as const,
};
