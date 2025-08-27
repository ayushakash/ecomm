import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { orderAPI } from "../../services/api";

const OrderHistory = () => {
  const { data: orderList, isLoading, error } = useQuery({
    queryKey: ["orders"],
    queryFn: () => orderAPI.getOrders(),
  });
  console.log(orderList);

  const [openOrder, setOpenOrder] = useState(null); 

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Order History</h1>

      {orderList.orders?.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No orders yet
          </h3>
          <p className="text-gray-600 mb-6">
            Start shopping to see your orders here!
          </p>
          <Link
            to="/products"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orderList.orders?.map((order) => (
            <div
              key={order._id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Order #{order.orderNumber}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Placed on {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    Total:{" "}
                    <span className="font-semibold">
                      ₹{order.totalAmount}
                    </span>
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    order.status
                  )}`}
                >
                  {order.status.charAt(0).toUpperCase() +
                    order.status.slice(1)}
                </span>
              </div>

              {/* Toggle Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => toggleOrder(order._id)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  {openOrder === order._id ? "Hide Details ▲" : "Show Details ▼"}
                </button>
              </div>

              {/* Expanded Section */}
              {openOrder === order._id && (
                <div className="mt-4 space-y-4 border-t border-gray-200 pt-4">
                  {/* Items */}
                  <div className="space-y-3">
                    {order.items?.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center border-b border-gray-100 pb-2"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {item.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {item.quantity} x ₹{item.unitPrice} per {item.unit}
                          </p>
                        </div>
                        <span className="font-medium text-gray-900">
                          ₹{item.unitPrice * item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>Subtotal</span>
                      <span>₹{order.subtotal}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>Tax</span>
                      <span>₹{order.tax}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>Delivery Charge</span>
                      <span>₹{order.deliveryCharge}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold text-gray-900">
                      <span>Total</span>
                      <span>₹{order.totalAmount}</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                      Payment:{" "}
                      <span className="font-medium capitalize">
                        {order.paymentMethod}
                      </span>{" "}
                      ({order.paymentStatus})
                    </p>
                    {/* <Link
                      to={`/orders/${order._id}`}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
                    >
                      View Details
                    </Link> */}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
