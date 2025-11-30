import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { orderAPI, merchantAPI } from "../../services/api";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import OrderLifecycleModal from "../../components/orders/OrderLifecycleModal";
import ResponsiveTable from "../../components/ui/ResponsiveTable";
import OrderCard from "../../components/ui/OrderCard";

const Orders = () => {
  const queryClient = useQueryClient();
  const { data: orderList, isLoading, error } = useQuery({
    queryKey: ["orders"],
    queryFn: () => orderAPI.getOrders(),
  });

  const [expandedOrders, setExpandedOrders] = useState({});
  const [autoAssign, setAutoAssign] = useState({}); // per item
  const [availableMerchants, setAvailableMerchants] = useState({});
  const [selectedMerchant, setSelectedMerchant] = useState({});
  
  // Order lifecycle modal state
  const [showLifecycleModal, setShowLifecycleModal] = useState(false);
  const [selectedOrderForLifecycle, setSelectedOrderForLifecycle] = useState(null);

  const handleShowLifecycle = (order) => {
    setSelectedOrderForLifecycle(order);
    setShowLifecycleModal(true);
  };

  const toggleExpand = (orderId) => {
    setExpandedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
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

  const fetchMerchantsForItem = async (item) => {
    if (availableMerchants[item._id]) return;
    try {
      const productId = item.productId?._id;
      if (!productId) {
        setAvailableMerchants((prev) => ({ ...prev, [item._id]: [] }));
        return;
      }
      const merchants = await merchantAPI.getMerchantsByProduct(productId);
      setAvailableMerchants((prev) => ({ ...prev, [item._id]: merchants || [] }));
    } catch (err) {
      console.error("Failed to fetch merchants:", err);
      setAvailableMerchants((prev) => ({ ...prev, [item._id]: [] }));
    }
  };

  const handleManualAssign = async (orderId, itemId) => {
    const merchantId = selectedMerchant[itemId];
    if (!merchantId) return alert("Please select a merchant");
    try {
      await orderAPI.autoAssignItem(orderId, itemId, merchantId);
      queryClient.invalidateQueries(["orders"]);
      alert("Merchant assigned successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to assign merchant: " + (err.response?.data?.message || err.message));
    }
  };

  const handleAutoAssign = async (orderId, itemId) => {
    try {
      await orderAPI.autoAssignItem(orderId, itemId);
      queryClient.invalidateQueries(["orders"]);
      alert("Merchant auto-assigned successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to auto-assign merchant: " + (err.response?.data?.message || err.message));
    }
  };

  if (isLoading) return <div className="text-center py-12">Loading orders...</div>;
  if (error) return <div className="text-red-600 text-center py-12">{error.message}</div>;

  // Helper function to check if all items are assigned to the same merchant
  const getOrderMerchantInfo = (order) => {
    const assignedItems = order.items.filter(item => item.assignedMerchantId);

    if (assignedItems.length === 0) {
      return { type: 'unassigned', count: order.items.length };
    }

    if (assignedItems.length === order.items.length) {
      // All items are assigned, check if to same merchant
      const firstMerchantId = assignedItems[0].assignedMerchantId._id;
      const allSameMerchant = assignedItems.every(item =>
        item.assignedMerchantId._id === firstMerchantId
      );

      if (allSameMerchant) {
        return {
          type: 'single_merchant',
          merchant: assignedItems[0].assignedMerchantId
        };
      }
    }

    return { type: 'mixed' };
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 pl-8">
      <div className="max-w-7xl mx-auto px-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
          <p className="text-gray-600">Manage all orders in the system</p>
        </div>

        <ResponsiveTable
          data={orderList?.orders || []}
          loading={isLoading}
          emptyMessage="No orders found"
          tableHeaders={["Order #", "Customer", "Amount", "Status", "Merchant", "Date", "Actions"]}
          renderCard={(order) => (
            <OrderCard
              order={order}
              onShowLifecycle={handleShowLifecycle}
              getStatusColor={getStatusColor}
              getOrderMerchantInfo={getOrderMerchantInfo}
              expandedOrders={expandedOrders}
              toggleExpand={toggleExpand}
            >
              {/* Expanded content for mobile cards */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 mb-3">Order Items</h4>
                {order.items.map((item) => (
                  <div
                    key={item._id}
                    className="bg-white p-3 rounded-lg border border-gray-200 space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-gray-900">{item.productName}</div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                          item.itemStatus || "pending"
                        )}`}
                      >
                        {item.itemStatus
                          ? item.itemStatus.charAt(0).toUpperCase() +
                            item.itemStatus.slice(1)
                          : "Pending"}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600">
                      {item.assignedMerchantId ? (
                        <div>
                          <div className="font-medium">{item.assignedMerchantId.businessName || item.assignedMerchantId.name}</div>
                          <div className="text-xs text-gray-500">{item.assignedMerchantId.name}</div>
                        </div>
                      ) : (
                        "Unassigned"
                      )}
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                      <input
                        type="checkbox"
                        checked={autoAssign[item._id] || false}
                        onChange={(e) =>
                          setAutoAssign((prev) => ({
                            ...prev,
                            [item._id]: e.target.checked,
                          }))
                        }
                      />
                      <span className="text-sm">Auto Assign</span>

                      {!autoAssign[item._id] && (
                        <>
                          <select
                            className="border rounded p-1 text-sm flex-1"
                            value={selectedMerchant[item._id] || ""}
                            onFocus={() => fetchMerchantsForItem(item)}
                            onChange={(e) =>
                              setSelectedMerchant((prev) => ({
                                ...prev,
                                [item._id]: e.target.value,
                              }))
                            }
                          >
                            <option value="">Select Merchant</option>
                            {(availableMerchants[item._id] || []).map((m) => (
                              <option key={m._id} value={m._id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                          <button
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                            onClick={() =>
                              handleManualAssign(order._id, item._id)
                            }
                          >
                            Assign
                          </button>
                        </>
                      )}

                      {autoAssign[item._id] && (
                        <button
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                          onClick={() => handleAutoAssign(order._id, item._id)}
                        >
                          Auto Assign
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </OrderCard>
          )}
          renderTableRow={(order) => (
            <React.Fragment key={order._id}>
              <tr>
                <td className="px-4 py-2">
                  <div className="flex items-center justify-between">
                    <span>#{order.orderNumber}</span>
                    <button
                      onClick={() => toggleExpand(order._id)}
                      className="p-1 rounded hover:bg-gray-100"
                    >
                      {expandedOrders[order._id] ? (
                        <ChevronUpIcon className="w-5 h-5" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-col">
                    <span>{order.customerName}</span>
                    <span className="text-sm text-gray-500">{order.customerPhone}</span>
                  </div>
                </td>
                <td className="px-4 py-2">₹{order.totalAmount}</td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                      order.orderStatus || 'pending'
                    )}`}
                  >
                    {(order.orderStatus || 'pending').charAt(0).toUpperCase() + (order.orderStatus || 'pending').slice(1)}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {(() => {
                    const merchantInfo = getOrderMerchantInfo(order);
                    if (merchantInfo.type === 'single_merchant') {
                      return (
                        <div>
                          <div className="font-medium text-gray-900">
                            {merchantInfo.merchant.businessName || merchantInfo.merchant.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {merchantInfo.merchant.name}
                          </div>
                        </div>
                      );
                    } else if (merchantInfo.type === 'unassigned') {
                      return (
                        <span className="text-sm text-red-600">
                          {merchantInfo.count} items unassigned
                        </span>
                      );
                    } else {
                      return (
                        <span className="text-sm text-blue-600">
                          Multiple merchants
                        </span>
                      );
                    }
                  })()}
                </td>
                <td className="px-4 py-2">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => toggleExpand(order._id)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      {expandedOrders[order._id] ? 'Collapse' : 'Manage'}
                    </button>
                    <button
                      onClick={() => handleShowLifecycle(order)}
                      className="text-green-600 hover:text-green-800 text-sm font-medium"
                    >
                      📋 Lifecycle
                    </button>
                  </div>
                </td>
              </tr>

              {expandedOrders[order._id] && (
                <tr>
                  <td colSpan={7} className="bg-gray-50 px-4 py-4">
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
                              <th className="px-3 py-2 text-left font-medium text-gray-700">Merchant</th>
                              <th className="px-3 py-2 text-left font-medium text-gray-700">Action</th>
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
                                <td className="px-3 py-2 text-sm">
                                  {item.assignedMerchantId ? (
                                    <div>
                                      <div className="font-medium">{item.assignedMerchantId.businessName || item.assignedMerchantId.name}</div>
                                      <div className="text-xs text-gray-500">{item.assignedMerchantId.name}</div>
                                    </div>
                                  ) : (
                                    <span className="text-red-600 font-medium">Unassigned</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-sm">
                                  <div className="flex items-center space-x-2 flex-wrap">
                                    <input
                                      type="checkbox"
                                      checked={autoAssign[item._id] || false}
                                      onChange={(e) =>
                                        setAutoAssign((prev) => ({
                                          ...prev,
                                          [item._id]: e.target.checked,
                                        }))
                                      }
                                      title="Auto Assign"
                                    />
                                    {!autoAssign[item._id] && (
                                      <>
                                        <select
                                          className="border rounded p-1 text-xs flex-1 min-w-32"
                                          value={selectedMerchant[item._id] || ""}
                                          onFocus={() => fetchMerchantsForItem(item)}
                                          onChange={(e) =>
                                            setSelectedMerchant((prev) => ({
                                              ...prev,
                                              [item._id]: e.target.value,
                                            }))
                                          }
                                        >
                                          <option value="">Select</option>
                                          {(availableMerchants[item._id] || []).map((m) => (
                                            <option key={m._id} value={m._id}>
                                              {m.businessName}
                                            </option>
                                          ))}
                                        </select>
                                        <button
                                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                                          onClick={() =>
                                            handleManualAssign(order._id, item._id)
                                          }
                                        >
                                          Assign
                                        </button>
                                      </>
                                    )}

                                    {autoAssign[item._id] && (
                                      <button
                                        className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                                        onClick={() => handleAutoAssign(order._id, item._id)}
                                      >
                                        Auto
                                      </button>
                                    )}
                                  </div>
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
            </React.Fragment>
          )}
        />
      </div>
      
      {/* Order Lifecycle Modal - Temporarily commented out */}
      <OrderLifecycleModal
        show={showLifecycleModal}
        onHide={() => setShowLifecycleModal(false)}
        orderId={selectedOrderForLifecycle?._id}
        orderNumber={selectedOrderForLifecycle?.orderNumber}
      />
    </div>
  );
};

export default Orders;
