/**
 * GST pricing helpers. Port of client/src/utils/pricingUtils.js.
 * Final payable totals always come from the backend (orderAPI.calculateCartTotals);
 * these helpers are for display only.
 */
import type { CartItem, GstType, Product } from '../types/models';

export interface DisplayPrice {
  displayPrice: number;
  gstAmount: number;
  basePrice: number;
  totalPrice: number;
  breakdown: string;
  showGstSeparately: boolean;
}

/**
 * Price to show for a base price. `displayMode` follows the product's gstType:
 * 'inclusive' shows base+GST; 'exclusive' shows base and the GST separately;
 * 'no-gst' shows the base price with no GST line.
 */
export const calculateDisplayPrice = (
  basePrice: number,
  gstRate = 18,
  displayMode: GstType = 'exclusive',
): DisplayPrice => {
  if (displayMode === 'no-gst') {
    return {
      displayPrice: basePrice,
      gstAmount: 0,
      basePrice,
      totalPrice: basePrice,
      breakdown: formatPrice(basePrice),
      showGstSeparately: false,
    };
  }
  const gstAmount = Math.round(basePrice * (gstRate / 100));
  const totalPrice = basePrice + gstAmount;
  if (displayMode === 'inclusive') {
    return {
      displayPrice: totalPrice,
      gstAmount,
      basePrice,
      totalPrice,
      breakdown: `${formatPrice(totalPrice)} (incl. ${gstRate}% GST)`,
      showGstSeparately: false,
    };
  }
  return {
    displayPrice: basePrice,
    gstAmount,
    basePrice,
    totalPrice,
    breakdown: `${formatPrice(basePrice)} + ${formatPrice(gstAmount)} GST`,
    showGstSeparately: true,
  };
};

export interface LocalCartTotals {
  subtotal: number;
  totalGst: number;
  grandTotal: number;
  itemBreakdowns: {
    productId: string;
    productName: string;
    quantity: number;
    basePrice: number;
    gstRate: number;
    itemBaseTotal: number;
    itemGst: number;
    itemTotal: number;
  }[];
}

/** Client-side per-item GST estimate (web parity). Prefer server totals for anything payable. */
export const calculateCartTotals = (cartItems: CartItem[]): LocalCartTotals => {
  let subtotal = 0;
  let totalGst = 0;
  const itemBreakdowns = cartItems.map((item) => {
    const basePrice = item.price || 0;
    const gstRate = item.gstRate || 18;
    const quantity = item.quantity || 1;
    const itemBaseTotal = basePrice * quantity;
    const itemGst = Math.round(itemBaseTotal * (gstRate / 100));
    subtotal += itemBaseTotal;
    totalGst += itemGst;
    return {
      productId: item._id,
      productName: item.name,
      quantity,
      basePrice,
      gstRate,
      itemBaseTotal,
      itemGst,
      itemTotal: itemBaseTotal + itemGst,
    };
  });
  return { subtotal, totalGst, grandTotal: subtotal + totalGst, itemBreakdowns };
};

/** ₹ with en-IN grouping, rounded to the rupee: 125000 → "₹1,25,000". */
export const formatPrice = (price: number, includeCurrency = true): string => {
  const formatted = Math.round(price || 0).toLocaleString('en-IN');
  return includeCurrency ? `₹${formatted}` : formatted;
};

/** Cheapest variant price, or product.price for non-variant products. */
export const getStartingPrice = (product: Pick<Product, 'price' | 'variants'>): number =>
  product.variants?.length ? Math.min(...product.variants.map((v) => v.price)) : product.price;

/** Whole-percent discount vs MRP, or 0 when MRP is absent/not higher. */
export const getDiscountPercent = (price: number, mrp?: number): number =>
  mrp && mrp > price ? Math.round((1 - price / mrp) * 100) : 0;
