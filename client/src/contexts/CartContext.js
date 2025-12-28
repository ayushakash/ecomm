import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [cartCity, setCartCity] = useState(null); // Track which city the cart items are from
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    const savedCartCity = localStorage.getItem('cartCity');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
        if (savedCartCity) {
          setCartCity(savedCartCity);
        }
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
        setCart([]);
        setCartCity(null);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save cart to localStorage whenever it changes (but not on initial load)
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('cart', JSON.stringify(cart));
      if (cartCity) {
        localStorage.setItem('cartCity', cartCity);
      } else {
        localStorage.removeItem('cartCity');
      }
    }
  }, [cart, cartCity, isInitialized]);

  const addToCart = (product, quantity = 1, city = null) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item._id === product._id);

      if (existingItem) {
        // Update quantity if item already exists
        return prevCart.map(item =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + quantity }
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

    // Set cart city if provided and not already set
    if (city && !cartCity) {
      setCartCity(city);
    }
  };

  const setCartCityIfEmpty = (city) => {
    if (!cartCity && city) {
      setCartCity(city);
    }
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item._id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
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
    setCartCity(null);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartCount = () => {
    return cart.length; // Return count of unique products, not total quantity
  };

  const getCartItem = (productId) => {
    return cart.find(item => item._id === productId);
  };

  const isInCart = (productId) => {
    return cart.some(item => item._id === productId);
  };

  const value = {
    cart,
    cartCity,
    setCartCityIfEmpty,
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
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
