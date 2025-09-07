import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useMutation, useQuery } from '@tanstack/react-query';
import { orderAPI, settingsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    customerName: user?.name || '',
    customerPhone: user?.phone || '',
    customerAddress: user?.address || '',
    customerArea: user?.area || '',
    deliveryInstructions: '',
    paymentMethod: 'cod'
  });

  // Prepare items for pricing calculation
  const cartItems = useMemo(() => 
    cart.map(item => ({
      totalPrice: item.price * item.quantity,
      quantity: item.quantity,
      weight: item.weight || 0
    })), [cart]
  );

  // Get dynamic pricing from backend
  const { data: pricingData, isLoading: pricingLoading } = useQuery({
    queryKey: ['checkout-pricing', cartItems],
    queryFn: () => settingsAPI.calculatePricing(cartItems),
    enabled: cart.length > 0
  });

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Use dynamic pricing if available, fallback to static calculation
  const finalPricing = pricingData || {
    subtotal: subtotal,
    tax: subtotal * 0.1,
    deliveryCharges: 50,
    totalAmount: subtotal + (subtotal * 0.1) + 50
  };

    const createOrderMutation = useMutation({
    mutationFn: (orderData) => orderAPI.createOrder(orderData),
    onSuccess: (res) => {
      console.log("✅ Order created:", res.data);
       toast.success('Order Successfully Placed!');

      clearCart();
      navigate('/orders');
    },
    onError: (err) => {
      console.error("❌ Order creation failed:", err.response?.data || err.message);
      alert("Failed to place order. Please try again!");
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form Data:', formData);
        console.log('Cart:', cart);
    
    const orderData = {
      ...formData,
      items: cart.map(item => ({
      productId: item._id,
      productName: item.name,
      unitPrice: item.price, 
      quantity: item.quantity,
      unit: item.unit,
      sku: item.sku,
      totalPrice: item.price * item.quantity
      })),
      subtotal: finalPricing.subtotal,
      tax: finalPricing.tax,
      deliveryCharge: finalPricing.deliveryCharges,
      totalAmount: finalPricing.totalAmount
    };

    // Here you would typically make an API call to create the order
    console.log('Order data:', orderData);
     createOrderMutation.mutate(orderData);
    
    // For now, just clear cart and redirect
    // clearCart();
    // navigate('/orders');
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (cart.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Checkout Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Shipping Information</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                name="customerPhone"
                value={formData.customerPhone}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                name="customerAddress"
                value={formData.customerAddress}
                onChange={handleInputChange}
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Area
              </label>
              <input
                type="text"
                name="customerArea"
                value={formData.customerArea}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Instructions (Optional)
              </label>
              <textarea
                name="deliveryInstructions"
                value={formData.deliveryInstructions}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="cod">Cash on Delivery</option>
                <option value="online">Online Payment</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700"
            >
              Place Order
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Summary</h2>
          
          {/* Cart Items */}
          <div className="space-y-4 mb-6">
            {cart.map((item) => (
              <div key={item._id} className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-600">
                    {item.quantity} x ₹{item.price} per {item.unit}
                  </p>
                </div>
                <span className="font-medium text-gray-900">
                  ₹{item.price * item.quantity}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 pt-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">₹{finalPricing.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">
                Tax ({pricingData?.breakdown?.taxRate ? (pricingData.breakdown.taxRate * 100).toFixed(1) : '10'}%):
              </span>
              <span className="font-medium">₹{Math.round(finalPricing.tax).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">
                Delivery {pricingData?.breakdown?.deliveryConfig?.type === 'threshold' && 
                        finalPricing.subtotal >= pricingData.breakdown.deliveryConfig.freeDeliveryThreshold ? 
                        '(Free)' : ''}:
              </span>
              <span className="font-medium">₹{Math.round(finalPricing.deliveryCharges).toLocaleString()}</span>
            </div>
            {finalPricing.platformFee && finalPricing.platformFee > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Platform Fee:</span>
                <span className="font-medium">₹{Math.round(finalPricing.platformFee).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold">
              <span className="text-gray-900">Total:</span>
              <span className="text-gray-900">₹{Math.round(finalPricing.totalAmount).toLocaleString()}</span>
            </div>
            {pricingLoading && (
              <div className="text-xs text-blue-600 mt-1">Updating prices...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
