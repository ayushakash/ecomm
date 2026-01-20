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
        accessorKey: "phone",
        cell: (info) => (
          <span className="text-gray-700">{info.getValue() || '-'}</span>
        ),
      },
      {
        header: "Area",
        accessorKey: "area",
        cell: (info) => (
          <span className="text-gray-700">{info.getValue() || '-'}</span>
        ),
      },
      {
        header: "Business Type",
        accessorKey: "businessType",
        cell: (info) => (
          <span className="text-gray-700">{info.getValue() || '-'}</span>
        ),
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
          renderCard={(merchant) => (
            <div key={merchant._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
              {/* Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {merchant.name?.charAt(0).toUpperCase() || 'M'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{merchant.name}</h3>
                      <p className="text-sm text-gray-500">{merchant.phone || 'No contact'}</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      merchant.activeStatus === "approved"
                        ? "bg-green-100 text-green-800"
                        : merchant.activeStatus === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {merchant.activeStatus}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                {/* Area */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Area</span>
                  <span className="text-sm font-medium text-gray-900">{merchant.area || '-'}</span>
                </div>

                {/* Business Type */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Business Type</span>
                  <span className="text-sm font-medium text-gray-900">{merchant.businessType || '-'}</span>
                </div>

                {/* Contact */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Contact</span>
                  <span className="text-sm font-medium text-gray-900">{merchant.phone || '-'}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                <div className="flex space-x-2">
                  {merchant.activeStatus === 'pending' && (
                    <>
                      <button
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-green-300 text-sm font-medium rounded-lg text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                        onClick={() => handleStatusChange(merchant._id, 'approved')}
                      >
                        Approve
                      </button>
                      <button
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-red-300 text-sm font-medium rounded-lg text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                        onClick={() => handleStatusChange(merchant._id, 'rejected')}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {merchant.activeStatus === 'approved' && (
                    <button
                      className="w-full inline-flex items-center justify-center px-3 py-2 border border-orange-300 text-sm font-medium rounded-lg text-orange-700 bg-orange-50 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                      onClick={() => handleStatusChange(merchant._id, 'suspended')}
                    >
                      Suspend
                    </button>
                  )}
                  {merchant.activeStatus === 'suspended' && (
                    <button
                      className="w-full inline-flex items-center justify-center px-3 py-2 border border-green-300 text-sm font-medium rounded-lg text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                      onClick={() => handleStatusChange(merchant._id, 'approved')}
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
};

export default Merchants;
