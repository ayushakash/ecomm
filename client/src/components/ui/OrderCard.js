import React from 'react';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  UserIcon,
  CalendarIcon,
  CurrencyRupeeIcon,
  BuildingStorefrontIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const OrderCard = ({
  order,
  onShowLifecycle,
  onShowDetails,
  getStatusColor,
  getOrderMerchantInfo,
  expandedOrders,
  toggleExpand,
  children // For expanded content
}) => {
  const merchantInfo = getOrderMerchantInfo ? getOrderMerchantInfo(order) : null;
  const isExpanded = expandedOrders && expandedOrders[order._id];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                #{order.orderNumber?.slice(-3) || '000'}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Order #{order.orderNumber}</h3>
              <p className="text-sm text-gray-500">
                {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <span
            className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
              order.orderStatus || 'pending'
            )}`}
          >
            {(order.orderStatus || 'pending').charAt(0).toUpperCase() +
             (order.orderStatus || 'pending').slice(1)}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* Customer Info */}
        <div className="flex items-center space-x-3">
          <UserIcon className="w-5 h-5 text-gray-400" />
          <div>
            <p className="font-medium text-gray-900">{order.customerName}</p>
            <p className="text-sm text-gray-500">{order.customerPhone}</p>
          </div>
        </div>

        {/* Amount */}
        <div className="flex items-center space-x-3">
          <CurrencyRupeeIcon className="w-5 h-5 text-gray-400" />
          <div>
            <p className="font-medium text-gray-900">₹{order.totalAmount?.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Total Amount</p>
          </div>
        </div>

        {/* Merchant Info */}
        {merchantInfo && (
          <div className="flex items-center space-x-3">
            <BuildingStorefrontIcon className="w-5 h-5 text-gray-400" />
            <div>
              {merchantInfo.type === 'single_merchant' ? (
                <>
                  <p className="font-medium text-gray-900">
                    {merchantInfo.merchant.businessName || merchantInfo.merchant.name}
                  </p>
                  <p className="text-sm text-gray-500">{merchantInfo.merchant.name}</p>
                </>
              ) : merchantInfo.type === 'unassigned' ? (
                <p className="text-sm text-red-600">
                  {merchantInfo.count} items unassigned
                </p>
              ) : (
                <p className="text-sm text-blue-600">Multiple merchants</p>
              )}
            </div>
          </div>
        )}

        {/* Date */}
        <div className="flex items-center space-x-3">
          <CalendarIcon className="w-5 h-5 text-gray-400" />
          <div>
            <p className="font-medium text-gray-900">
              {new Date(order.createdAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
            <p className="text-sm text-gray-500">Order Date</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {onShowDetails && (
              <button
                onClick={() => onShowDetails(order)}
                className="inline-flex items-center px-3 py-1.5 border border-purple-300 text-xs font-medium rounded-lg text-purple-700 bg-white hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
              >
                📄 Details
              </button>
            )}
            {onShowLifecycle && (
              <button
                onClick={() => onShowLifecycle(order)}
                className="inline-flex items-center px-3 py-1.5 border border-green-300 text-xs font-medium rounded-lg text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                📋 Lifecycle
              </button>
            )}
          </div>

          {/* Expand button */}
          {toggleExpand && (
            <button
              onClick={() => toggleExpand(order._id)}
              className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {isExpanded ? (
                <ChevronUpIcon className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDownIcon className="w-4 h-4 text-gray-500" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && children && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          {children}
        </div>
      )}
    </div>
  );
};

export default OrderCard;