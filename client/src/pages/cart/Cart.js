import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrashIcon, PlusIcon, MinusIcon, ArrowRightIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { ShoppingCartIcon } from '@heroicons/react/24/solid';
import { useCart } from '../../contexts/CartContext';
import { useQuery } from '@tanstack/react-query';
import { settingsAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

const Cart = () => {
  const { cart, removeFromCart, updateQuantity, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isLoggedIn = !!user;
  console.log("ORIFINAL",cart)
  
  // Prepare items for pricing calculation
  const cartItems = useMemo(() => 
    cart.map(item => ({
      totalPrice: item.price * item.quantity,
      quantity: item.quantity,
      weight: item.weight || 0
    })), [cart]
  );

  // Get dynamic pricing from backend (only if logged in)
  const { data: pricingData, isLoading: pricingLoading } = useQuery({
    queryKey: ['cart-pricing', cartItems],
    queryFn: () => settingsAPI.calculatePricing(cartItems),
    enabled: cart.length > 0 && isLoggedIn
  });

  // Get app settings for minimum order validation (only if logged in)
  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: () => settingsAPI.getSettings(),
    enabled: isLoggedIn
  });

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Use dynamic pricing if available, fallback to static calculation
  const finalPricing = pricingData || {
    subtotal: total,
    tax: total * 0.1,
    deliveryCharges: 50,
    totalAmount: total + (total * 0.1) + 50
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
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <ShoppingCartIcon className="w-12 h-12 text-gray-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Cart is Empty</h1>
            <p className="text-gray-600 text-lg">Discover amazing construction materials and start building!</p>
          </div>
          <Link
            to="/products"
            className="inline-flex items-center bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
          <p className="text-gray-600 mt-2">{cart.length} item{cart.length !== 1 ? 's' : ''} in your cart</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {cart.map((item, index) => (
                <div key={item._id} className={`p-6 ${index !== cart.length - 1 ? 'border-b border-gray-200' : ''}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      <img
                        src={item.images?.[0] || '/placeholder-product.jpg'}
                        alt={item.name}
                        className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                      />
                    </div>
                    
                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.name}</h3>
                      <p className="text-gray-600 mb-1">₹{item.price.toLocaleString()} per {item.unit}</p>
                      {item.sku && (
                        <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                      )}
                    </div>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between sm:justify-end sm:flex-col sm:items-end gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 mr-2">Qty:</span>
                        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
                          <button
                            onClick={() => updateQuantity(item._id, Math.max(1, item.quantity - 1))}
                            disabled={item.quantity <= 1}
                            className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
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
                            className="w-16 text-center text-sm font-semibold bg-white border border-gray-300 rounded-md py-1 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                          <button
                            onClick={() => updateQuantity(item._id, item.quantity + 1)}
                            disabled={item.quantity >= (item.stock || 999)}
                            className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                          >
                            <PlusIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Price and Remove */}
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xl font-bold text-gray-900">
                            ₹{(item.price * item.quantity).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500">
                            Max: {item.stock || 999}
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item._id)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-150"
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
              <div className="p-6 bg-gray-50 border-t border-gray-200">
                <Link
                  to="/products"
                  className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium transition-colors duration-150"
                >
                  <ArrowRightIcon className="h-4 w-4 mr-2 rotate-180" />
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Subtotal ({cart.length} item{cart.length !== 1 ? 's' : ''})</span>
                  <span className="font-semibold">₹{finalPricing.subtotal.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">
                    Tax ({pricingData?.breakdown?.taxRate ? (pricingData.breakdown.taxRate * 100).toFixed(1) : '10'}%)
                  </span>
                  <span className="font-semibold">₹{Math.round(finalPricing.tax).toLocaleString()}</span>
                </div>
                
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
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex items-center justify-center w-5 h-5 bg-blue-500 rounded-full mr-3 mt-0.5 flex-shrink-0">
                      <span className="text-white text-xs font-bold">i</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-blue-800">Login Required</h4>
                      <p className="text-sm text-blue-700 mt-1">
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
                  className={`w-full py-3 px-6 rounded-lg font-semibold text-center transition-colors duration-200 shadow-lg hover:shadow-xl ${
                    !isLoggedIn
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : isMinimumOrderMet
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {!isLoggedIn 
                    ? 'Login to Checkout' 
                    : isMinimumOrderMet 
                    ? 'Proceed to Checkout' 
                    : `Minimum Order: ₹${minimumOrderValue.toLocaleString()}`
                  }
                </button>
                
                <button
                  onClick={clearCart}
                  className="w-full text-gray-600 py-3 px-6 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium transition-colors duration-200"
                >
                  Clear Cart
                </button>
              </div>
              
              {/* Trust indicators */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center text-sm text-gray-600">
                  <ShieldCheckIcon className="h-4 w-4 mr-2 text-green-500" />
                  Secure checkout with SSL encryption
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
