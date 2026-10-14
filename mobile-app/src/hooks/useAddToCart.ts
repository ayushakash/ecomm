import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useCart } from '../contexts/CartContext';
import { useLocation } from '../contexts/LocationContext';
import type { Product, ProductVariant } from '../types/models';

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
            'Replace cart?',
            `Your cart contains items from ${cartCity}. Adding items from ${currentCity} will clear your current cart.`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              {
                text: 'Clear & add',
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
