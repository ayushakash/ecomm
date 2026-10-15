import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useCart } from '../contexts/CartContext';
import { useLocation } from '../contexts/LocationContext';
import type { Product, ProductVariant } from '../types/models';
import i18n from '../i18n';

/**
 * Add to cart with the web's city lock (ProductCard.handleAdd): if the cart was
 * filled in another city, confirm clearing it first. Resolves true when added.
 * Out-of-stock products are ignored.
 */
export function useAddToCart() {
  const { addToCart, cartCity, clearCart } = useCart();
  const { currentCity } = useLocation();

  return useCallback(
    (product: Product, quantity = 1, variant: ProductVariant | null = null): Promise<boolean> => {
      const stock = variant ? variant.stock : product.totalStock ?? product.stock ?? 0;
      if (stock <= 0) return Promise.resolve(false);
      const add = () => {
        addToCart(product, quantity, currentCity, variant);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      };
      if (cartCity && currentCity && cartCity.toLowerCase() !== currentCity.toLowerCase()) {
        return new Promise((resolve) => {
          Alert.alert(
            i18n.t('common:cart.replaceTitle'),
            i18n.t('common:cart.replaceMessage', { cartCity, city: currentCity }),
            [
              { text: i18n.t('common:actions.cancel'), style: 'cancel', onPress: () => resolve(false) },
              {
                text: i18n.t('common:cart.clearAndAdd'),
                style: 'destructive',
                onPress: () => {
                  clearCart();
                  add();
                  resolve(true);
                },
              },
            ],
            { cancelable: true, onDismiss: () => resolve(false) },
          );
        });
      }
      add();
      return Promise.resolve(true);
    },
    [addToCart, cartCity, clearCart, currentCity],
  );
}
