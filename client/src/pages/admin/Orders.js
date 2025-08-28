import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { orderAPI, merchantAPI } from "../../services/api";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

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
      await orderAPI.assignItem(orderId, itemId, merchantId);
      queryClient.invalidateQueries(["orders"]);
    } catch (err) {
      console.error(err);
      alert("Failed to assign merchant");
    }
  };

  const handleAutoAssign = async (orderId, itemId) => {
    try {
      await orderAPI.autoAssignItem(orderId, itemId);
      queryClient.invalidateQueries(["orders"]);
    } catch (err) {
      console.error(err);
      alert("Failed to auto-assign merchant");
    }
  };

  if (isLoading) return <div className="text-center py-12">Loading orders...</div>;
  if (error) return <div className="text-red-600 text-center py-12">{error.message}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
        <p className="text-gray-600">Manage all orders in the system</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Order #</th>
              <th className="px-4 py-2 text-left">Customer</th>
              <th className="px-4 py-2 text-left">Amount</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orderList?.orders?.map((order) => (
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
                        order.status
                      )}`}
                    >
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">-</td>
                </tr>

                {expandedOrders[order._id] && (
                  <tr>
                    <td colSpan={6} className="bg-gray-50 px-4 py-2">
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div
                            key={item._id}
                            className="flex items-center justify-between bg-white p-2 rounded shadow-sm"
                          >
                            <div className="w-32 font-medium">{item.productName}</div>

                            <div className="flex items-center space-x-2">
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
                              <span className="text-sm text-gray-600">
                                {item.assignedMerchantName || "Unassigned"}
                              </span>
                            </div>

                            <div className="flex items-center space-x-2">
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
                              <span className="text-sm">Auto</span>

                              {!autoAssign[item._id] && (
                                <>
                                  <select
                                    className="border rounded p-1 text-sm"
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
                                    className="bg-blue-600 text-white px-2 py-1 rounded text-sm"
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
                                  className="bg-green-600 text-white px-2 py-1 rounded text-sm"
                                  onClick={() => handleAutoAssign(order._id, item._id)}
                                >
                                  Assign Auto
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Orders;
