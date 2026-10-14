/**
 * Shared server-state hooks. Screens should use these instead of calling
 * useQuery directly for the same data so cache keys and options stay aligned.
 */
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useCart } from '../contexts/CartContext';
import { analyticsAPI, merchantAPI, orderAPI, productAPI, settingsAPI } from '../services/api';
import type { CartTotalsItemInput, OrderStatus, ProductQuery } from '../types/models';
import { queryKeys } from './queryKeys';

const TEN_MINUTES = 10 * 60 * 1000;
const FIVE_MINUTES = 5 * 60 * 1000;

/** GET /settings/public — bulkOrderPhone, callOrderPhone, minimumOrderValue, serviceAreasNote. */
export const usePublicSettings = () =>
  useQuery({ queryKey: queryKeys.publicSettings, queryFn: settingsAPI.getPublic, staleTime: TEN_MINUTES });

export const useCategories = () =>
  useQuery({ queryKey: queryKeys.categories, queryFn: productAPI.getCategories, staleTime: TEN_MINUTES });

export const useAvailableCities = () =>
  useQuery({
    queryKey: queryKeys.availableCities,
    queryFn: async () => (await merchantAPI.getAvailableCities()).cities ?? [],
    staleTime: TEN_MINUTES,
  });

/**
 * One page of products. Pass `merchantIds: activeMerchantIds` from useLocation()
 * (web Home: undefined = no filter). Keeps previous data while filters change.
 */
export const useProducts = (query: ProductQuery, options: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: queryKeys.products(query),
    queryFn: () => productAPI.getProducts(query),
    staleTime: FIVE_MINUTES,
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });

/** Infinite-scroll product list (FlatList onEndReached → fetchNextPage). Default 20 per page. */
export const useInfiniteProducts = (query: Omit<ProductQuery, 'page'>, options: { enabled?: boolean } = {}) =>
  useInfiniteQuery({
    queryKey: queryKeys.productsInfinite(query),
    queryFn: ({ pageParam }) => productAPI.getProducts({ limit: 20, ...query, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.currentPage < last.totalPages ? last.currentPage + 1 : undefined),
    staleTime: FIVE_MINUTES,
    enabled: options.enabled ?? true,
  });

export const useProduct = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.product(id ?? ''),
    queryFn: () => productAPI.getProduct(id as string),
    enabled: !!id,
    staleTime: FIVE_MINUTES,
  });

/**
 * Category id → first product photo in that category. Categories have no images
 * in the backend, so tiles show a real product instead of a generic icon.
 */
export const useCategoryCovers = () => {
  const { data } = useProducts({ limit: 100 });
  return useMemo(() => {
    const covers = new Map<string, string>();
    for (const p of data?.products ?? []) {
      const id = typeof p.category === 'string' ? p.category : p.category?._id;
      const img = p.images?.[0];
      if (id && img && !covers.has(id)) covers.set(id, img);
    }
    return covers;
  }, [data]);
};

/**
 * Server cart totals (GST split, delivery, platform fee) for the current cart.
 * Guests: omit addressId. Checkout: pass selectedAddress._id and area.
 */
export const useCartTotals = ({ addressId, customerArea }: { addressId?: string | null; customerArea?: string | null } = {}) => {
  const { cart } = useCart();
  const items = useMemo<CartTotalsItemInput[]>(
    () => cart.map((item) => ({ productId: item._id, quantity: item.quantity, variantLabel: item.variantLabel || null })),
    [cart],
  );
  return useQuery({
    queryKey: queryKeys.cartTotals(items, addressId),
    queryFn: () => orderAPI.calculateCartTotals(items, customerArea ?? null, addressId ?? null),
    enabled: items.length > 0,
    placeholderData: keepPreviousData,
  });
};

export const useOrders = (params: { status?: OrderStatus; page?: number; limit?: number } = {}, enabled = true) =>
  useQuery({ queryKey: queryKeys.orders(params), queryFn: () => orderAPI.getOrders(params), enabled });

export const useOrder = (id: string) =>
  useQuery({ queryKey: queryKeys.order(id), queryFn: () => orderAPI.getOrder(id), enabled: !!id });

export const useOrderLifecycle = (id: string, enabled = true) =>
  useQuery({
    queryKey: queryKeys.orderLifecycle(id),
    queryFn: async () => (await orderAPI.getOrderLifecycle(id)).order.lifecycle,
    enabled: enabled && !!id,
  });

/** Paginated order history (FlatList onEndReached → fetchNextPage). `status` filters by item status server-side. */
export const useInfiniteOrders = (params: { status?: OrderStatus; limit?: number } = {}) =>
  useInfiniteQuery({
    queryKey: queryKeys.ordersInfinite(params),
    queryFn: ({ pageParam }) => orderAPI.getOrders({ limit: 10, ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.currentPage < last.totalPages ? last.currentPage + 1 : undefined),
  });

/** GET /analytics/city-prices/:city — calculator market prices (silent; caller falls back to standard rates). */
export const useCityPrices = (city: string | null | undefined, enabled = true) =>
  useQuery({
    queryKey: queryKeys.cityPrices(city ?? ''),
    queryFn: () => analyticsAPI.getCityPrices(city as string),
    enabled: enabled && !!city,
    staleTime: TEN_MINUTES,
  });
