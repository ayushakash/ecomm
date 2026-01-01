import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CheckCircleIcon,
  ShoppingBagIcon,
  HomeIcon,
  ClockIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

const OrderSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const orderData = location.state?.orderData;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircleIcon className="w-12 h-12 text-green-600" />
          </div>
        </div>

        {/* Success Message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Order Placed Successfully!
        </h1>
        <p className="text-gray-600 mb-6">
          Thank you for your order. We'll prepare your items and deliver them soon.
        </p>

        {/* Order Details */}
        {orderData && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Order Number</span>
              <span className="text-sm font-bold text-gray-900">{orderData.orderNumber || 'Generating...'}</span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Total Amount</span>
              <span className="text-sm font-bold text-green-600">₹{orderData.totalAmount || '0'}</span>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-sm font-medium text-gray-700">Delivery To</span>
              <span className="text-sm text-gray-900 text-right flex-1 ml-2">
                {orderData.customerAddress || 'Your selected address'}
              </span>
            </div>
          </div>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 gap-3 mb-8">
          <div className="flex items-center p-3 bg-green-50 rounded-lg">
            <MapPinIcon className="w-5 h-5 text-green-600 mr-3" />
            <div className="text-left">
              <p className="text-sm font-medium text-green-900">Free Delivery</p>
              <p className="text-xs text-green-700">No additional charges</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/profile/orders')}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <ShoppingBagIcon className="w-5 h-5 mr-2" />
            View My Orders
          </button>

          <button
            onClick={() => navigate('/')}
            className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
          >
            <HomeIcon className="w-5 h-5 mr-2" />
            Continue Shopping
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            You will receive order updates via SMS and email. For any queries, contact our support team.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;