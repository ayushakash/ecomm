import { useState } from 'react';
import {
  XMarkIcon,
  UserIcon,
  MapPinIcon,
  PhoneIcon,
  CalendarIcon,
  TruckIcon,
  CurrencyRupeeIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';

const MerchantOrderDetailsModal = ({ show, onHide, order }) => {
  const [activeTab, setActiveTab] = useState('details');

  if (!show || !order) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "assigned":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "processing":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "shipped":
        return "bg-indigo-100 text-indigo-800 border-indigo-300";
      case "delivered":
        return "bg-green-100 text-green-800 border-green-300";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const deliveryAddress = order.deliveryAddressId || order.shippingAddress || {};

  // Calculate items total
  const itemsTotal = order.items?.reduce((sum, item) => {
    return sum + ((item.unitPrice || 0) * (item.quantity || 0));
  }, 0) || 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-4 sm:px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <ClipboardDocumentListIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Order #{order.orderNumber}</h2>
              <p className="text-blue-100 text-xs sm:text-sm">
                {new Date(order.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onHide}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-gray-50 sm:hidden flex-shrink-0">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'details'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                : 'text-gray-500'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('items')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'items'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                : 'text-gray-500'
            }`}
          >
            Items ({order.items?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('payout')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'payout'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                : 'text-gray-500'
            }`}
          >
            Payout
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Order Status & Distance Badge - Always visible */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${getStatusColor(order.orderStatus || order.items?.[0]?.itemStatus)}`}>
              {(order.orderStatus || order.items?.[0]?.itemStatus || 'pending').charAt(0).toUpperCase() +
               (order.orderStatus || order.items?.[0]?.itemStatus || 'pending').slice(1)}
            </span>
            {order.distance !== null && order.distance !== undefined && (
              <span
                className={`px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1 ${
                  order.isNearby
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-orange-100 text-orange-800 border border-orange-300'
                }`}
              >
                <MapPinIcon className="w-4 h-4" />
                {order.distance} km {!order.isNearby && '(Far)'}
              </span>
            )}
          </div>

          {/* Details Tab Content (Mobile) / Always visible on Desktop */}
          <div className={`space-y-4 sm:space-y-6 ${activeTab !== 'details' ? 'hidden sm:block' : ''}`}>
            {/* Summary Cards - Desktop */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <div className="text-xs text-blue-600 font-medium mb-1">Payment Method</div>
                <div className="text-lg font-bold text-gray-900">{order.paymentMethod?.toUpperCase() || 'COD'}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                <div className="text-xs text-green-600 font-medium mb-1">COD to Collect</div>
                <div className="text-lg font-bold text-green-700">
                  ₹{order.merchantPayout?.codCollectionAmount?.toLocaleString() || order.totalAmount?.toLocaleString()}
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                <div className="text-xs text-purple-600 font-medium mb-1">Your Payout</div>
                <div className="text-lg font-bold text-purple-700">
                  ₹{order.merchantPayout?.netPayout?.toLocaleString() || itemsTotal.toLocaleString()}
                </div>
              </div>
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                <div className="text-xs text-orange-600 font-medium mb-1">Items</div>
                <div className="text-lg font-bold text-gray-900">{order.items?.length || 0} items</div>
              </div>
            </div>

            {/* Mobile Summary */}
            <div className="sm:hidden grid grid-cols-2 gap-3">
              <div className="bg-green-50 p-3 rounded-xl border border-green-200">
                <div className="text-xs text-green-600 font-medium">COD to Collect</div>
                <div className="text-lg font-bold text-green-700">
                  ₹{order.merchantPayout?.codCollectionAmount?.toLocaleString() || order.totalAmount?.toLocaleString()}
                </div>
              </div>
              <div className="bg-purple-50 p-3 rounded-xl border border-purple-200">
                <div className="text-xs text-purple-600 font-medium">Your Payout</div>
                <div className="text-lg font-bold text-purple-700">
                  ₹{order.merchantPayout?.netPayout?.toLocaleString() || itemsTotal.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Customer & Delivery Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Customer Details */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center">
                  <UserIcon className="w-5 h-5 mr-2 text-blue-600" />
                  Customer
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-gray-700 font-medium">{order.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <PhoneIcon className="w-4 h-4 text-gray-400" />
                    <a href={`tel:${order.customerPhone}`} className="text-blue-600 hover:underline">
                      {order.customerPhone}
                    </a>
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center">
                  <TruckIcon className="w-5 h-5 mr-2 text-blue-600" />
                  Delivery Address
                </h3>
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-gray-900">{deliveryAddress.fullName || order.customerName}</p>
                  <p className="text-gray-700">{deliveryAddress.addressLine1 || deliveryAddress.street || order.customerAddress}</p>
                  {deliveryAddress.addressLine2 && <p className="text-gray-600">{deliveryAddress.addressLine2}</p>}
                  {deliveryAddress.landmark && <p className="text-gray-600">Near: {deliveryAddress.landmark}</p>}
                  <p className="text-gray-700">
                    {deliveryAddress.area && `${deliveryAddress.area}, `}
                    {deliveryAddress.city || order.customerArea}
                    {deliveryAddress.pincode && ` - ${deliveryAddress.pincode}`}
                  </p>
                  {deliveryAddress.phoneNumber && (
                    <p className="text-gray-600 flex items-center gap-1">
                      <PhoneIcon className="w-3 h-3" />
                      {deliveryAddress.phoneNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Items Tab Content (Mobile) / Always visible on Desktop */}
          <div className={`${activeTab !== 'items' ? 'hidden sm:block' : ''}`}>
            {/* Order Items */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center">
                <CurrencyRupeeIcon className="w-5 h-5 mr-2 text-blue-600" />
                Order Items ({order.items?.length || 0})
              </h3>

              {/* Mobile Items List */}
              <div className="sm:hidden space-y-3">
                {order.items?.map((item, index) => (
                  <div key={item._id || index} className="bg-white p-3 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.productName}</p>
                        <p className="text-xs text-gray-500">{item.unit || 'unit'}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(item.itemStatus)}`}>
                        {item.itemStatus?.charAt(0).toUpperCase() + item.itemStatus?.slice(1)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">
                        {item.quantity} x ₹{item.unitPrice?.toLocaleString()}
                      </span>
                      <span className="font-semibold text-gray-900">
                        ₹{((item.unitPrice || 0) * (item.quantity || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Items Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white border-b-2 border-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Product</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Qty</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Unit Price</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {order.items?.map((item, index) => (
                      <tr key={item._id || index} className="bg-white hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{item.productName}</div>
                          <div className="text-xs text-gray-500">{item.unit || 'unit'}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          ₹{item.unitPrice?.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          ₹{((item.unitPrice || 0) * (item.quantity || 0)).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.itemStatus)}`}>
                            {item.itemStatus?.charAt(0).toUpperCase() + item.itemStatus?.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Payout Tab Content (Mobile) / Always visible on Desktop */}
          <div className={`${activeTab !== 'payout' ? 'hidden sm:block' : ''}`}>
            {/* Merchant Payout Breakdown */}
            {order.merchantPayout && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center">
                  <CurrencyRupeeIcon className="w-5 h-5 mr-2 text-green-600" />
                  Your Payout Breakdown
                </h3>
                <div className="space-y-2 text-sm">
                  {order.merchantPayout.itemizedBill && (
                    <>
                      <div className="flex justify-between text-gray-700">
                        <span>Items Subtotal:</span>
                        <span className="font-medium">₹{order.merchantPayout.itemizedBill.subtotal?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-gray-700">
                        <span>Delivery Charge:</span>
                        <span className="font-medium">₹{order.merchantPayout.itemizedBill.deliveryCharge?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-gray-700">
                        <span>Platform Fee:</span>
                        <span className="font-medium">₹{order.merchantPayout.itemizedBill.platformFee?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-gray-700">
                        <span>Tax (GST):</span>
                        <span className="font-medium">₹{order.merchantPayout.itemizedBill.tax?.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                  <div className="border-t-2 border-green-300 pt-2 mt-2">
                    <div className="flex justify-between text-base font-bold text-green-700">
                      <span>COD to Collect:</span>
                      <span>₹{order.merchantPayout.codCollectionAmount?.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-orange-700 pt-1">
                    <span>You Owe Platform:</span>
                    <span className="font-semibold">₹{order.merchantPayout.amountOwePlatform?.toLocaleString()}</span>
                  </div>
                  <div className="bg-green-100 -mx-4 -mb-4 mt-3 p-4 rounded-b-xl">
                    <div className="flex justify-between text-lg font-bold text-green-800">
                      <span>Your Net Payout:</span>
                      <span>₹{order.merchantPayout.netPayout?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Order Timeline/Date */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center">
                <CalendarIcon className="w-5 h-5 mr-2 text-blue-600" />
                Order Timeline
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Placed:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                {order.updatedAt && order.updatedAt !== order.createdAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Updated:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(order.updatedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-sm text-gray-600 text-center sm:text-left">
              {order.paymentMethod?.toUpperCase() === 'COD' && (
                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                  Collect ₹{order.merchantPayout?.codCollectionAmount?.toLocaleString() || order.totalAmount?.toLocaleString()} on delivery
                </span>
              )}
            </div>
            <button
              onClick={onHide}
              className="w-full sm:w-auto px-6 py-2.5 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-900 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MerchantOrderDetailsModal;
