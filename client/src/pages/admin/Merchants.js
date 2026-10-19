import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { merchantAPI } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import DataTable from "../../components/commonComponents/dataTable";
import { toast } from "react-hot-toast";

const Merchants = () => {
  const queryClient = useQueryClient();
  const { impersonate } = useAuth();
  const { data: merchantList, isLoading, error } = useQuery({
    queryKey: ["merchants"],
    queryFn: () => merchantAPI.getMerchants(),
  });

  const [globalFilter, setGlobalFilter] = useState(""); // 🔎 search state

  // Location-edit modal state
  const emptyForm = { area: "", city: "", state: "", address: "", pincode: "" };
  const [editingMerchant, setEditingMerchant] = useState(null); // merchant being edited (or null)
  const [editForm, setEditForm] = useState(emptyForm);

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

  // Location update mutation (admin edits area/city/state so the right city shows in the header dropdown)
  const editMutation = useMutation({
    mutationFn: ({ merchantId, data }) => merchantAPI.updateMerchant(merchantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["merchants"]);
      toast.success("Merchant location updated successfully!");
      setEditingMerchant(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to update merchant");
    }
  });

  const handleStatusChange = (merchantId, status) => {
    statusMutation.mutate({ merchantId, status });
  };

  const openEdit = (merchant) => {
    setEditingMerchant(merchant);
    setEditForm({
      area: merchant.area || "",
      city: merchant.city || "",
      state: merchant.state || "",
      address: merchant.address || "",
      pincode: merchant.pincode || "",
    });
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    editMutation.mutate({ merchantId: editingMerchant._id, data: editForm });
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
            <button
              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-full font-medium"
              onClick={() => openEdit(row.original)}
            >
              Edit
            </button>
            <Link
              to={`/admin/merchants/${row.original._id}/products`}
              className="px-3 py-1 text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-full font-medium"
            >
              Products &amp; stock
            </Link>
            <button
              className="px-3 py-1 text-xs bg-amber-100 text-amber-800 hover:bg-amber-200 rounded-full font-medium"
              onClick={() => impersonate(row.original._id)}
            >
              Login as
            </button>
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
    [impersonate]
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-6">
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
                  <button
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-blue-300 text-sm font-medium rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    onClick={() => openEdit(merchant)}
                  >
                    Edit
                  </button>
                  <Link
                    to={`/admin/merchants/${merchant._id}/products`}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-indigo-300 text-sm font-medium rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                  >
                    Products
                  </Link>
                  <button
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-amber-300 text-sm font-medium rounded-lg text-amber-800 bg-amber-50 hover:bg-amber-100 transition-colors"
                    onClick={() => impersonate(merchant._id)}
                  >
                    Login as
                  </button>
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

      {/* Edit location modal */}
      {editingMerchant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <form onSubmit={handleEditSubmit}>
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Edit Location</h2>
                <p className="text-sm text-gray-500">{editingMerchant.name}</p>
              </div>

              <div className="px-5 py-4 space-y-4">
                <p className="text-xs text-gray-500">
                  City controls which entry appears in the header city dropdown.
                </p>
                {[
                  { key: "city", label: "City" },
                  { key: "state", label: "State" },
                  { key: "area", label: "Area" },
                  { key: "pincode", label: "Pincode" },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                    <input
                      type="text"
                      value={editForm[f.key]}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    rows={2}
                    value={editForm.address}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="px-5 py-4 border-t border-gray-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingMerchant(null)}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editMutation.isPending}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
                >
                  {editMutation.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Merchants;
