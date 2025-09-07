import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { merchantAPI } from "../../services/api";
import DataTable from "../../components/commonComponents/dataTable";
import { toast } from "react-hot-toast";

const Merchants = () => {
  const queryClient = useQueryClient();
  const { data: merchantList, isLoading, error } = useQuery({
    queryKey: ["merchants"],
    queryFn: () => merchantAPI.getMerchants(),
  });

  const [globalFilter, setGlobalFilter] = useState(""); // 🔎 search state

  // Status update mutation
  const statusMutation = useMutation({
    mutationFn: ({ merchantId, status }) => merchantAPI.updateMerchantStatus(merchantId, { activeStatus: status }),
    onSuccess: () => {
      queryClient.invalidateQueries(["merchants"]);
      toast.success("Merchant status updated successfully!");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to update merchant status");
    }
  });

  const handleStatusChange = (merchantId, status) => {
    statusMutation.mutate({ merchantId, status });
  };

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
              info.getValue() === "approved"
                ? "bg-green-100 text-green-800"
                : info.getValue() === "pending"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {info.getValue()}
          </span>
        ),
      },
      {
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex space-x-2">
            {row.original.activeStatus === 'pending' && (
              <>
                <button
                  className="px-3 py-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 rounded-full font-medium"
                  onClick={() => handleStatusChange(row.original._id, 'approved')}
                >
                  Approve
                </button>
                <button
                  className="px-3 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 rounded-full font-medium"
                  onClick={() => handleStatusChange(row.original._id, 'rejected')}
                >
                  Reject
                </button>
              </>
            )}
            {row.original.activeStatus === 'approved' && (
              <button
                className="px-3 py-1 text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-full font-medium"
                onClick={() => handleStatusChange(row.original._id, 'suspended')}
              >
                Suspend
              </button>
            )}
            {row.original.activeStatus === 'suspended' && (
              <button
                className="px-3 py-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 rounded-full font-medium"
                onClick={() => handleStatusChange(row.original._id, 'approved')}
              >
                Reactivate
              </button>
            )}
          </div>
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
    <div className="min-h-screen bg-gray-50 py-8 pl-8">
      <div className="max-w-7xl mx-auto px-8 space-y-6">
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
    </div>
  );
};

export default Merchants;
