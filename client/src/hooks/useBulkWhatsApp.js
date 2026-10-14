import { useQuery } from '@tanstack/react-query';
import { settingsAPI } from '../services/api';

export const useBulkWhatsApp = () => {
  const { data } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => settingsAPI.getPublic(),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // DB value takes priority, env is fallback.
  // wa.me requires full international format (no +). Admin-entered numbers are
  // often bare 10-digit Indian mobiles — normalize: strip non-digits, prepend 91.
  const raw = data?.bulkOrderPhone || process.env.REACT_APP_BULK_WHATSAPP || '';
  const digits = String(raw).replace(/\D/g, '');
  const number = digits.length === 10 ? `91${digits}` : digits;

  // Call-to-order number (admin-configurable; falls back to WhatsApp number)
  const callRaw = data?.callOrderPhone || raw;
  const callDigits = String(callRaw).replace(/\D/g, '');
  const callNumber = callDigits.length === 10 ? `91${callDigits}` : callDigits;

  const getWhatsAppLink = (product, quantity) => {
    if (!number) return null;
    const msg = `Hi, I want to place a bulk order:\n\nProduct: ${product.name}${product.sku ? `\nSKU: ${product.sku}` : ''}\nQuantity needed: ${quantity} ${product.unit || 'units'}\n\nPlease share the bulk pricing.`;
    return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
  };

  const getSimpleWhatsAppLink = (product) => {
    if (!number) return null;
    const msg = `Hi, I want a bulk order of ${product.name}${product.sku ? ` (SKU: ${product.sku})` : ''}.\nPlease share bulk pricing.`;
    return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
  };

  // Full-cart order link — used on the cart page so guests can order via
  // WhatsApp without creating an account.
  const getCartWhatsAppLink = (cartItems, totalAmount) => {
    if (!number || !cartItems?.length) return null;
    const lines = cartItems.map(i =>
      `• ${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ''} × ${i.quantity} — ₹${(i.price * i.quantity).toLocaleString('en-IN')}`
    );
    const msg = `Hi, I want to order from chardeevari.in:\n\n${lines.join('\n')}\n\nTotal: ₹${Number(totalAmount || 0).toLocaleString('en-IN')}\n\nPlease confirm availability and delivery.`;
    return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
  };

  return { number, callNumber, getWhatsAppLink, getSimpleWhatsAppLink, getCartWhatsAppLink };
};
