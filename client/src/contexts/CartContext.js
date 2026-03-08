import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

// Build a unique key for a cart item
// variant products: "productId_8mm", plain products: "productId"
const buildCartKey = (productId, variantLabel) =>
  variantLabel ? `${productId}_${variantLabel}` : productId;

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [cartCity, setCartCity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    const savedCartCity = localStorage.getItem('cartCity');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
        if (savedCartCity) setCartCity(savedCartCity);
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
        setCart([]);
        setCartCity(null);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save cart to localStorage whenever it changes
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

  /**
   * Add a product to cart.
   * @param {Object} product  - product document
   * @param {number} quantity
   * @param {string|null} city
   * @param {Object|null} variant - { label, price, stock, sku } — null for non-variant products
   */
  const addToCart = (product, quantity = 1, city = null, variant = null) => {
    const cartKey = buildCartKey(product._id, variant?.label);

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.cartKey === cartKey);

      if (existingItem) {
        return prevCart.map(item =>
          item.cartKey === cartKey
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [...prevCart, {
        cartKey,
        _id: product._id,
        name: product.name,
        variantLabel: variant?.label || null,
        price: variant ? variant.price : product.price,
        unit: product.unit,
        quantity,
        images: product.images || [],
        stock: variant ? variant.stock : (product.totalStock || product.stock),
        sku: variant?.sku || product.sku,
        weight: product.weight || 0,
        gstRate: product.gstRate,
        gstType: product.gstType,
      }];
    });

    if (city && !cartCity) setCartCity(city);
  };

  const setCartCityIfEmpty = (city) => {
    if (!cartCity && city) setCartCity(city);
  };

  // All removal/update operations use cartKey
  const removeFromCart = (cartKey) => {
    setCart(prevCart => prevCart.filter(item => item.cartKey !== cartKey));
  };

  const updateQuantity = (cartKey, quantity) => {
    if (quantity <= 0) {
      removeFromCart(cartKey);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.cartKey === cartKey ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setCartCity(null);
  };

  const getCartTotal = () =>
    cart.reduce((total, item) => total + item.price * item.quantity, 0);

  const getCartCount = () => cart.length;

  // Look up by cartKey (preferred) or productId+variantLabel
  const getCartItem = (productId, variantLabel = null) => {
    const cartKey = buildCartKey(productId, variantLabel);
    return cart.find(item => item.cartKey === cartKey);
  };

  const isInCart = (productId) =>
    cart.some(item => item._id === productId);

  // Sync cart prices from backend
  const syncCartPrices = async (productAPI) => {
    if (cart.length === 0) return;
    try {
      const productIds = [...new Set(cart.map(item => item._id))];
      const freshProducts = await Promise.all(
        productIds.map(async (id) => {
          try {
            const response = await productAPI.getProduct(id);
            return response.data;
          } catch {
            return null;
          }
        })
      );

      let updatedCount = 0;
      setCart(prevCart =>
        prevCart.map(item => {
          const freshProduct = freshProducts.find(p => p && p._id === item._id);
          if (!freshProduct) return item;

          // For variant items, find the matching variant price
          let freshPrice = freshProduct.price;
          if (item.variantLabel && freshProduct.variants?.length) {
            const freshVariant = freshProduct.variants.find(v => v.label === item.variantLabel);
            if (freshVariant) freshPrice = freshVariant.price;
          }

          if (freshPrice !== item.price) {
            updatedCount++;
            return { ...item, price: freshPrice };
          }
          return item;
        })
      );

      if (updatedCount > 0) {
        console.log(`✅ Updated ${updatedCount} product price(s) in cart`);
      }
    } catch (error) {
      console.error('Error syncing cart prices:', error);
    }
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
    syncCartPrices,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
