import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { orderAPI } from "../../services/api";
import DataTable from "../../components/commonComponents/dataTable";

const Orders = () => {
  const { data: orderList, isLoading, error } = useQuery({
    queryKey: ["merchant-orders"],
    queryFn: () => orderAPI.getOrders(),
  });

  const [globalFilter, setGlobalFilter] = useState(""); // 🔎 search state

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

  // ✅ Define columns for DataTable
  const columns = useMemo(
    () => [
      {
        header: "Order",
        accessorKey: "orderNumber",
        cell: (info) => {
          const order = info.row.original;
          return (
            <div>
              <div className="font-medium text-gray-900">
                #{order.orderNumber}
              </div>
              <div className="text-sm text-gray-500">
                {new Date(order.createdAt).toLocaleDateString()}
              </div>
            </div>
          );
        },
      },
      {
        header: "Customer",
        accessorKey: "customerName",
        cell: (info) => {
          const order = info.row.original;
          return (
            <div>
              <div className="text-sm text-gray-900">
                {order.customerName}
              </div>
              <div className="text-sm text-gray-500">
                {order.customerPhone}
              </div>
            </div>
          );
        },
      },
      {
        header: "Items",
        accessorFn: (row) => `${row.items?.length || 0} item(s)`,
        cell: (info) => <span>{info.getValue()}</span>,
      },
      {
        header: "Amount",
        accessorFn: (row) => `₹${row.totalAmount}`,
        cell: (info) => <span>{info.getValue()}</span>,
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: (info) => (
          <span
            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
              info.getValue()
            )}`}
          >
            {info.getValue().charAt(0).toUpperCase() +
              info.getValue().slice(1)}
          </span>
        ),
      },
      {
        header: "Actions",
        id: "actions",
        cell: (info) => {
          const order = info.row.original;
          return (
            <div className="flex gap-3">
              <button className="text-blue-600 hover:text-blue-900">
                View
              </button>
              <button className="text-green-600 hover:text-green-900">
                Update Status
              </button>
            </div>
          );
        },
      },
    ],
    []
  );

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
        <p className="text-gray-600">Manage orders assigned to you</p>
      </div>

      {/* ✅ Reusable DataTable */}
      <DataTable
        title="Order List"
        columns={columns}
        data={orderList?.orders ?? []}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
      />
    </div>
  );
};

export default Orders;
