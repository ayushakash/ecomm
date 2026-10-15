/**
 * Bulk-order WhatsApp / call helpers. Port of client/src/hooks/useBulkWhatsApp.js
 * (pure part); the hook lives in src/hooks/useBulkWhatsApp.ts.
 */
import { Linking } from 'react-native';
import type { CartItem, Product } from '../types/models';
import { toast } from './toast';
import i18n from '../i18n';

type LinkProduct = Pick<Product, 'name' | 'sku' | 'unit'>;

/** wa.me needs full international digits; bare 10-digit Indian mobiles get a 91 prefix. */
export const normalizeIndianNumber = (raw?: string | null): string => {
  const digits = String(raw ?? '').replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
};

const waLink = (number: string, message: string) => `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

export const buildBulkOrderLink = (number: string, product: LinkProduct, quantity: number): string | null =>
  number
    ? waLink(
        number,
        `Hi, I want to place a bulk order:\n\nProduct: ${product.name}${product.sku ? `\nSKU: ${product.sku}` : ''}\nQuantity needed: ${quantity} ${product.unit || 'units'}\n\nPlease share the bulk pricing.`,
      )
    : null;

export const buildSimpleBulkLink = (number: string, product: LinkProduct): string | null =>
  number
    ? waLink(
        number,
        `Hi, I want a bulk order of ${product.name}${product.sku ? ` (SKU: ${product.sku})` : ''}.\nPlease share bulk pricing.`,
      )
    : null;

/** Whole-cart order message (lets guests order without an account). */
export const buildCartOrderLink = (number: string, cartItems: CartItem[], totalAmount: number): string | null => {
  if (!number || !cartItems.length) return null;
  const lines = cartItems.map(
    (i) =>
      `• ${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ''} × ${i.quantity} — ₹${(i.price * i.quantity).toLocaleString('en-IN')}`,
  );
  return waLink(
    number,
    `Hi, I want to order from chardeevari.in:\n\n${lines.join('\n')}\n\nTotal: ₹${Number(totalAmount || 0).toLocaleString('en-IN')}\n\nPlease confirm availability and delivery.`,
  );
};

/** Open any external URL (wa.me, tel:, https:), toasting on failure. */
export async function openExternal(url: string | null | undefined, failMessage?: string): Promise<void> {
  const message = failMessage ?? i18n.t('common:external.openFailed');
  if (!url) {
    toast.error(message);
    return;
  }
  try {
    await Linking.openURL(url);
  } catch {
    toast.error(message);
  }
}

/** Start a phone call; `number` may include the 91 prefix. */
export const callPhone = (number: string) => openExternal(`tel:+${number.replace(/^\+/, '')}`, i18n.t('common:external.callFailed'));
