import React from 'react';
import {
  UserIcon,
  CalendarIcon,
  CurrencyRupeeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TruckIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

const MerchantOrderCard = ({
  order,
  tab,
  getStatusColor,
  onRespond,
  onUpdateStatus
}) => {
  const isNewOrder = tab === "new";

  // Calculate merchant's items total (sum of totalPrice for all items)
  const merchantItemsTotal = order.items?.reduce((sum, item) => {
    return sum + (item.totalPrice || (item.unitPrice * item.quantity) || 0);
  }, 0) || 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isNewOrder
                ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                : 'bg-gradient-to-br from-blue-500 to-purple-600'
            }`}>
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

          {/* Distance Badge (for new orders) */}
          {isNewOrder && (
            <div className="flex flex-col items-end gap-1">
              {order.distance !== null && order.distance !== undefined && (
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full flex items-center gap-1 ${
                    order.isNearby
                      ? 'bg-green-100 text-green-800'
                      : 'bg-orange-100 text-orange-800'
                  }`}
                >
                  <MapPinIcon className="w-3 h-3" />
                  {order.distance} km
                </span>
              )}
              {!order.isNearby && (
                <span className="text-xs text-orange-600 font-medium">Far delivery</span>
              )}
            </div>
          )}

          {/* Status Badge */}
          {!isNewOrder && (
            <span
              className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                order.orderStatus || 'pending'
              )}`}
            >
              {(order.orderStatus || 'pending').charAt(0).toUpperCase() +
               (order.orderStatus || 'pending').slice(1)}
            </span>
          )}
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

        {/* Amount & Bill Breakdown */}
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <CurrencyRupeeIcon className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              {order.merchantPayout ? (
                <>
                  <p className="font-semibold text-green-600 text-lg">₹{order.merchantPayout.codCollectionAmount?.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">COD to Collect from Customer</p>
                </>
              ) : (
                <>
                  <p className="font-medium text-gray-900">₹{merchantItemsTotal?.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Your Items Total</p>
                </>
              )}
            </div>
          </div>

          {/* Detailed Bill Breakdown */}
          {order.merchantPayout?.itemizedBill && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 ml-8">
              <h5 className="text-xs font-semibold text-blue-900 mb-2">📋 Your Bill Breakdown</h5>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Items Subtotal:</span>
                  <span className="font-medium text-gray-900">₹{order.merchantPayout.itemizedBill.subtotal?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery Charge ({order.merchantPayout.merchantSharePercent}%):</span>
                  <span className="font-medium text-gray-900">₹{order.merchantPayout.itemizedBill.deliveryCharge?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Platform Fee ({order.merchantPayout.merchantSharePercent}%):</span>
                  <span className="font-medium text-gray-900">₹{order.merchantPayout.itemizedBill.platformFee?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax (GST):</span>
                  <span className="font-medium text-gray-900">₹{order.merchantPayout.itemizedBill.tax?.toLocaleString()}</span>
                </div>
                <div className="border-t border-blue-300 pt-1 mt-1 flex justify-between font-semibold">
                  <span className="text-blue-900">Total to Collect:</span>
                  <span className="text-green-600">₹{order.merchantPayout.itemizedBill.totalAmount?.toLocaleString()}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-blue-300">
                  <div className="flex justify-between text-orange-700">
                    <span>You Owe Platform:</span>
                    <span className="font-semibold">₹{order.merchantPayout.amountOwePlatform?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-green-700 font-semibold">
                    <span>Your Final Payout:</span>
                    <span>₹{order.merchantPayout.netPayout?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Address */}
        <div className="flex items-start space-x-3">
          <div className="w-5 h-5 text-gray-400 mt-0.5">
            📍
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {order.shippingAddress?.addressLine1 ||
               order.shippingAddress?.street ||
               order.customerAddress || 'Address not available'}
            </p>
            <p className="text-sm text-gray-500">
              {order.shippingAddress?.city || order.customerArea || ''} {order.shippingAddress?.pincode || ''}
            </p>
          </div>
        </div>

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

        {/* Items */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900 flex items-center">
            <div className="w-5 h-5 bg-gray-100 rounded mr-3 flex items-center justify-center">
              <span className="text-xs font-bold text-gray-600">{order.items?.length || 0}</span>
            </div>
            Items
          </h4>
          {order.items?.slice(0, 3).map((item, index) => (
            <div key={item._id || index} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
              </div>
              {!isNewOrder && (
                <span
                  className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                    item.itemStatus || "pending"
                  )}`}
                >
                  {item.itemStatus
                    ? item.itemStatus.charAt(0).toUpperCase() + item.itemStatus.slice(1)
                    : "Pending"}
                </span>
              )}
            </div>
          ))}
          {order.items?.length > 3 && (
            <p className="text-xs text-gray-500 text-center">
              +{order.items.length - 3} more items
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
        {isNewOrder ? (
          <div className="flex space-x-2">
            <button
              onClick={() => onRespond && onRespond(order._id, order.items.map(item => item._id), "accept")}
              className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              <CheckCircleIcon className="w-4 h-4 mr-1" />
              Accept All ({order.items?.length || 0})
            </button>
            <button
              onClick={() => onRespond && onRespond(order._id, order.items.map(item => item._id), "reject")}
              className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              <XCircleIcon className="w-4 h-4 mr-1" />
              Reject
            </button>
          </div>
        ) : (
          <div className="flex space-x-2">
            {(() => {
              // Check item statuses (for merchant, all their items should have same status)
              const allItemIds = order.items.map(item => item._id);
              const status = order.items.length > 0 ? order.items[0].itemStatus : 'assigned';

              if (status === 'assigned' || status === 'pending') {
                return (
                  <button
                    onClick={() => onUpdateStatus && onUpdateStatus(order._id, allItemIds, "processing")}
                    className="w-full inline-flex items-center justify-center px-3 py-2 border border-blue-300 text-sm font-medium rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <ClockIcon className="w-4 h-4 mr-1" />
                    Start Processing ({order.items?.length || 0})
                  </button>
                );
              } else if (status === 'processing') {
                return (
                  <button
                    onClick={() => onUpdateStatus && onUpdateStatus(order._id, allItemIds, "shipped")}
                    className="w-full inline-flex items-center justify-center px-3 py-2 border border-indigo-300 text-sm font-medium rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  >
                    <TruckIcon className="w-4 h-4 mr-1" />
                    Mark as Shipped ({order.items?.length || 0})
                  </button>
                );
              } else if (status === 'shipped') {
                return (
                  <button
                    onClick={() => onUpdateStatus && onUpdateStatus(order._id, allItemIds, "delivered")}
                    className="w-full inline-flex items-center justify-center px-3 py-2 border border-green-300 text-sm font-medium rounded-lg text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                  >
                    ✅ Mark as Delivered ({order.items?.length || 0})
                  </button>
                );
              } else if (status === 'delivered') {
                return (
                  <div className="w-full text-center">
                    <span className="text-green-600 text-sm font-medium">✅ Order Completed</span>
                  </div>
                );
              }
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default MerchantOrderCard;