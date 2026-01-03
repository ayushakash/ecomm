import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';
import GSTInvoicePreview from './GSTInvoicePreview';

const OrderDetailsModal = ({ show, onHide, order }) => {
  const [sendingGSTBill, setSendingGSTBill] = useState(false);
  const [showGSTPreview, setShowGSTPreview] = useState(false);
  const [gstBillForm, setGstBillForm] = useState({
    email: '',
    whatsapp: ''
  });

  if (!show || !order) return null;

  const handleSendGSTBill = async (method) => {
    if (method === 'email' && !gstBillForm.email) {
      toast.error('Please enter email address');
      return;
    }

    if (method === 'whatsapp' && !gstBillForm.whatsapp) {
      toast.error('Please enter WhatsApp number');
      return;
    }

    setSendingGSTBill(true);
    try {
      // TODO: Replace with actual API call when backend endpoint is ready
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call

      if (method === 'email') {
        toast.success(`GST invoice sent to ${gstBillForm.email}`);
      } else {
        toast.success(`GST invoice sent to WhatsApp: ${gstBillForm.whatsapp}`);
      }

      // Reset form
      setGstBillForm({ email: '', whatsapp: '' });
    } catch (error) {
      toast.error('Failed to send GST invoice');
    } finally {
      setSendingGSTBill(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "assigned":
        return "bg-blue-100 text-blue-800";
      case "processing":
        return "bg-purple-100 text-purple-800";
      case "shipped":
        return "bg-indigo-100 text-indigo-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const deliveryAddress = order.deliveryAddressId || {};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Order Details</h2>
            <p className="text-primary-100 text-sm">#{order.orderNumber}</p>
          </div>
          <button
            onClick={onHide}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Order Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div className="text-sm text-blue-600 font-medium mb-1">Order Status</div>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.orderStatus)}`}>
                {order.orderStatus?.charAt(0).toUpperCase() + order.orderStatus?.slice(1)}
              </span>
            </div>
            <div className="bg-green-50 p-4 rounded-xl border border-green-200">
              <div className="text-sm text-green-600 font-medium mb-1">Total Amount</div>
              <div className="text-2xl font-bold text-gray-900">₹{order.totalAmount?.toLocaleString()}</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
              <div className="text-sm text-purple-600 font-medium mb-1">Payment Method</div>
              <div className="text-lg font-semibold text-gray-900">{order.paymentMethod?.toUpperCase() || 'COD'}</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <div className="text-sm text-orange-600 font-medium mb-1">Order Date</div>
              <div className="text-sm font-semibold text-gray-900">
                {new Date(order.createdAt).toLocaleDateString()}
              </div>
              <div className="text-xs text-gray-600">
                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* Customer & Delivery Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Details */}
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Customer Information
              </h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-500">Name:</span>
                  <p className="text-gray-900 font-medium">{order.customerName}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Phone:</span>
                  <p className="text-gray-900 font-medium">{order.customerPhone}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Email:</span>
                  <p className="text-gray-900 font-medium">{order.customerId?.email || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Delivery Address
              </h3>
              <div className="space-y-1">
                <p className="text-gray-900 font-medium">{deliveryAddress.fullName || order.customerName}</p>
                <p className="text-gray-700">{deliveryAddress.addressLine1}</p>
                {deliveryAddress.addressLine2 && <p className="text-gray-700">{deliveryAddress.addressLine2}</p>}
                {deliveryAddress.landmark && <p className="text-gray-700">Landmark: {deliveryAddress.landmark}</p>}
                <p className="text-gray-700">{deliveryAddress.area}, {deliveryAddress.city}</p>
                <p className="text-gray-700">{deliveryAddress.state} - {deliveryAddress.pincode}</p>
                {order.deliveryInstructions && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <span className="text-sm text-gray-500">Instructions:</span>
                    <p className="text-gray-900">{order.deliveryInstructions}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Order Items ({order.items?.length || 0})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white border-b-2 border-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Product</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Quantity</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Unit Price</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Merchant</th>
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
                      <td className="px-4 py-3">
                        {item.assignedMerchantId ? (
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {item.assignedMerchantId.businessName || item.assignedMerchantId.name}
                            </div>
                            <div className="text-xs text-gray-500">{item.assignedMerchantId.name}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-red-600 font-medium">Unassigned</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Pricing Breakdown</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-gray-700">
                <span>Taxable Amount (Base):</span>
                <span className="font-medium">₹{((order.subtotal || 0) - (order.tax || 0))?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>GST (18%):</span>
                <span className="font-medium">₹{order.tax?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-gray-700 pb-2 border-b-2 border-gray-300">
                <span className="font-semibold">Subtotal (Inc. GST):</span>
                <span className="font-semibold">₹{order.subtotal?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Delivery Charge:</span>
                <span className="font-medium">₹{order.deliveryCharge?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {order.platformFee > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Platform Fee:</span>
                  <span className="font-medium">₹{order.platformFee?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="border-t-2 border-gray-300 pt-2 mt-2">
                <div className="flex justify-between text-lg font-bold text-gray-900">
                  <span>Total Amount:</span>
                  <span>₹{order.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* GST Invoice Required */}
          {order.requireGSTBill && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-amber-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold text-amber-800">Customer requested GST invoice</span>
              </div>
            </div>
          )}

          {/* GST Invoice Actions Section */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              GST Invoice Actions
            </h3>

            {/* Preview GST Invoice Button */}
            <div className="mb-6">
              <button
                onClick={() => setShowGSTPreview(true)}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview GST Invoice
              </button>
            </div>

            <div className="border-t border-indigo-300 pt-6 mb-4">
              <h4 className="text-md font-bold text-gray-800 mb-3">Send GST Invoice Manually</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Send via Email */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📧 Send via Email
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="customer@example.com"
                    value={gstBillForm.email}
                    onChange={(e) => setGstBillForm({ ...gstBillForm, email: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => handleSendGSTBill('email')}
                    disabled={sendingGSTBill || !gstBillForm.email}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {sendingGSTBill ? 'Sending...' : 'Send'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Default: {order.customerId?.email || 'No email'}</p>
              </div>

              {/* Send via WhatsApp */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📱 Send via WhatsApp
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={gstBillForm.whatsapp}
                    onChange={(e) => setGstBillForm({ ...gstBillForm, whatsapp: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => handleSendGSTBill('whatsapp')}
                    disabled={sendingGSTBill || !gstBillForm.whatsapp}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {sendingGSTBill ? 'Sending...' : 'Send'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Default: {order.customerPhone || 'No phone'}</p>
              </div>
            </div>

            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-700">
                <strong>Note:</strong> This is a manual send feature. The GST invoice will be generated and sent to the specified email or WhatsApp number. Make sure the contact details are correct before sending.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-end gap-3">
            <button
              onClick={onHide}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* GST Invoice Preview Modal */}
      <GSTInvoicePreview
        show={showGSTPreview}
        onHide={() => setShowGSTPreview(false)}
        order={order}
      />
    </div>
  );
};

export default OrderDetailsModal;
