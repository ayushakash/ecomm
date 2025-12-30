import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

const Payouts = () => {
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['merchant-orders'],
    queryFn: async () => {
      const res = await api.get('/api/orders');
      return res.data;
    }
  });

  const orders = ordersData?.orders || [];

  // Calculate totals across all orders
  const totals = orders.reduce((acc, order) => {
    if (order.merchantPayout) {
      acc.totalCOD += order.merchantPayout.codCollectionAmount || 0;
      acc.totalPayout += order.merchantPayout.netPayout || 0;
      acc.totalCommission += order.merchantPayout.platformCommission || 0;
      acc.totalPlatformFee += order.merchantPayout.platformFeeShare || 0;
      acc.totalDelivery += order.merchantPayout.deliveryShare || 0;
      acc.totalTax += order.merchantPayout.taxShare || 0;
      acc.totalOwePlatform += order.merchantPayout.amountOwePlatform || 0;
    }
    return acc;
  }, {
    totalCOD: 0,
    totalPayout: 0,
    totalCommission: 0,
    totalPlatformFee: 0,
    totalDelivery: 0,
    totalTax: 0,
    totalOwePlatform: 0
  });

  const totalOwePlatform = totals.totalOwePlatform;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Payouts & Settlements</h1>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <>
          {/* Summary Card */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-6 mb-8 text-white">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm opacity-90 mb-1">Total COD Collected</p>
                <p className="text-3xl font-bold">₹{totals.totalCOD.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm opacity-90 mb-1">Your Total Payout</p>
                <p className="text-3xl font-bold text-green-300">₹{totals.totalPayout.toLocaleString()}</p>
              </div>
              <div className="border-l-2 border-white/30 pl-6">
                <p className="text-sm opacity-90 mb-1">
                  {totalOwePlatform >= 0 ? 'You Owe Platform' : 'Platform Owes You'}
                </p>
                <p className={`text-4xl font-black ${totalOwePlatform >= 0 ? 'text-red-300' : 'text-green-300'}`}>
                  ₹{Math.abs(totalOwePlatform).toLocaleString()}
                </p>
                <p className="text-xs mt-2 opacity-75">
                  {totalOwePlatform >= 0
                    ? 'Transfer this amount to platform'
                    : 'Platform will pay you this amount'}
                </p>
              </div>
            </div>

            {/* Breakdown */}
            <div className="mt-6 pt-6 border-t border-white/30">
              <p className="text-sm font-semibold mb-3">Total Platform Charges:</p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="opacity-75">Commission</p>
                  <p className="font-semibold">₹{totals.totalCommission.toLocaleString()}</p>
                </div>
                <div>
                  <p className="opacity-75">Platform Fee</p>
                  <p className="font-semibold">₹{totals.totalPlatformFee.toLocaleString()}</p>
                </div>
                <div>
                  <p className="opacity-75">Delivery Share</p>
                  <p className="font-semibold">₹{totals.totalDelivery.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Per-Order Breakdown */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Order-wise Breakdown</h2>

            {orders.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                No orders found
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  order.merchantPayout && (
                    <div key={order._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                      {/* Order Header */}
                      <div className="bg-gray-50 px-6 py-3 border-b flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-gray-900">Order #{order.orderNumber}</span>
                          <span className="text-sm text-gray-500 ml-4">
                            {new Date(order.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          order.orderStatus === 'delivered'
                            ? 'bg-green-100 text-green-800'
                            : order.orderStatus === 'processing'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.orderStatus?.charAt(0).toUpperCase() + order.orderStatus?.slice(1)}
                        </span>
                      </div>

                      {/* Payout Details */}
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
                          <div className="bg-green-50 rounded-lg p-4">
                            <p className="text-xs text-gray-600 mb-1">COD Collected</p>
                            <p className="text-2xl font-bold text-green-700">
                              ₹{order.merchantPayout.codCollectionAmount?.toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-blue-50 rounded-lg p-4">
                            <p className="text-xs text-gray-600 mb-1">Your Base Cost</p>
                            <p className="text-2xl font-bold text-blue-700">
                              ₹{order.merchantPayout.itemsBaseValue?.toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-purple-50 rounded-lg p-4">
                            <p className="text-xs text-gray-600 mb-1">Your Payout</p>
                            <p className="text-2xl font-bold text-purple-700">
                              ₹{order.merchantPayout.netPayout?.toLocaleString()}
                            </p>
                          </div>
                          <div className={`rounded-lg p-4 ${
                            (order.merchantPayout.amountOwePlatform || 0) >= 0
                              ? 'bg-red-50'
                              : 'bg-green-50'
                          }`}>
                            <p className="text-xs text-gray-600 mb-1">
                              {(order.merchantPayout.amountOwePlatform || 0) >= 0
                                ? 'Owe Platform'
                                : 'Platform Owes'}
                            </p>
                            <p className={`text-2xl font-bold ${
                              (order.merchantPayout.amountOwePlatform || 0) >= 0
                                ? 'text-red-700'
                                : 'text-green-700'
                            }`}>
                              ₹{Math.abs(order.merchantPayout.amountOwePlatform || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Items List */}
                        <div className="border-t pt-4">
                          <p className="text-sm font-semibold text-gray-700 mb-2">
                            Items ({order.merchantPayout.itemsCount}):
                          </p>
                          <div className="space-y-1 text-sm text-gray-600">
                            {order.items?.map((item, idx) => (
                              <div key={idx} className="flex justify-between">
                                <span>• {item.productName} × {item.quantity}</span>
                                <span className="font-medium">₹{item.totalPrice?.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Platform Charges */}
                        <div className="border-t mt-4 pt-4">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Platform Charges to Remit:</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Commission:</span>
                              <span className="font-medium">₹{order.merchantPayout.platformCommission?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Platform Fee:</span>
                              <span className="font-medium">₹{order.merchantPayout.platformFeeShare?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Delivery Share:</span>
                              <span className="font-medium">₹{order.merchantPayout.deliveryShare?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Tax (GST):</span>
                              <span className="font-medium">₹{order.merchantPayout.taxShare?.toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t flex justify-between font-semibold">
                            <span className="text-gray-700">Total to Remit:</span>
                            <span className="text-red-700">₹{order.merchantPayout.amountOwePlatform?.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Customer Info */}
                        <div className="border-t mt-4 pt-4 text-sm text-gray-600">
                          <p><strong>Customer:</strong> {order.customerName} ({order.customerPhone})</p>
                        </div>
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Payouts;
