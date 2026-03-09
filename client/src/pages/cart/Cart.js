import React, { useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrashIcon, PlusIcon, MinusIcon, ArrowRightIcon, ShieldCheckIcon, ExclamationTriangleIcon, LockClosedIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
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
      localStorage.setItem('postLoginRedirect', '/checkout');
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
            className="inline-flex items-center bg-primary-700 hover:bg-primary-800 text-white px-8 py-3.5 rounded-xl font-semibold transition-colors"
          >
            Start Shopping
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
        <div className="bg-primary-700 rounded-xl shadow-lg p-4 sm:p-6 mb-6 text-white">
          <h1 className="text-2xl font-bold">Shopping Cart</h1>
          <p className="text-primary-200 text-sm mt-0.5">{cart.length} item{cart.length !== 1 ? 's' : ''}</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              {cart.map((item, index) => (
                <div key={item.cartKey} className={`p-3 sm:p-5 ${index !== cart.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div className="flex gap-3">
                    {/* Product Image */}
                    <img
                      src={item.images?.[0] || '/placeholder-product.jpg'}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Name + delete */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 leading-snug truncate">{item.name}</h3>
                          {item.variantLabel && (
                            <span className="inline-block mt-0.5 px-2 py-0.5 bg-primary-50 text-primary-700 text-xs font-semibold rounded-full">
                              {item.variantLabel}
                            </span>
                          )}
                          <p className="text-xs text-gray-500 mt-0.5">₹{item.price.toLocaleString()} / {item.unit}</p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.cartKey)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Qty stepper + total */}
                      <div className="flex items-center justify-between mt-2.5">
                        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                          <button
                            onClick={() => updateQuantity(item.cartKey, Math.max(1, item.quantity - 1))}
                            disabled={item.quantity <= 1}
                            className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 transition-colors"
                          >
                            <MinusIcon className="h-3 w-3" />
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const newQty = Math.max(1, parseInt(e.target.value) || 1);
                              updateQuantity(item.cartKey, newQty);
                            }}
                            min="1"
                            className="w-10 text-center text-sm font-semibold border-x border-gray-300 py-1 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 transition-colors"
                          >
                            <PlusIcon className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="text-base font-bold text-primary-700">
                          ₹{(item.price * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Continue Shopping */}
              <div className="p-4 sm:p-5 border-t border-gray-100">
                <Link
                  to="/products"
                  className="inline-flex items-center text-sm text-primary-700 hover:text-primary-800 font-semibold transition-colors"
                >
                  <ArrowRightIcon className="h-4 w-4 mr-1.5 rotate-180" />
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 sticky top-8">
              <h2 className="text-lg font-bold text-gray-900 mb-5">Order Summary</h2>
              
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
                  <div className="flex items-start gap-1.5 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                    <InformationCircleIcon className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    Prices shown are final (GST included)
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
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5">
                  <InformationCircleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Login required</p>
                    <p className="text-xs text-amber-700 mt-0.5">Please login to proceed with checkout</p>
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
                  className={`w-full py-3.5 px-6 rounded-xl font-bold text-center transition-colors flex items-center justify-center gap-2 ${
                    !isLoggedIn
                      ? 'bg-primary-700 hover:bg-primary-800 text-white'
                      : isMinimumOrderMet
                      ? 'bg-primary-700 hover:bg-primary-800 text-white'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {!isLoggedIn ? (
                    <><LockClosedIcon className="h-4 w-4" /> Login to Checkout</>
                  ) : isMinimumOrderMet ? (
                    <>Proceed to Checkout <ArrowRightIcon className="h-4 w-4" /></>
                  ) : (
                    `Minimum Order: ₹${minimumOrderValue.toLocaleString()}`
                  )}
                </button>

                <button
                  onClick={clearCart}
                  className="w-full text-red-600 py-2.5 px-6 rounded-xl border border-red-200 hover:bg-red-50 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <TrashIcon className="h-4 w-4" />
                  Clear Cart
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
