import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useCart } from '../../contexts/CartContext';
import { useLocation } from '../../contexts/LocationContext';
import type { RootNavigation } from '../../navigation/types';
import { productAPI } from '../../services/api';
import type { Product } from '../../types/models';
import { toast } from '../../utils/toast';
import { MATERIAL_ORDER_CONFIG, ORDER_MATERIAL_KEYS, type CalculationResult } from './calculatorMath';

/** Same wording/semantics as useAddToCart's city lock, asked once for the whole batch. */
function confirmReplaceCart(cartCity: string, currentCity: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      'Replace cart?',
      `Your cart contains items from ${cartCity}. Adding items from ${currentCity} will clear your current cart.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Clear & add', style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/**
 * Web handleOrderMaterials: turn the estimate into a prefilled cart. Per material,
 * best-effort catalog match by keyword (serving merchants only), unit-aware
 * quantity conversion, then send the user to the cart to review quantities.
 */
export function useOrderMaterials() {
  const navigation = useNavigation<RootNavigation>();
  const { addToCart, cartCity, clearCart } = useCart();
  const { currentCity, activeMerchantIds } = useLocation();
  const [ordering, setOrdering] = useState(false);

  const orderMaterials = useCallback(
    async (results: CalculationResult) => {
      if (ordering) return;
      if (cartCity && currentCity && cartCity.toLowerCase() !== currentCity.toLowerCase()) {
        if (!(await confirmReplaceCart(cartCity, currentCity))) return;
        clearCart();
      }
      setOrdering(true);
      const matched: string[] = [];
      const unmatched: string[] = [];
      try {
        for (const key of ORDER_MATERIAL_KEYS) {
          const mat = results[key];
          if (!mat?.quantity) continue;
          const cfg = MATERIAL_ORDER_CONFIG[key];
          try {
            const res = await productAPI.getProducts({ search: cfg.keyword, merchantIds: activeMerchantIds });
            const product = (res.products ?? []).find(
              (p: Product) => p.enabled !== false && (p.totalStock ?? p.stock ?? 0) > 0,
            );
            if (!product) {
              unmatched.push(cfg.label);
              continue;
            }
            addToCart(product, cfg.toQty(mat.quantity, product.unit), currentCity);
            matched.push(cfg.label);
          } catch {
            unmatched.push(cfg.label);
          }
        }

        if (matched.length === 0) {
          toast.error("Couldn't auto-match products", 'Browse the catalog to add items.');
          navigation.navigate('MainTabs', { screen: 'ProductsTab', params: {} });
          return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        const review = 'Please review quantities before checkout.';
        toast.success(
          `Added ${matched.length} material(s) to cart`,
          unmatched.length ? `${review} Not available yet: ${unmatched.join(', ')}. Add manually if needed.` : review,
        );
        navigation.navigate('MainTabs', { screen: 'CartTab' });
      } finally {
        setOrdering(false);
      }
    },
    [ordering, cartCity, currentCity, activeMerchantIds, addToCart, clearCart, navigation],
  );

  return { orderMaterials, ordering };
}
