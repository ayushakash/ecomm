import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { CartItem } from '../types';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from './AuthContext';

interface CartContextType {
  cart: CartItem[];
  loading: boolean;
  setLoading: (loading: boolean) => void;
  addToCart: (product: any, quantity?: number) => boolean;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
  getCartItem: (productId: string) => CartItem | undefined;
  isInCart: (productId: string) => boolean;
  getTotalItems: () => number;
  isMinimumOrderMet: () => boolean;
  getMinimumOrderValue: () => number;
  getRemainingForMinimum: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const { user } = useAuth();
  const { data: settingsData } = useSettings();

  // Load cart from AsyncStorage on mount
  useEffect(() => {
    loadCart();
  }, []);

  // Save cart to AsyncStorage whenever it changes (but not on initial load)
  useEffect(() => {
    if (isInitialized) {
      saveCart();
    }
  }, [cart, isInitialized]);

  const loadCart = async () => {
    try {
      const savedCart = await AsyncStorage.getItem('cart');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    } catch (error) {
      console.error('Error loading cart from AsyncStorage:', error);
      setCart([]);
    } finally {
      setIsInitialized(true);
    }
  };

  const saveCart = async () => {
    try {
      await AsyncStorage.setItem('cart', JSON.stringify(cart));
    } catch (error) {
      console.error('Error saving cart to AsyncStorage:', error);
    }
  };

  const addToCart = (product: any, quantity: number = 1): boolean => {
    // Check if product is out of stock
    const availableStock = product.totalStock || product.stock || 0;
    if (availableStock <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Out of Stock',
        text2: 'This product is currently out of stock',
      });
      return false;
    }

    const existingItem = cart.find(item => item._id === product._id);
    const currentQuantityInCart = existingItem ? existingItem.quantity : 0;
    const newTotalQuantity = currentQuantityInCart + quantity;

    // Check if requested quantity exceeds available stock
    if (newTotalQuantity > availableStock) {
      Toast.show({
        type: 'error',
        text1: 'Insufficient Stock',
        text2: `Only ${availableStock - currentQuantityInCart} items available`,
      });
      return false;
    }

    setCart(prevCart => {
      if (existingItem) {
        // Update quantity if item already exists
        return prevCart.map(item =>
          item._id === product._id
            ? { ...item, quantity: newTotalQuantity }
            : item
        );
      } else {
        // Add new item
        return [...prevCart, {
          _id: product._id,
          name: product.name,
          price: product.price,
          unit: product.unit,
          quantity,
          images: product.images || [],
          stock: product.totalStock || product.stock,
          sku: product.sku,
          weight: product.weight || 0
        }];
      }
    });

    return true;
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item._id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item._id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const getCartTotal = (): number => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartCount = (): number => {
    return cart.length; // Return count of unique products
  };

  const getTotalItems = (): number => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getCartItem = (productId: string): CartItem | undefined => {
    return cart.find(item => item._id === productId);
  };

  const isInCart = (productId: string): boolean => {
    return cart.some(item => item._id === productId);
  };

  const getMinimumOrderValue = (): number => {
    return settingsData?.data?.minimumOrderValue || 100;
  };

  const isMinimumOrderMet = (): boolean => {
    const total = getCartTotal();
    const minimumOrder = getMinimumOrderValue();
    return total >= minimumOrder;
  };

  const getRemainingForMinimum = (): number => {
    const total = getCartTotal();
    const minimumOrder = getMinimumOrderValue();
    return Math.max(0, minimumOrder - total);
  };

  const value: CartContextType = {
    cart,
    loading,
    setLoading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartCount,
    getCartItem,
    isInCart,
    getTotalItems,
    isMinimumOrderMet,
    getMinimumOrderValue,
    getRemainingForMinimum,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};