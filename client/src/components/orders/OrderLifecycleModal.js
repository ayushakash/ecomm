import React, { useState, useEffect, useCallback } from 'react';
import { orderAPI } from '../../services/api';
import { format } from 'date-fns';

const OrderLifecycleModal = ({ show, onHide, orderId, orderNumber }) => {
  const [lifecycle, setLifecycle] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchOrderLifecycle = useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      setError('');
      const response = await orderAPI.getOrderLifecycle(orderId);
      setLifecycle(response.order?.lifecycle || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch order lifecycle');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (show && orderId) {
      fetchOrderLifecycle();
    }
  }, [show, orderId, fetchOrderLifecycle]);

  const getEventIcon = (eventType) => {
    const icons = {
      order_created: '📋',
      order_assigned: '👤',
      order_accepted: '✅',
      order_rejected: '❌',
      order_shipped: '🚚',
      order_delivered: '📦',
      order_cancelled: '🚫',
      payment_confirmed: '💳',
      payment_failed: '💥',
      stock_updated: '📊',
      refund_initiated: '💰',
      refund_completed: '✨'
    };
    return icons[eventType] || '📄';
  };

  const getEventColor = (eventType) => {
    const colors = {
      order_created: 'text-blue-600',
      order_assigned: 'text-cyan-600',
      order_accepted: 'text-green-600',
      order_rejected: 'text-red-600',
      order_shipped: 'text-yellow-600',
      order_delivered: 'text-green-600',
      order_cancelled: 'text-red-600',
      payment_confirmed: 'text-green-600',
      payment_failed: 'text-red-600',
      stock_updated: 'text-gray-600',
      refund_initiated: 'text-yellow-600',
      refund_completed: 'text-green-600'
    };
    return colors[eventType] || 'text-gray-600';
  };

  const formatEventType = (eventType) => {
    return eventType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          onClick={onHide}
        ></div>
        
        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Order Lifecycle - {orderNumber}
              </h3>
              <button
                onClick={onHide}
                className="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Body */}
            <div className="max-h-96 overflow-y-auto">
              {loading && (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  <p className="mt-2 text-gray-600">Loading order lifecycle...</p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {!loading && !error && lifecycle.length === 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-800">No lifecycle events found for this order.</p>
                    </div>
                  </div>
                </div>
              )}

              {!loading && !error && lifecycle.length > 0 && (
                <div className="space-y-4">
                  {lifecycle.map((event, index) => (
                    <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <span className="text-2xl">{getEventIcon(event.eventType)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h6 className={`text-sm font-semibold ${getEventColor(event.eventType)}`}>
                              {formatEventType(event.eventType)}
                            </h6>
                            <span className="text-xs text-gray-500">
                              {format(new Date(event.timestamp), 'MMM dd, yyyy HH:mm')}
                            </span>
                          </div>
                          
                          {event.eventDescription && (
                            <p className="text-sm text-gray-600 mb-2">{event.eventDescription}</p>
                          )}

                          {event.triggeredBy && (
                            <div className="mb-2">
                              <span className="text-xs text-gray-500">
                                Triggered by: <strong className="text-gray-700">{event.triggeredBy.userName}</strong>
                                {event.triggeredBy.userPhone && (
                                  <span className="ml-1 text-gray-600">({event.triggeredBy.userPhone})</span>
                                )}
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  {event.triggeredBy.userType}
                                </span>
                              </span>
                            </div>
                          )}

                          {/* Notification Status */}
                          {event.notificationSent?.n8n && (
                            <div className="mb-2">
                              <span className="text-xs text-gray-500">
                                n8n Notification: {' '}
                                {event.notificationSent.n8n.sent ? (
                                  <span className="text-green-600 font-medium">✅ Sent</span>
                                ) : (
                                  <span className="text-red-600 font-medium">❌ Failed</span>
                                )}
                                {event.notificationSent.n8n.sentAt && (
                                  <span className="ml-2 text-gray-400">
                                    at {format(new Date(event.notificationSent.n8n.sentAt), 'HH:mm')}
                                  </span>
                                )}
                              </span>
                            </div>
                          )}

                          {/* Metadata (collapsible) */}
                          {event.metadata && Object.keys(event.metadata).length > 0 && (
                            <details className="mt-2">
                              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                                View Details
                              </summary>
                              <div className="mt-2 p-2 bg-white rounded border">
                                <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                                  {JSON.stringify(event.metadata, null, 2)}
                                </pre>
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={fetchOrderLifecycle}
              disabled={loading}
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              type="button"
              onClick={onHide}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderLifecycleModal;