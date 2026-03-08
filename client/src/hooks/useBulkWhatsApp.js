import { useQuery } from '@tanstack/react-query';
import { settingsAPI } from '../services/api';

export const useBulkWhatsApp = () => {
  const { data } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => settingsAPI.getPublic(),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // DB value takes priority, env is fallback
  const number = data?.bulkOrderPhone || process.env.REACT_APP_BULK_WHATSAPP || '';

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

  return { number, getWhatsAppLink, getSimpleWhatsAppLink };
};
