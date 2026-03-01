import React, { useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrashIcon, PlusIcon, MinusIcon, ArrowRightIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { ShoppingCartIcon } from '@heroicons/react/24/solid';
import { useCart } from '../../contexts/CartContext';
import { useQuery } from '@tanstack/react-query';
import { orderAPI, settingsAPI, productAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

const Cart = () => {
  const { cart, removeFromCart, updateQuantity, clearCart, syncCartPrices } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isLoggedIn = !!user;

  // Sync cart prices when component mounts and user is logged in
  useEffect(() => {
    if (isLoggedIn && cart.length > 0) {
      syncCartPrices(productAPI);
    }
  }, [isLoggedIn]); // Only run when login status changes
  
  // Prepare items for cart totals calculation (send product IDs, not prices)
  const cartItems = useMemo(() =>
    cart.map(item => ({
      productId: item._id,
      quantity: item.quantity
    })), [cart]
  );

  // Get dynamic pricing from backend (only if logged in)
  const { data: pricingData, isLoading: pricingLoading } = useQuery({
    queryKey: ['cart-pricing', cartItems],
    queryFn: () => orderAPI.calculateCartTotals(cartItems, null, null),
    enabled: cart.length > 0 && isLoggedIn
  });

  // Get app settings for minimum order validation (only if logged in)
  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: () => settingsAPI.getSettings(),
    enabled: isLoggedIn
  });

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Calculate GST for fallback (when not logged in)
  const calculateFallbackGST = () => {
    let totalGST = 0;
    cart.forEach(item => {
      const gstRate = (item.gstRate || 18) / 100;
      const gstType = item.gstType || 'exclusive';
      const itemTotal = item.price * item.quantity;

      if (gstType === 'exclusive') {
        totalGST += itemTotal * gstRate;
      } else if (gstType === 'inclusive') {
        const basePrice = itemTotal / (1 + gstRate);
        totalGST += itemTotal - basePrice;
      }
    });
    return totalGST;
  };

  const fallbackGST = calculateFallbackGST();
  const fallbackDelivery = 50;

  // Use dynamic pricing if available, fallback to calculation
  const finalPricing = pricingData || {
    subtotal: total,
    tax: fallbackGST,
    deliveryCharges: fallbackDelivery,
    totalAmount: total + fallbackGST + fallbackDelivery
  };

  const minimumOrderValue = settings?.minimumOrderValue || 100;
  const isMinimumOrderMet = finalPricing.subtotal >= minimumOrderValue;

  const handleCheckout = () => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    if (!isMinimumOrderMet) {
      return; // Just prevent checkout without showing toast
    }
    navigate('/checkout');
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-gray-50 py-12">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="mb-8">
            <div className="w-28 h-28 mx-auto bg-primary-100 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <ShoppingCartIcon className="w-14 h-14 text-primary-700" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-primary-700 mb-3">Your Cart is Empty</h1>
            <p className="text-gray-600 text-lg">Discover amazing construction materials and start building!</p>
          </div>
          <Link
            to="/products"
            className="inline-flex items-center bg-primary-700 hover:bg-primary-800 text-white px-8 py-3.5 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            🛍️ Start Shopping
            <ArrowRightIcon className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="bg-primary-700 rounded-xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 text-white">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">🛒 Shopping Cart</h1>
          <p className="text-gray-100 text-sm sm:text-base">{cart.length} item{cart.length !== 1 ? 's' : ''} in your cart</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              {cart.map((item, index) => (
                <div key={item._id} className={`p-4 sm:p-6 ${index !== cart.length - 1 ? 'border-b border-gray-100' : ''} hover:bg-gray-50 transition-all duration-200`}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      <img
                        src={item.images?.[0] || '/placeholder-product.jpg'}
                        alt={item.name}
                        className="w-24 h-24 object-cover rounded-xl border-2 border-gray-200 shadow-md"
                      />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">{item.name}</h3>
                      <p className="text-gray-600 mb-1 font-medium">₹{item.price.toLocaleString()} <span className="text-sm text-gray-500">per {item.unit}</span></p>
                      {item.sku && (
                        <p className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-md inline-block">SKU: {item.sku}</p>
                      )}
                    </div>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between sm:justify-end sm:flex-col sm:items-end gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-700 mr-2">Qty:</span>
                        <div className="flex items-center gap-1 bg-gradient-to-r from-stone-50 to-orange-50 rounded-xl p-1.5 shadow-sm">
                          <button
                            onClick={() => updateQuantity(item._id, Math.max(1, item.quantity - 1))}
                            disabled={item.quantity <= 1}
                            className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm border-2 border-gray-200 hover:bg-gradient-to-r hover:from-stone-600 hover:to-orange-500 hover:text-white hover:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                          >
                            <MinusIcon className="h-4 w-4" />
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const newQty = Math.max(1, Math.min(parseInt(e.target.value) || 1, item.stock || 999));
                              updateQuantity(item._id, newQty);
                            }}
                            min="1"
                            max={item.stock || 999}
                            className="w-14 text-center text-sm font-bold bg-white border-2 border-gray-200 rounded-lg py-1.5 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          />
                          <button
                            onClick={() => updateQuantity(item._id, item.quantity + 1)}
                            disabled={item.quantity >= (item.stock || 999)}
                            className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm border-2 border-gray-200 hover:bg-gradient-to-r hover:from-stone-600 hover:to-orange-500 hover:text-white hover:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                          >
                            <PlusIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Price and Remove */}
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="text-right">
                          <p className="text-lg sm:text-xl font-black text-primary-700">
                            ₹{(item.price * item.quantity).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500 font-medium">
                            Max: {item.stock || 999}
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item._id)}
                          className="p-2.5 text-red-500 hover:text-white hover:bg-red-500 rounded-xl transition-all duration-150 shadow-sm"
                          title="Remove from cart"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Continue Shopping */}
              <div className="p-5 sm:p-6 bg-gradient-to-r from-stone-50 to-orange-50 border-t-2 border-gray-100">
                <Link
                  to="/products"
                  className="inline-flex items-center text-orange-600 hover:text-orange-700 font-semibold transition-colors duration-150"
                >
                  <ArrowRightIcon className="h-5 w-5 mr-2 rotate-180" />
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 sticky top-8">
              <h2 className="text-xl sm:text-2xl font-bold text-primary-700 mb-6">💳 Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Subtotal ({cart.length} item{cart.length !== 1 ? 's' : ''})</span>
                  <span className="font-semibold">₹{finalPricing.subtotal.toLocaleString()}</span>
                </div>
                
                {/* Show GST breakdown conditionally based on display mode */}
                {(pricingData?.breakdown?.gstDisplayMode !== 'no-display') && finalPricing.tax > 0 && (
                  <>
                    {finalPricing.subtotalBeforeGST && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">└─ Base Amount</span>
                        <span className="text-gray-500">₹{Math.round(finalPricing.subtotalBeforeGST).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">GST</span>
                      <span className="font-semibold">₹{Math.round(finalPricing.tax).toLocaleString()}</span>
                    </div>
                  </>
                )}

                {/* Info when no-display mode is active */}
                {pricingData?.breakdown?.gstDisplayMode === 'no-display' && (
                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    ℹ️ Prices shown are final (GST included)
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center">
                    Delivery 
                    {pricingData?.breakdown?.deliveryConfig?.type === 'threshold' && 
                     finalPricing.subtotal >= pricingData.breakdown.deliveryConfig.freeDeliveryThreshold && (
                      <span className="ml-2 text-green-600 text-sm font-medium bg-green-50 px-2 py-1 rounded-full">
                        FREE
                      </span>
                    )}
                  </span>
                  <span className="font-semibold">
                    {pricingData?.breakdown?.deliveryConfig?.type === 'threshold' && 
                     finalPricing.subtotal >= pricingData.breakdown.deliveryConfig.freeDeliveryThreshold
                      ? '₹0'
                      : `₹${Math.round(finalPricing.deliveryCharges).toLocaleString()}`
                    }
                  </span>
                </div>
                
                {finalPricing.platformFee && finalPricing.platformFee > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Platform Fee</span>
                    <span className="font-semibold">₹{Math.round(finalPricing.platformFee).toLocaleString()}</span>
                  </div>
                )}
              </div>
              
              <div className="border-t border-gray-200 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-semibold text-gray-900">Total</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-gray-900">
                      ₹{Math.round(finalPricing.totalAmount).toLocaleString()}
                    </span>
                    {pricingLoading && (
                      <div className="text-xs text-primary-600 mt-1 animate-pulse">Updating prices...</div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Login Required Message */}
              {!isLoggedIn && (
                <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex items-center justify-center w-5 h-5 bg-orange-500 rounded-full mr-3 mt-0.5 flex-shrink-0">
                      <span className="text-white text-xs font-bold">i</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-orange-800">Login Required</h4>
                      <p className="text-sm text-orange-700 mt-1">
                        Please login to proceed with checkout and place your order
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Minimum Order Warning */}
              {isLoggedIn && !isMinimumOrderMet && (
                <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-amber-800">Minimum Order Required</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        Add items worth ₹{(minimumOrderValue - finalPricing.subtotal).toLocaleString()} more to meet the minimum order value of ₹{minimumOrderValue.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                <button
                  onClick={handleCheckout}
                  disabled={isLoggedIn && !isMinimumOrderMet}
                  className={`w-full py-3.5 px-6 rounded-xl font-bold text-center transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                    !isLoggedIn
                      ? 'bg-primary-700 hover:bg-primary-800 text-white'
                      : isMinimumOrderMet
                      ? 'bg-primary-700 hover:bg-primary-800 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none hover:scale-100'
                  }`}
                >
                  {!isLoggedIn
                    ? '🔐 Login to Checkout'
                    : isMinimumOrderMet
                    ? '✨ Proceed to Checkout'
                    : `Minimum Order: ₹${minimumOrderValue.toLocaleString()}`
                  }
                </button>

                <button
                  onClick={clearCart}
                  className="w-full text-red-600 py-3 px-6 rounded-xl border-2 border-red-200 hover:bg-red-50 hover:border-red-300 font-semibold transition-all duration-200"
                >
                  🗑️ Clear Cart
                </button>
              </div>

              {/* Trust indicators */}
              <div className="mt-6 pt-6 border-t-2 border-gray-100">
                <div className="flex items-center text-sm text-gray-600 bg-green-50 p-3 rounded-xl">
                  <ShieldCheckIcon className="h-5 w-5 mr-2 text-green-600" />
                  <span className="font-medium">Secure checkout with SSL encryption</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
