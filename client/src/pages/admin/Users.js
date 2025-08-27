import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { userAPI } from "../../services/api";
import DataTable from "../../components/commonComponents/dataTable";

const Users = () => {
  const { data: userList, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: () => userAPI.getUsers(),
  });

  // 🔎 search state (passed down to DataTable)
  const [globalFilter, setGlobalFilter] = useState("");

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
        <p className="text-red-600">Error loading users: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
  );
};

export default Users;
