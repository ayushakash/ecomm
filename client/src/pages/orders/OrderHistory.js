import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orderAPI } from "../../services/api";
import { toast } from 'react-hot-toast';
import ConfirmationModal from "../../components/ui/ConfirmationModal";

const OrderHistory = () => {
  const queryClient = useQueryClient();
  const { data: orderList, isLoading, error, refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: () => orderAPI.getOrders(),
    staleTime: 0, // Data is always considered stale
    cacheTime: 5 * 60 * 1000, // Keep cache for 5 minutes
    refetchOnWindowFocus: true, // Refetch when user focuses window
    refetchOnReconnect: true, // Refetch when internet reconnects
  });
  console.log(orderList);

  const [openOrder, setOpenOrder] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);

  // Mutation for canceling order
  const cancelOrderMutation = useMutation({
    mutationFn: (orderId) => orderAPI.cancelOrder(orderId),
    onSuccess: () => {
      toast.success('Order cancelled successfully');
      queryClient.invalidateQueries(['orders']);
      setShowCancelModal(false);
      setOrderToCancel(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    }
  });

  // Handle cancel order with confirmation
  const handleCancelOrder = (orderId, orderNumber) => {
    setOrderToCancel({ id: orderId, number: orderNumber });
    setShowCancelModal(true);
  };

  const confirmCancelOrder = () => {
    if (orderToCancel) {
      cancelOrderMutation.mutate(orderToCancel.id);
    }
  };

  // Check if order can be cancelled (not delivered or already cancelled)
  const canCancelOrder = (status) => {
    return status !== 'delivered' && status !== 'cancelled';
  }; 

  const toggleOrder = (orderId) => {
    setOpenOrder(openOrder === orderId ? null : orderId);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "shipped":
        return "bg-purple-100 text-purple-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading orders: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Modern Header */}
      <div className="bg-primary-700 rounded-xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 text-white">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">📦 Order History</h1>
        <p className="text-gray-100 text-sm">Track all your orders in one place</p>
      </div>

      {orderList.orders?.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 sm:p-12 text-center">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">📦</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            No orders yet
          </h3>
          <p className="text-gray-600 mb-6">
            Start shopping to see your orders here!
          </p>
          <Link
            to="/products"
            className="inline-block bg-primary-700 hover:bg-primary-800 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {orderList.orders?.map((order) => (
            <div
              key={order._id}
              className="bg-white rounded-xl shadow-lg border border-gray-100 hover:border-secondary-400 hover:shadow-xl transition-all duration-300 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  {/* Left Side - Order Info */}
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                      Order #{order.orderNumber}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-semibold text-gray-900">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 9a2 2 0 10-4 0v5a2 2 0 01-2 2h6m-6-4h4m8 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>₹{(order.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side - Delivery Time & Status */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-start sm:justify-end">
                    {/* Expected Delivery Time */}
                    {order.expectedDeliveryDate && (order.orderStatus === 'processing' || order.orderStatus === 'shipped') && (
                      <>
                        {(() => {
                          console.log('🕒 Delivery Time Debug:', {
                            orderNumber: order.orderNumber,
                            status: order.orderStatus,
                            expectedDeliveryDate: order.expectedDeliveryDate,
                            currentTime: new Date().toISOString(),
                            rawExpectedDate: order.expectedDeliveryDate
                          });

                          const now = new Date();
                          const expectedDate = new Date(order.expectedDeliveryDate);
                          const diffMs = expectedDate - now;
                          const diffMins = Math.round(diffMs / (1000 * 60));

                          console.log('⏱️ Time Calculation:', {
                            now: now.toISOString(),
                            expectedDate: expectedDate.toISOString(),
                            diffMs,
                            diffMins
                          });

                          // Only show if delivery is in the future
                          if (diffMins > 0 && diffMins <= 120) {
                            return (
                              <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-success-50 border border-success-200">
                                <svg className="w-4 h-4 mr-2 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm font-semibold text-success-700">
                                  Arriving in {diffMins} mins
                                </span>
                              </div>
                            );
                          } else if (diffMins > 0 && diffMins <= 1440) {
                            // Show for up to 24 hours
                            const hours = Math.floor(diffMins / 60);
                            const mins = diffMins % 60;
                            return (
                              <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200">
                                <svg className="w-4 h-4 mr-2 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm font-medium text-blue-700">
                                  Expected: {hours > 0 ? `${hours}h ${mins}m` : `${mins} mins`}
                                </span>
                              </div>
                            );
                          } else if (diffMins < 0) {
                            // Delivery is overdue
                            return (
                              <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-primary-50 border border-primary-300">
                                <svg className="w-4 h-4 mr-2 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm font-medium text-primary-800">
                                  Delayed
                                </span>
                              </div>
                            );
                          }
                        })()}
                      </>
                    )}

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold shadow-sm ${getStatusColor(
                        order.orderStatus
                      )}`}
                    >
                      {order.orderStatus.charAt(0).toUpperCase() +
                        order.orderStatus.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Toggle Button */}
              <div className="px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-100">
                <button
                  onClick={() => toggleOrder(order._id)}
                  className="w-full flex items-center justify-center gap-2 text-primary-700 hover:text-primary-800 font-semibold text-sm transition-colors"
                >
                  <span>{openOrder === order._id ? "Hide Details" : "Show Details"}</span>
                  <svg
                    className={`w-5 h-5 transform transition-transform ${openOrder === order._id ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Expanded Section */}
              {openOrder === order._id && (
                <div className="p-4 sm:p-6 space-y-6 bg-white">
                  {/* Items */}
                  <div>
                    <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      Order Items
                    </h4>
                    <div className="space-y-3">
                      {order.items?.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 sm:gap-4 p-3 bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all"
                        >
                          {/* Product Image - Clickable */}
                          <Link
                            to={`/products/${item.productId?._id}`}
                            className="flex-shrink-0 group"
                          >
                            <img
                              src={item.productId?.images?.[0] || '/placeholder-product.jpg'}
                              alt={item.productName}
                              className="w-16 h-16 object-cover rounded-lg border border-gray-200 group-hover:border-primary-500 group-hover:shadow-lg transition-all cursor-pointer"
                            />
                          </Link>

                          {/* Product Details */}
                          <div className="flex-1 min-w-0">
                            <Link
                              to={`/products/${item.productId?._id}`}
                              className="font-semibold text-gray-900 text-sm sm:text-base hover:text-primary-700 transition-colors cursor-pointer inline-block"
                            >
                              {item.productName}
                            </Link>
                            <p className="text-xs sm:text-sm text-gray-600">
                              {item.quantity} x ₹{(item.unitPrice || 0).toLocaleString('en-IN')} / {item.unit}
                            </p>
                            {item.sku && (
                              <p className="text-xs text-gray-500 mt-0.5">SKU: {item.sku}</p>
                            )}
                          </div>

                          <div className="flex-shrink-0 text-right">
                            <span className="font-bold text-gray-900 text-sm sm:text-base">
                              ₹{((item.unitPrice || 0) * (item.quantity || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pricing Breakdown */}
                  <div>
                    <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Price Breakdown
                    </h4>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                      <div className="flex justify-between text-sm text-gray-700">
                        <span>Taxable Amount (Base)</span>
                        <span className="font-medium">₹{((order.subtotal || 0) - (order.tax || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-700">
                        <span>GST (18%)</span>
                        <span className="font-medium">₹{(order.tax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-700 pb-2 border-b border-gray-300">
                        <span className="font-semibold">Subtotal (Inc. GST)</span>
                        <span className="font-semibold">₹{(order.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-700">
                        <span>Delivery Charge</span>
                        <span className="font-medium">₹{(order.deliveryCharge || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      {order.platformFee && order.platformFee > 0 && (
                        <div className="flex justify-between text-sm text-gray-700">
                          <span>Platform Fee</span>
                          <span className="font-medium">₹{(order.platformFee || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <div className="border-t-2 border-gray-300 pt-2 mt-2 flex justify-between font-bold text-gray-900 text-base">
                        <span>Total Amount</span>
                        <span className="text-primary-700">₹{(order.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Address */}
                  <div>
                    <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Delivery Address
                    </h4>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                    {order.deliveryAddressId ? (
                      <div className="space-y-2">
                        <div className="flex items-center text-sm">
                          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="font-medium text-gray-900">
                            {order.deliveryAddressId.fullName}
                          </span>
                        </div>
                        <div className="flex items-center text-sm">
                          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span className="text-gray-700">
                            {order.deliveryAddressId.phoneNumber}
                          </span>
                        </div>
                        <div className="flex items-start text-sm">
                          <svg className="w-4 h-4 mr-2 mt-0.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-gray-700 leading-relaxed">
                            {order.deliveryAddressId.addressLine1}
                            {order.deliveryAddressId.addressLine2 && `, ${order.deliveryAddressId.addressLine2}`}
                            {order.deliveryAddressId.landmark && `, ${order.deliveryAddressId.landmark}`}
                            <br />
                            {order.deliveryAddressId.area}, {order.deliveryAddressId.city}, {order.deliveryAddressId.state} - {order.deliveryAddressId.pincode}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center text-sm">
                          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="font-medium text-gray-900">
                            {order.customerName}
                          </span>
                        </div>
                        <div className="flex items-center text-sm">
                          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span className="text-gray-700">
                            {order.customerPhone}
                          </span>
                        </div>
                        <div className="flex items-start text-sm">
                          <svg className="w-4 h-4 mr-2 mt-0.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-gray-700 leading-relaxed">
                            {order.customerAddress}
                          </span>
                        </div>
                      </div>
                      )}
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div className="bg-primary-50 rounded-xl border border-primary-200 p-4">
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <span className="font-semibold text-gray-900">Payment Method:</span>
                        <span className="capitalize font-medium text-gray-700">
                          {order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">Status:</span>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                          order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                          order.paymentStatus === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cancel Order Button */}
                  {canCancelOrder(order.orderStatus) && (
                    <div className="pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleCancelOrder(order._id, order.orderNumber)}
                        disabled={cancelOrderMutation.isLoading}
                        className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-danger-600 hover:bg-danger-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        {cancelOrderMutation.isLoading ? 'Cancelling...' : 'Cancel Order'}
                      </button>
                      <p className="text-xs text-gray-500 mt-2">
                        Note: Orders that have been delivered cannot be cancelled
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setOrderToCancel(null);
        }}
        onConfirm={confirmCancelOrder}
        title="Cancel Order"
        message={`Are you sure you want to cancel order #${orderToCancel?.number}? This action cannot be undone and the order will be permanently cancelled.`}
        confirmText="Yes, Cancel Order"
        cancelText="No, Keep Order"
        isLoading={cancelOrderMutation.isLoading}
      />
    </div>
  );
};

export default OrderHistory;
