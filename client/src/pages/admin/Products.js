import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { productAPI } from "../../services/api";
import DataTable from "../../components/commonComponents/dataTable";

const Products = () => {
  const { data: productList, isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: () => productAPI.getProducts(),
  });

  const [globalFilter, setGlobalFilter] = useState("");

  const columns = [
    {
      accessorKey: "name",
      header: "Product",
      cell: (info) => {
        const row = info.row.original;
        return (
          <div className="flex items-center">
            <div className="h-10 w-10 flex-shrink-0">
              <img
                className="h-10 w-10 rounded-lg object-cover"
                src={row.images?.[0] || "/placeholder-product.jpg"}
                alt={row.name}
              />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-900">
                {row.name}
              </div>
              <div className="text-sm text-gray-500">
                {row.merchant?.name}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "category",
      header: "Category",
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: (info) => {
        const row = info.row.original;
        return `₹${row.price} per ${row.unit}`;
      },
    },
    {
      accessorKey: "merchantId.name",
      header: "Merchant Name",
      cell: (info) => info.getValue() || "N/A",
    },
    {
      accessorKey: "stock",
      header: "Stock",
    },
    {
      accessorKey: "enabled",
      header: "Status",
      cell: (info) => (
        <span
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            info.getValue()
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {info.getValue() ? "Enabled" : "Disabled"}
        </span>
      ),
    },
    {
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <button className="text-blue-600 hover:underline">Edit</button>
          <button className="text-red-600 hover:underline">Delete</button>
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
        <p className="text-red-600">
          Error loading products: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Products Management
        </h1>
        <p className="text-gray-600">Manage all products in the system</p>
      </div>

      <DataTable
      title="All Products"
        columns={columns}
        data={productList?.products || []}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
      />
    </div>
  );
};

export default Products;
