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
        accessorKey: "area", // ✅ includes Area
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
    <div className="min-h-screen bg-gray-50 py-8 pl-8">
      <div className="max-w-7xl mx-auto px-8 space-y-6">
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
        />
      </div>
    </div>
  );
};

export default Users;
