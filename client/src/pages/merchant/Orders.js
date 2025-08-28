import React from "react";
import { useQuery } from "@tanstack/react-query";
import { orderAPI } from "../../services/api";

const Orders = () => {
  const { data: orderList, isLoading, error } = useQuery({
    queryKey: ["merchant-orders"],
    queryFn: () => orderAPI.getOrders(),
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "assigned":
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

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );

  if (error)
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading orders: {error.message}</p>
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
        <p className="text-gray-600">Manage orders assigned to you</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orderList?.orders?.map((order) => (
          <div
            key={order._id}
            className="bg-white shadow rounded-lg p-4 flex flex-col"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-2">
              <div className="font-semibold text-gray-900">
                #{order.orderNumber}
              </div>
              <div className="text-sm text-gray-500">
                {new Date(order.createdAt).toLocaleDateString()}
              </div>
            </div>

            {/* Customer */}
            <div className="mb-2 text-sm text-gray-700">
              <div>{order.customerName}</div>
              <div>{order.customerPhone}</div>
            </div>

            {/* Items */}
            <div className="mb-3">
              {order.items
                .filter((item) => item.assignedMerchantId)
                .map((item) => (
                  <div
                    key={item._id}
                    className="flex justify-between items-center bg-gray-50 p-2 rounded mb-1"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-xs text-gray-500">
                        Qty: {item.quantity} | ₹{item.totalPrice}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full font-semibold ${getStatusColor(
                        item.itemStatus
                      )}`}
                    >
                      {item.itemStatus.charAt(0).toUpperCase() +
                        item.itemStatus.slice(1)}
                    </span>
                  </div>
                ))}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 mt-auto">
              {order.items
                .filter((item) => item.assignedMerchantId)
                .map((item) => (
                  <React.Fragment key={item._id}>
                    <button
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                      onClick={() =>
                        alert(`Mark ${item.productName} as Approved`)
                      }
                    >
                      Approved
                    </button>
                    <button
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                      onClick={() =>
                        alert(`Mark ${item.productName} as Delivered`)
                      }
                    >
                      Delivered
                    </button>
                  </React.Fragment>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Orders;
