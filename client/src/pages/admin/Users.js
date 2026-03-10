import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userAPI } from "../../services/api";
import DataTable from "../../components/commonComponents/dataTable";
import { toast } from "react-hot-toast";

const Users = () => {
  const queryClient = useQueryClient();
  const { data: userList, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: () => userAPI.getUsers(),
  });

  // 🔎 search state (passed down to DataTable)
  const [globalFilter, setGlobalFilter] = useState("");

  // Mutations for user management
  const statusMutation = useMutation({
    mutationFn: ({ userId, isActive }) => userAPI.updateUserStatus(userId, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      toast.success("User status updated successfully!");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to update user status");
    }
  });


  const handleStatusToggle = (userId, isActive) => {
    statusMutation.mutate({ userId, isActive });
  };


  // Define columns for users
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
        header: "Email",
        accessorKey: "email",
      },
      {
        header: "Role",
        accessorKey: "role",
        cell: (info) => {
          const role = info.getValue();
          return (
            <span
              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                role === "admin"
                  ? "bg-red-100 text-red-800"
                  : role === "merchant"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-green-100 text-green-800"
              }`}
            >
              {role}
            </span>
          );
        },
      },
      {
        header: "Area",
        accessorKey: "area",
        cell: (info) => (
          <span className="text-gray-700">{info.getValue() || '-'}</span>
        ),
      },
      {
        header: "Status",
        id: "status",
        accessorFn: (row) => (row.isActive ? "Active" : "Inactive"), // ✅ makes search work for status
        cell: (info) => {
          const status = info.getValue();
          return (
            <span
              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                status === "Active"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {status}
            </span>
          );
        },
      },
      {
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex space-x-2">
            <button
              className={`px-3 py-1 text-xs rounded-full font-medium ${
                row.original.isActive 
                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
              onClick={() => handleStatusToggle(row.original._id, !row.original.isActive)}
            >
              {row.original.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        ),
      },
    ],
    [handleStatusToggle]
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
        <p className="text-red-600">Error loading users: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
          <p className="text-gray-600">Manage all users in the system</p>
        </div>

        <DataTable
          title="All Users"
          columns={columns}
          data={userList?.users ?? []}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          renderCard={(user) => (
            <div key={user._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
              {/* Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      user.role === 'admin' ? 'bg-gradient-to-br from-red-500 to-pink-600' :
                      user.role === 'merchant' ? 'bg-gradient-to-br from-blue-500 to-purple-600' :
                      'bg-gradient-to-br from-green-500 to-emerald-600'
                    }`}>
                      <span className="text-white font-bold text-sm">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{user.name}</h3>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      user.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                {/* Role */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Role</span>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === "admin"
                        ? "bg-red-100 text-red-800"
                        : user.role === "merchant"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {user.role}
                  </span>
                </div>

                {/* Area */}
                {user.area && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Area</span>
                    <span className="text-sm font-medium text-gray-900">{user.area}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                <button
                  className={`w-full inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    user.isActive
                      ? 'border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                      : 'border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                  }`}
                  onClick={() => handleStatusToggle(user._id, !user.isActive)}
                >
                  {user.isActive ? 'Deactivate User' : 'Activate User'}
                </button>
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
};

export default Users;
