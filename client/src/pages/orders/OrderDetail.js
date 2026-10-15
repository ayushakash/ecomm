import React from 'react';
import { PageSpinner } from '../../components/ui/Spinner';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { orderAPI } from '../../services/api';
import { useTranslation } from 'react-i18next';

const OrderDetail = () => {
  const { t } = useTranslation('orders');
  const { id } = useParams();

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', id],
  queryFn: () => orderAPI.getById(id)
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <PageSpinner />
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{t('detail.loadError', { message: error.message })}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">{t('detail.notFound')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Order Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {t('orderNumber', { number: order.orderNumber })}
            </h1>
            <p className="text-gray-600">
              {t('detail.placedOn', { date: new Date(order.createdAt).toLocaleDateString() })}
            </p>

            {/* Expected Delivery Time */}
            {order.expectedDeliveryDate && order.status !== 'delivered' && order.status !== 'cancelled' && (
              <div className="mt-4">
                {(() => {
                  const now = new Date();
                  const expectedDate = new Date(order.expectedDeliveryDate);
                  const diffMs = expectedDate - now;
                  const diffMins = Math.round(diffMs / (1000 * 60));

                  if (diffMins > 0 && diffMins <= 120) {
                    return (
                      <div className="inline-flex items-center px-4 py-2 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 shadow-sm">
                        <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-xs font-medium text-green-600">{t('eta.expectedDelivery')}</p>
                          <p className="text-base font-bold text-green-700">
                            {t('eta.arrivingInMins', { count: diffMins })}
                          </p>
                        </div>
                      </div>
                    );
                  } else if (diffMins > 0) {
                    return (
                      <div className="inline-flex items-center px-4 py-2 rounded-xl bg-gradient-to-r from-stone-50 to-orange-50 border-2 border-orange-200 shadow-sm">
                        <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-xs font-medium text-orange-600">{t('eta.expectedDelivery')}</p>
                          <p className="text-base font-bold text-blue-700">
                            {expectedDate.toLocaleString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  }
                })()}
              </div>
            )}
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
            {t(`status.${order.status}`, { defaultValue: order.status })}
          </span>
        </div>

        {/* Order Items */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('items.title')}</h2>
          <div className="space-y-4">
            {order.items?.map((item, index) => (
              <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-600">
                    {t('detail.itemLine', { quantity: item.quantity, price: item.price, unit: item.unit })}
                  </p>
                </div>
                <span className="font-medium text-gray-900">
                  ₹{item.price * item.quantity}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('detail.summary')}</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">{t('price.subtotal')}:</span>
              <span className="font-medium">₹{order.subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t('price.tax')}:</span>
              <span className="font-medium">₹{order.tax}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t('price.deliveryCharge')}{order.deliveryCharge === 0 ? ` (${t('price.free')})` : ''}:</span>
              <span className="font-medium">{order.deliveryCharge === 0 ? '₹0' : `₹${order.deliveryCharge}`}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
              <span className="text-gray-900">{t('price.total')}:</span>
              <span className="text-gray-900">₹{order.totalAmount}</span>
            </div>
          </div>
        </div>

        {/* Shipping Information */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('detail.shipping')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">{t('detail.name')}</p>
              <p className="font-medium text-gray-900">{order.customerName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('detail.phone')}</p>
              <p className="font-medium text-gray-900">{order.customerPhone}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-gray-600">{t('detail.deliverTo')}</p>
              {order.deliveryAddressId ? (
                <p className="font-medium text-gray-900">
                  {order.deliveryAddressId.addressLine1}
                  {order.deliveryAddressId.addressLine2 && `, ${order.deliveryAddressId.addressLine2}`}
                  {order.deliveryAddressId.landmark && ` (${t('address.near', { landmark: order.deliveryAddressId.landmark })})`}
                  {`, ${order.deliveryAddressId.area}, ${order.deliveryAddressId.city}, ${order.deliveryAddressId.state} - ${order.deliveryAddressId.pincode}`}
                </p>
              ) : (
                <p className="font-medium text-gray-900">
                  {order.customerAddress}{order.customerArea && `, ${order.customerArea}`}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('payment.method')}</p>
              <p className="font-medium text-gray-900">
                {order.paymentMethod === 'cod' ? t('payment.cod') : t('payment.online')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('payment.statusTitle')}</p>
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                order.paymentStatus === 'cancelled' ? 'bg-red-100 text-red-700' :
                order.paymentStatus === 'refunded' ? 'bg-blue-100 text-blue-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {order.paymentStatus === 'paid' ? t('payment.status.paid') :
                 order.paymentStatus === 'cancelled' ? t('payment.status.cancelled') :
                 order.paymentStatus === 'refunded' ? t('payment.status.refunded') : t('payment.payOnDelivery')}
              </span>
            </div>
          </div>
        </div>

        {/* Status History */}
        {order.statusHistory && order.statusHistory.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('detail.statusHistory')}</h2>
            <div className="space-y-3">
              {order.statusHistory.map((status, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-3 h-3 bg-blue-600 rounded-full mr-3"></div>
                  <div>
                    <p className="font-medium text-gray-900">{t(`status.${status.status}`, { defaultValue: status.status })}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(status.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetail;
