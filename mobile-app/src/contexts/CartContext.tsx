/**
 * Cart state. Port of client/src/contexts/CartContext.js:
 * variant-aware cartKey, gstRate/gstType carried per line, city lock,
 * AsyncStorage persistence, and a silent 4 s-debounced mirror to
 * /abandoned-carts/track (guests identified by a persisted guestCartId).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { abandonedCartAPI, productAPI } from '../services/api';
import type { CartItem, Product, ProductVariant } from '../types/models';

const CART_KEY = 'chardeevari.cart';
const CART_CITY_KEY = 'chardeevari.cartCity';
const GUEST_ID_KEY = 'chardeevari.guestCartId';
const TRACK_DEBOUNCE_MS = 4000;

/** "productId_8mm" for variants, "productId" otherwise. */
export const buildCartKey = (productId: string, variantLabel?: string | null): string =>
  variantLabel ? `${productId}_${variantLabel}` : productId;

export interface CartContextValue {
  cart: CartItem[];
  /** City the cart was filled in; adding from another city should prompt a clear (see useAddToCart). */
  cartCity: string | null;
  /** False until AsyncStorage has been read. */
  isHydrated: boolean;
  /** Number of distinct lines (web getCartCount). Used for the tab badge. */
  cartCount: number;
  /** Sum of units across lines. */
  totalQuantity: number;
  /** Σ price × qty using cart prices (pre-GST/delivery; server totals are authoritative). */
  cartTotal: number;
  addToCart(product: Product, quantity?: number, city?: string | null, variant?: ProductVariant | null): void;
  removeFromCart(cartKey: string): void;
  /** quantity <= 0 removes the line. */
  updateQuantity(cartKey: string, quantity: number): void;
  clearCart(): void;
  setCartCityIfEmpty(city: string | null): void;
  getCartItem(productId: string, variantLabel?: string | null): CartItem | undefined;
  /** Any line (any variant) for this product. */
  isInCart(productId: string): boolean;
  /** Refresh line prices from GET /products/:id (web syncCartPrices). Returns #lines changed. */
  syncCartPrices(): Promise<number>;
}

const CartContext = createContext<CartContextValue | null>(null);

export const useCart = (): CartContextValue => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
};

async function getGuestId(): Promise<string> {
  let id = await AsyncStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = Crypto.randomUUID();
    await AsyncStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

const isCartArray = (value: unknown): value is CartItem[] =>
  Array.isArray(value) && value.every((i) => i && typeof i === 'object' && 'cartKey' in i && '_id' in i);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartCity, setCartCity] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [[, savedCart], [, savedCity]] = await AsyncStorage.multiGet([CART_KEY, CART_CITY_KEY]);
        const parsed: unknown = JSON.parse(savedCart ?? '[]');
        if (isCartArray(parsed)) {
          setCart(parsed);
          if (savedCity) setCartCity(savedCity);
        }
      } catch {
        // Corrupt storage → start empty.
      } finally {
        setIsHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    AsyncStorage.setItem(CART_KEY, JSON.stringify(cart)).catch(() => {});
    if (cartCity) AsyncStorage.setItem(CART_CITY_KEY, cartCity).catch(() => {});
    else AsyncStorage.removeItem(CART_CITY_KEY).catch(() => {});
  }, [cart, cartCity, isHydrated]);

  // Abandoned-cart mirror (silent, debounced; cleanup cancels the pending send).
  useEffect(() => {
    if (!isHydrated) return;
    const timer = setTimeout(async () => {
      const items = cart.map((item) => ({
        productId: item._id,
        productName: item.name,
        variantLabel: item.variantLabel || undefined,
        quantity: item.quantity,
        price: item.price,
      }));
      abandonedCartAPI.track(items, await getGuestId()).catch(() => {});
    }, TRACK_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [cart, isHydrated]);

  const addToCart = useCallback<CartContextValue['addToCart']>((product, quantity = 1, city = null, variant = null) => {
    const cartKey = buildCartKey(product._id, variant?.label);
    setCart((prev) => {
      if (prev.some((item) => item.cartKey === cartKey)) {
        return prev.map((item) => (item.cartKey === cartKey ? { ...item, quantity: item.quantity + quantity } : item));
      }
      return [
        ...prev,
        {
          cartKey,
          _id: product._id,
          name: product.name,
          variantLabel: variant?.label || null,
          price: variant ? variant.price : product.price,
          unit: product.unit,
          quantity,
          images: product.images || [],
          stock: variant ? variant.stock : product.totalStock ?? product.stock ?? 0,
          sku: variant?.sku || product.sku,
          weight: product.weight || 0,
          gstRate: product.gstRate,
          gstType: product.gstType,
        },
      ];
    });
    if (city) setCartCity((current) => current ?? city);
  }, []);

  const removeFromCart = useCallback((cartKey: string) => {
    setCart((prev) => prev.filter((item) => item.cartKey !== cartKey));
  }, []);

  const updateQuantity = useCallback((cartKey: string, quantity: number) => {
    setCart((prev) =>
      quantity <= 0
        ? prev.filter((item) => item.cartKey !== cartKey)
        : prev.map((item) => (item.cartKey === cartKey ? { ...item, quantity } : item)),
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCartCity(null);
  }, []);

  const setCartCityIfEmpty = useCallback((city: string | null) => {
    if (city) setCartCity((current) => current ?? city);
  }, []);

  const syncCartPrices = useCallback(async (): Promise<number> => {
    const ids = [...new Set(cart.map((item) => item._id))];
    if (ids.length === 0) return 0;
    const fresh = await Promise.all(ids.map((id) => productAPI.getProduct(id).catch(() => null)));
    const priceByKey: Record<string, number> = {};
    for (const item of cart) {
      const product = fresh.find((p) => p?._id === item._id);
      if (!product) continue;
      const variant = item.variantLabel ? product.variants?.find((v) => v.label === item.variantLabel) : undefined;
      const price = variant ? variant.price : product.price;
      if (price !== item.price) priceByKey[item.cartKey] = price;
    }
    const changed = Object.keys(priceByKey).length;
    if (changed > 0) {
      setCart((prev) =>
        prev.map((item) => (item.cartKey in priceByKey ? { ...item, price: priceByKey[item.cartKey] } : item)),
      );
    }
    return changed;
  }, [cart]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      cartCity,
      isHydrated,
      cartCount: cart.length,
      totalQuantity: cart.reduce((n, item) => n + item.quantity, 0),
      cartTotal: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      setCartCityIfEmpty,
      getCartItem: (productId, variantLabel = null) =>
        cart.find((item) => item.cartKey === buildCartKey(productId, variantLabel)),
      isInCart: (productId) => cart.some((item) => item._id === productId),
      syncCartPrices,
    }),
    [cart, cartCity, isHydrated, addToCart, removeFromCart, updateQuantity, clearCart, setCartCityIfEmpty, syncCartPrices],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
