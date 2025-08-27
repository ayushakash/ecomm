import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { merchantAPI } from "../../services/api";
import DataTable from "../../components/commonComponents/dataTable";

const Merchants = () => {
  const { data: merchantList, isLoading, error } = useQuery({
    queryKey: ["merchants"],
    queryFn: () => merchantAPI.getMerchants(),
  });

  const [globalFilter, setGlobalFilter] = useState(""); // 🔎 search state

  // Define table columns for merchants
  const columns = useMemo(
    () => [
      {
        header: "Name",
        accessorKey: "name",
        cell: (info) => (
          <span className="font-medium text-gray-900">{info.getValue()}</span>
        ),
      },
      {
        header: "Contact",
        accessorKey: "contact.phone",
        cell: (info) => (
          <span className="text-gray-700">{info.getValue()}</span>
        ),
      },
      {
        header: "Area",
        accessorKey: "area",
      },
      {
        header: "Business Type",
        accessorKey: "businessType",
      },
      {
        header: "Status",
        accessorKey: "activeStatus",
        cell: (info) => (
          <span
            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              info.getValue() === "active"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {info.getValue()}
          </span>
        ),
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
        <p className="text-red-600">Error loading merchants: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Merchants Management
        </h1>
        <p className="text-gray-600">Manage all merchants in the system</p>
      </div>

      <DataTable
        columns={columns}
        data={merchantList?.merchants ?? []}
        title="All Merchants"
        globalFilter={globalFilter}       // ✅ pass search state
        setGlobalFilter={setGlobalFilter} // ✅ pass updater
      />
    </div>
  );
};

export default Merchants;
