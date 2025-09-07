import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orderAPI } from "../../services/api";
import { useLocation } from 'react-router-dom';

const Orders = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [tab, setTab] = useState("new"); // "new" or "my" - default to new orders

  // Set tab based on URL query parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'new' || tabParam === 'my') {
      setTab(tabParam);
    }
  }, [location.search]);

  // Fetch my assigned orders
  const {
    data: orderList,
    isLoading: isLoadingMy,
    error: errorMy,
  } = useQuery({
    queryKey: ["merchant-orders"],
    queryFn: () => orderAPI.getOrders(),
    enabled: tab === "my",
  });

  // Fetch unassigned orders
  const {
    data: unassignedList,
    isLoading: isLoadingNew,
    error: errorNew,
  } = useQuery({
    queryKey: ["unassigned-orders"],
    queryFn: () => orderAPI.getUnassignedOrders(),
    enabled: tab === "new",
  });
  // Mutation: accept or reject an unassigned order item
  const respondMutation = useMutation({
    mutationFn: ({ orderId, itemId, action }) => {
      if (action === "accept") {
        return orderAPI.assignItem(orderId, itemId);
      } else {
        return orderAPI.rejectItem(orderId, itemId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["unassigned-orders"]);
      queryClient.invalidateQueries(["merchant-orders"]);
    },
    onError: (err) => {
      console.error("Failed to respond:", err);
      alert("Failed to respond. Try again.");
    },
  });

  // Mutation: update status of an item in my orders
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, itemId, status }) =>
      orderAPI.updateOrderItemStatus(orderId, itemId, status),
    onSuccess: () => {
      queryClient.invalidateQueries(["merchant-orders"]);
    },
    onError: (err) => {
      console.error("Failed to update:", err);
      alert("Failed to update status. Try again.");
    },
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
      case "declined":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Helper to check if order has mixed item statuses
  const hasMixedStatuses = (order) => {
    if (!order.items || order.items.length <= 1) return false;
    const statuses = [...new Set(order.items.map(item => item.itemStatus))];
    return statuses.length > 1;
  };

  // Common order card renderer
  const renderOrderCard = (order, isNew = false) => (
    <div
      key={order._id}
      className="bg-white shadow rounded-lg p-4 flex flex-col"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-gray-900">
            #{order.orderNumber || order._id.slice(-6)}
          </div>
          {!isNew && hasMixedStatuses(order) && (
            <span className="bg-orange-100 text-orange-800 px-2 py-1 text-xs rounded-full">
              Partial
            </span>
          )}
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
        {order.items?.map((item) => (
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
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-1 text-xs rounded-full font-semibold ${getStatusColor(
                  item.itemStatus
                )}`}
              >
                {item.itemStatus?.charAt(0).toUpperCase() +
                  item.itemStatus?.slice(1)}
              </span>
              {/* Action buttons for both new orders and unassigned items in my orders */}
              {((isNew && item.itemStatus === 'pending') || (!isNew && !item.assignedMerchantId && item.itemStatus === 'pending')) && (
                <div className="flex gap-1">
                  <button
                    className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 transition-colors"
                    onClick={() =>
                      respondMutation.mutate({
                        orderId: order._id,
                        itemId: item._id,
                        action: "accept",
                      })
                    }
                  >
                    {isNew ? 'Accept' : 'Claim'}
                  </button>
                  <button
                    className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition-colors"
                    onClick={() =>
                      respondMutation.mutate({
                        orderId: order._id,
                        itemId: item._id,
                        action: "reject",
                      })
                    }
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Additional Actions for My Orders */}
      {!isNew && (
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-200">
          {order.items
            ?.filter((item) => 
              item.assignedMerchantId && 
              item.itemStatus !== 'delivered' && 
              item.itemStatus !== 'cancelled'
            ) // only show actions for assigned items that aren't already completed/cancelled
            .map((item) => (
              <div key={item._id} className="flex flex-wrap items-center gap-1 bg-gray-50 rounded-lg p-2">
                <span className="text-xs font-medium text-gray-700 mr-2">{item.productName}:</span>
                {item.itemStatus === 'assigned' && (
                  <button
                    className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                    onClick={() =>
                      updateStatusMutation.mutate({
                        orderId: order._id,
                        itemId: item._id,
                        status: "processing",
                      })
                    }
                  >
                    Start Processing
                  </button>
                )}
                
                {item.itemStatus === 'processing' && (
                  <button
                    className="bg-purple-600 text-white px-2 py-1 rounded text-xs hover:bg-purple-700 transition-colors"
                    onClick={() =>
                      updateStatusMutation.mutate({
                        orderId: order._id,
                        itemId: item._id,
                        status: "shipped",
                      })
                    }
                  >
                    Mark Shipped
                  </button>
                )}
                
                {(item.itemStatus === 'shipped' || item.itemStatus === 'processing') && (
                  <button
                    className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 transition-colors"
                    onClick={() =>
                      updateStatusMutation.mutate({
                        orderId: order._id,
                        itemId: item._id,
                        status: "delivered",
                      })
                    }
                  >
                    Mark Delivered
                  </button>
                )}
                
                {(item.itemStatus === 'assigned' || item.itemStatus === 'processing') && (
                  <button
                    className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 transition-colors"
                    onClick={() =>
                      updateStatusMutation.mutate({
                        orderId: order._id,
                        itemId: item._id,
                        status: "cancelled",
                      })
                    }
                  >
                    Cancel
                  </button>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600">Manage incoming and assigned orders</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab("new")}
            className={`px-4 py-2 rounded ${
              tab === "new" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            New Orders
          </button>
          <button
            onClick={() => setTab("my")}
            className={`px-4 py-2 rounded ${
              tab === "my" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            My Orders
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tab === "new" ? (
          isLoadingNew ? (
            <p>Loading new orders...</p>
          ) : errorNew ? (
            <p className="text-red-600">Error loading new orders</p>
          ) : (
            unassignedList?.map((order) =>
              renderOrderCard(order, true)
            )
          )
        ) : isLoadingMy ? (
          <p>Loading my orders...</p>
        ) : errorMy ? (
          <p className="text-red-600">Error loading my orders</p>
        ) : (
          orderList?.orders?.map((order) => renderOrderCard(order, false))
        )}
      </div>
      </div>
    </div>
  );
};

export default Orders;
