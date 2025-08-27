import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DataTable from "../../components/commonComponents/dataTable";
import { orderAPI } from "../../services/api";

const Orders = () => {
  const { data: orderList, isLoading, error } = useQuery({
    queryKey: ["orders"],
    queryFn: () => orderAPI.getOrders(),
  });

  const [globalFilter, setGlobalFilter] = useState("");

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

  const columns = [
    {
      accessorKey: "orderNumber",
      header: "Order",
      cell: (info) => (
        <span className="font-medium">#{info.getValue()}</span>
      ),
    },
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: (info) => {
        const row = info.row.original;
        return (
          <div>
            <div>{row.customerName}</div>
            <div className="text-sm text-gray-500">{row.customerPhone}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "merchant.name",
      header: "Merchant",
      cell: (info) => info.getValue() || "Unassigned",
    },
    {
      accessorKey: "totalAmount",
      header: "Amount",
      cell: (info) => `₹${info.getValue()}`,
    },
    {
      accessorKey: "status",
      header: "Status",
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
      accessorKey: "createdAt",
      header: "Date",
      cell: (info) =>
        new Date(info.getValue()).toLocaleDateString(),
    },
    {
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <button className="text-blue-600 hover:underline">
            View
          </button>
          <button className="text-red-600 hover:underline">
            Delete
          </button>
        </div>
      ),
    },
  ];

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
        <h1 className="text-2xl font-bold text-gray-900">
          Orders Management
        </h1>
        <p className="text-gray-600">
          Manage all orders in the system
        </p>
      </div>

      <DataTable
        title="All Orders"
        columns={columns}
        data={orderList?.orders || []}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
      />
    </div>
  );
};

export default Orders;
