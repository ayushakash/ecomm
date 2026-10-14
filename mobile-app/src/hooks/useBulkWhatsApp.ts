import { useMemo } from 'react';
import { BULK_WHATSAPP_FALLBACK } from '../config';
import type { CartItem, Product } from '../types/models';
import {
  buildBulkOrderLink,
  buildCartOrderLink,
  buildSimpleBulkLink,
  callPhone,
  normalizeIndianNumber,
  openExternal,
} from '../utils/whatsapp';
import { usePublicSettings } from './queries';

type LinkProduct = Pick<Product, 'name' | 'sku' | 'unit'>;

export interface BulkWhatsApp {
  /** WhatsApp number in wa.me format ('' when not configured). */
  number: string;
  /** Call-to-order number (falls back to the WhatsApp number). */
  callNumber: string;
  getWhatsAppLink(product: LinkProduct, quantity: number): string | null;
  getSimpleWhatsAppLink(product: LinkProduct): string | null;
  getCartWhatsAppLink(cartItems: CartItem[], totalAmount: number): string | null;
  /** Convenience: open the simple bulk link for a product. */
  openBulkWhatsApp(product: LinkProduct, quantity?: number): Promise<void>;
  openCartWhatsApp(cartItems: CartItem[], totalAmount: number): Promise<void>;
  /** Dial callNumber. No-op toast when unset. */
  callToOrder(): Promise<void>;
}

/** Port of client/src/hooks/useBulkWhatsApp.js. DB settings win; app.config extra.bulkWhatsapp is the fallback. */
export function useBulkWhatsApp(): BulkWhatsApp {
  const { data } = usePublicSettings();
  return useMemo(() => {
    const raw = data?.bulkOrderPhone || BULK_WHATSAPP_FALLBACK;
    const number = normalizeIndianNumber(raw);
    const callNumber = normalizeIndianNumber(data?.callOrderPhone || raw);
    return {
      number,
      callNumber,
      getWhatsAppLink: (product, quantity) => buildBulkOrderLink(number, product, quantity),
      getSimpleWhatsAppLink: (product) => buildSimpleBulkLink(number, product),
      getCartWhatsAppLink: (cartItems, totalAmount) => buildCartOrderLink(number, cartItems, totalAmount),
      openBulkWhatsApp: (product, quantity) =>
        openExternal(
          quantity ? buildBulkOrderLink(number, product, quantity) : buildSimpleBulkLink(number, product),
          'WhatsApp ordering is not available right now',
        ),
      openCartWhatsApp: (cartItems, totalAmount) =>
        openExternal(buildCartOrderLink(number, cartItems, totalAmount), 'WhatsApp ordering is not available right now'),
      callToOrder: () => (callNumber ? callPhone(callNumber) : openExternal(null, 'Call ordering is not available right now')),
    };
  }, [data?.bulkOrderPhone, data?.callOrderPhone]);
}
