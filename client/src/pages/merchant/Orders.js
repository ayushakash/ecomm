import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orderAPI } from "../../services/api";
import { useLocation } from 'react-router-dom';
import ResponsiveTable from "../../components/ui/ResponsiveTable";
import MerchantOrderCard from "../../components/ui/MerchantOrderCard";

const Orders = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [tab, setTab] = useState("new"); // "new" or "my" - default to new orders
  const [expandedOrder, setExpandedOrder] = useState(null); // Track which order is expanded

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

  console.log(orderList)

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
  // Mutation: accept or reject an unassigned order item with optimistic updates
  const respondMutation = useMutation({
    mutationFn: ({ orderId, itemIds, action }) => {
      if (action === "accept") {
        // Use bulk assign if multiple items, otherwise single assign
        if (Array.isArray(itemIds) && itemIds.length > 1) {
          return orderAPI.bulkAssignItems(orderId, itemIds);
        } else {
          const itemId = Array.isArray(itemIds) ? itemIds[0] : itemIds;
          return orderAPI.assignItem(orderId, itemId);
        }
      } else {
        // Reject single item (bulk reject not needed for MVP)
        const itemId = Array.isArray(itemIds) ? itemIds[0] : itemIds;
        return orderAPI.rejectItem(orderId, itemId);
      }
    },
    onMutate: async ({ orderId, itemIds, action }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries(["unassigned-orders"]);
      await queryClient.cancelQueries(["merchant-orders"]);

      // Snapshot the previous values
      const previousUnassigned = queryClient.getQueryData(["unassigned-orders"]);
      const previousMerchant = queryClient.getQueryData(["merchant-orders"]);

      // Convert itemIds to array if it's a single item
      const itemIdArray = Array.isArray(itemIds) ? itemIds : [itemIds];

      if (action === "accept") {
        // Optimistically move items from unassigned to merchant orders
        queryClient.setQueryData(["unassigned-orders"], (old) => {
          if (!Array.isArray(old)) return old;

          return old.map(order => {
            if (order._id === orderId) {
              return {
                ...order,
                items: order.items.filter(item => !itemIdArray.includes(item._id))
              };
            }
            return order;
          }).filter(order => order.items.length > 0); // Remove orders with no items
        });

        // Add to merchant orders (if merchant orders are loaded)
        queryClient.setQueryData(["merchant-orders"], (old) => {
          if (!old?.orders) return old;

          // Find the accepted items from unassigned orders
          const unassignedOrder = previousUnassigned?.find(order => order._id === orderId);
          const acceptedItems = unassignedOrder?.items?.filter(item => itemIdArray.includes(item._id));

          if (!acceptedItems || acceptedItems.length === 0) return old;

          // Check if order already exists in merchant orders
          const existingOrderIndex = old.orders.findIndex(order => order._id === orderId);

          if (existingOrderIndex !== -1) {
            // Add items to existing order
            const updatedOrders = [...old.orders];
            updatedOrders[existingOrderIndex] = {
              ...updatedOrders[existingOrderIndex],
              items: [...updatedOrders[existingOrderIndex].items, ...acceptedItems.map(item => ({ ...item, itemStatus: 'assigned' }))]
            };
            return { ...old, orders: updatedOrders };
          } else {
            // Add new order with the accepted items
            const newOrder = {
              ...unassignedOrder,
              items: acceptedItems.map(item => ({ ...item, itemStatus: 'assigned' }))
            };
            return { ...old, orders: [newOrder, ...old.orders] };
          }
        });
      } else {
        // For reject, just remove the items from unassigned orders
        queryClient.setQueryData(["unassigned-orders"], (old) => {
          if (!Array.isArray(old)) return old;

          return old.map(order => {
            if (order._id === orderId) {
              return {
                ...order,
                items: order.items.filter(item => !itemIdArray.includes(item._id))
              };
            }
            return order;
          }).filter(order => order.items.length > 0);
        });
      }

      return { previousUnassigned, previousMerchant };
    },
    onError: (err, variables, context) => {
      console.error("Failed to respond:", err);
      // Rollback optimistic updates on error
      if (context?.previousUnassigned) {
        queryClient.setQueryData(["unassigned-orders"], context.previousUnassigned);
      }
      if (context?.previousMerchant) {
        queryClient.setQueryData(["merchant-orders"], context.previousMerchant);
      }
      alert("Failed to respond. Changes have been reverted.");
    },
    onSuccess: (data) => {
      // Show warning if some items failed
      if (data?.failedItems && data.failedItems.length > 0) {
        console.warn('Some items failed to assign:', data.failedItems);
        alert(`Warning: ${data.assignedItemsCount} items assigned successfully, but ${data.failedItems.length} items failed (you may not sell those products)`);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries(["unassigned-orders"]);
      queryClient.invalidateQueries(["merchant-orders"]);
    },
  });

  // Mutation: update status of an item in my orders with optimistic updates
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, itemIds, status }) => {
      // Use bulk update if multiple items, otherwise single update
      if (Array.isArray(itemIds) && itemIds.length > 1) {
        return orderAPI.bulkUpdateOrderItemsStatus(orderId, itemIds, status);
      } else {
        const itemId = Array.isArray(itemIds) ? itemIds[0] : itemIds;
        return orderAPI.updateOrderItemStatus(orderId, itemId, status);
      }
    },
    onMutate: async ({ orderId, itemIds, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries(["merchant-orders"]);

      // Snapshot the previous value
      const previousOrders = queryClient.getQueryData(["merchant-orders"]);

      // Convert itemIds to array if it's a single item
      const itemIdArray = Array.isArray(itemIds) ? itemIds : [itemIds];

      // Optimistically update the cache
      queryClient.setQueryData(["merchant-orders"], (old) => {
        if (!old?.orders) return old;

        return {
          ...old,
          orders: old.orders.map(order => {
            if (order._id === orderId) {
              return {
                ...order,
                items: order.items.map(item => {
                  if (itemIdArray.includes(item._id)) {
                    return { ...item, itemStatus: status };
                  }
                  return item;
                })
              };
            }
            return order;
          })
        };
      });

      // Return context with the snapshot value
      return { previousOrders };
    },
    onError: (err, variables, context) => {
      console.error("Failed to update:", err);
      // Rollback optimistic update on error
      if (context?.previousOrders) {
        queryClient.setQueryData(["merchant-orders"], context.previousOrders);
      }
      alert("Failed to update status. Changes have been reverted.");
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries(["merchant-orders"]);
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

  // Helper to handle respond mutation (accepts single itemId or array of itemIds)
  const handleRespond = (orderId, itemIds, action) => {
    respondMutation.mutate({ orderId, itemIds, action });
  };

  // Helper to handle status update mutation (accepts single itemId or array of itemIds)
  const handleUpdateStatus = (orderId, itemIds, status) => {
    updateStatusMutation.mutate({ orderId, itemIds, status });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
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
      {tab === "new" ? (
        <ResponsiveTable
          data={unassignedList || []}
          loading={isLoadingNew}
          emptyMessage="No new orders available"
          tableHeaders={["Order #", "Customer", "Items", "Address", "Amount", "Date", "Actions"]}
          renderCard={(order) => (
            <MerchantOrderCard
              order={order}
              tab={tab}
              getStatusColor={getStatusColor}
              onRespond={handleRespond}
            />
          )}
          renderTableRow={(order) => (
            <>
              <tr
                key={order._id}
                onClick={() => setExpandedOrder(expandedOrder === order._id ? null : order._id)}
                className="cursor-pointer hover:bg-gray-50"
              >
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span>{expandedOrder === order._id ? '▼' : '▶'}</span>
                    <span>#{order.orderNumber || order._id.slice(-6)}</span>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div>
                    <div className="font-medium">{order.customerName}</div>
                    <div className="text-sm text-gray-500">{order.customerPhone}</div>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div>
                    <div className="font-medium">{order.items?.length || 0} items</div>
                    <div className="text-sm text-gray-500">
                      {order.items?.map(item => item.productName).join(", ").slice(0, 30)}...
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="text-sm">
                    <div className="font-medium">
                      {order.shippingAddress?.addressLine1 ||
                       order.shippingAddress?.street ||
                       order.customerAddress || 'Address not available'}
                    </div>
                    <div className="text-gray-500">
                      {order.shippingAddress?.city || order.customerArea || ''} {order.shippingAddress?.pincode || ''}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2">
                  {order.merchantPayout ? (
                    <div className="text-sm">
                      <div className="font-semibold text-green-600">
                        ₹{order.merchantPayout.codCollectionAmount?.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        Your COD
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm">₹{order.totalAmount?.toLocaleString()}</div>
                  )}
                </td>
                <td className="px-4 py-2">
                  <div className="text-sm">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex space-x-1">
                    <button
                      onClick={() =>
                        handleRespond(
                          order._id,
                          order.items.map(item => item._id),
                          "accept"
                        )
                      }
                      className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                      disabled={respondMutation.isLoading}
                    >
                      Accept All ({order.items?.length || 0})
                    </button>
                    <button
                      onClick={() =>
                        handleRespond(
                          order._id,
                          order.items.map(item => item._id),
                          "reject"
                        )
                      }
                      className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                      disabled={respondMutation.isLoading}
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
              {/* Expanded Row - Item Details */}
              {expandedOrder === order._id && (
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td colSpan="7" className="px-4 py-4">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Order Items</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 border-b border-gray-200">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium text-gray-700">Product</th>
                              <th className="px-3 py-2 text-left font-medium text-gray-700">Unit</th>
                              <th className="px-3 py-2 text-center font-medium text-gray-700">Quantity</th>
                              <th className="px-3 py-2 text-right font-medium text-gray-700">Unit Price</th>
                              <th className="px-3 py-2 text-right font-medium text-gray-700">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {order.items?.map((item) => (
                              <tr key={item._id} className="hover:bg-gray-100">
                                <td className="px-3 py-2 font-medium text-gray-900">
                                  {item.productName}
                                </td>
                                <td className="px-3 py-2 text-gray-600">
                                  {item.unit || 'unit'}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold">
                                    {item.quantity}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-right text-gray-600">
                                  ₹{(item.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-2 text-right font-medium text-gray-900">
                                  ₹{((item.unitPrice || 0) * (item.quantity || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </>
          )}
        />
      ) : (
        <ResponsiveTable
          data={orderList?.orders || []}
          loading={isLoadingMy}
          emptyMessage="No assigned orders found"
          tableHeaders={["Order #", "Customer", "Items", "Status", "Address", "Amount", "Date", "Actions"]}
          renderCard={(order) => (
            <MerchantOrderCard
              order={order}
              tab={tab}
              getStatusColor={getStatusColor}
              onUpdateStatus={handleUpdateStatus}
            />
          )}
          renderTableRow={(order) => (
            <>
              <tr
                key={order._id}
                onClick={() => setExpandedOrder(expandedOrder === order._id ? null : order._id)}
                className="cursor-pointer hover:bg-gray-50"
              >
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span>{expandedOrder === order._id ? '▼' : '▶'}</span>
                    <span>#{order.orderNumber || order._id.slice(-6)}</span>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div>
                    <div className="font-medium">{order.customerName}</div>
                    <div className="text-sm text-gray-500">{order.customerPhone}</div>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div>
                    <div className="font-medium">{order.items?.length || 0} items</div>
                    <div className="text-sm text-gray-500">
                      {order.items?.map(item => item.productName).join(", ").slice(0, 30)}...
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                      order.orderStatus || 'pending'
                    )}`}
                  >
                    {(order.orderStatus || 'pending').charAt(0).toUpperCase() +
                     (order.orderStatus || 'pending').slice(1)}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <div className="text-sm">
                    <div className="font-medium">
                      {order.shippingAddress?.addressLine1 ||
                       order.shippingAddress?.street ||
                       order.customerAddress || 'Address not available'}
                    </div>
                    <div className="text-gray-500">
                      {order.shippingAddress?.city || order.customerArea || ''} {order.shippingAddress?.pincode || ''}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2">
                  {order.merchantPayout ? (
                    <div className="text-sm">
                      <div className="font-semibold text-green-600">
                        ₹{order.merchantPayout.codCollectionAmount?.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        COD Collection
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm">₹{order.totalAmount?.toLocaleString()}</div>
                  )}
                </td>
                <td className="px-4 py-2">
                  <div className="text-sm">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex space-x-1">
                    {(() => {
                      // Check item statuses (for merchant, all their items should have same status)
                      const allItemIds = order.items.map(item => item._id);
                      const status = order.items.length > 0 ? order.items[0].itemStatus : 'assigned';

                      if (status === 'assigned' || status === 'pending') {
                        return (
                          <button
                            onClick={() =>
                              handleUpdateStatus(
                                order._id,
                                allItemIds,
                                "processing"
                              )
                            }
                            className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                            disabled={updateStatusMutation.isLoading}
                          >
                            Start Processing ({order.items?.length || 0})
                          </button>
                        );
                      } else if (status === 'processing') {
                        return (
                          <button
                            onClick={() =>
                              handleUpdateStatus(
                                order._id,
                                allItemIds,
                                "shipped"
                              )
                            }
                            className="bg-purple-600 text-white px-2 py-1 rounded text-xs hover:bg-purple-700"
                            disabled={updateStatusMutation.isLoading}
                          >
                            Mark as Shipped ({order.items?.length || 0})
                          </button>
                        );
                      } else if (status === 'shipped') {
                        return (
                          <button
                            onClick={() =>
                              handleUpdateStatus(
                                order._id,
                                allItemIds,
                                "delivered"
                              )
                            }
                            className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                            disabled={updateStatusMutation.isLoading}
                          >
                            Mark as Delivered ({order.items?.length || 0})
                          </button>
                        );
                      } else if (status === 'delivered') {
                        return (
                          <span className="text-green-600 text-xs font-medium">Completed</span>
                        );
                      }
                    })()}
                  </div>
                </td>
              </tr>
              {/* Expanded Row - Item Details */}
              {expandedOrder === order._id && (
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td colSpan="8" className="px-4 py-4">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Order Items</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 border-b border-gray-200">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium text-gray-700">Product</th>
                              <th className="px-3 py-2 text-left font-medium text-gray-700">Unit</th>
                              <th className="px-3 py-2 text-center font-medium text-gray-700">Quantity</th>
                              <th className="px-3 py-2 text-right font-medium text-gray-700">Unit Price</th>
                              <th className="px-3 py-2 text-right font-medium text-gray-700">Total</th>
                              <th className="px-3 py-2 text-center font-medium text-gray-700">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {order.items?.map((item) => (
                              <tr key={item._id} className="hover:bg-gray-100">
                                <td className="px-3 py-2 font-medium text-gray-900">
                                  {item.productName}
                                </td>
                                <td className="px-3 py-2 text-gray-600">
                                  {item.unit || 'unit'}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold">
                                    {item.quantity}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-right text-gray-600">
                                  ₹{(item.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-2 text-right font-medium text-gray-900">
                                  ₹{((item.unitPrice || 0) * (item.quantity || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.itemStatus)}`}>
                                    {item.itemStatus?.charAt(0).toUpperCase() + item.itemStatus?.slice(1) || 'Pending'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </>
          )}
        />
      )}
      </div>
    </div>
  );
};

export default Orders;
