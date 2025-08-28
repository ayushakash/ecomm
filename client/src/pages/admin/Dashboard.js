import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  UsersIcon, 
  BuildingStorefrontIcon, 
  CubeIcon, 
  ShoppingCartIcon,
  CurrencyRupeeIcon
} from '@heroicons/react/24/outline';
import { orderAPI } from '../../services/api';

const AdminDashboard = () => {
  const { data: analytics } = useQuery({
    queryKey: ['admin-analytics'],
  queryFn: () => orderAPI.getAnalytics()
  });
  console.log(analytics)

  const stats = [
    {
      name: 'Total Users',
      value: analytics?.totalUsers || 0,
      icon: UsersIcon,
      color: 'bg-blue-500'
    },
    {
      name: 'Active Merchants',
      value: analytics?.activeMerchants || 0,
      icon: BuildingStorefrontIcon,
      color: 'bg-green-500'
    },
    {
      name: 'Total Products',
      value: analytics?.totalProducts || 0,
      icon: CubeIcon,
      color: 'bg-purple-500'
    },
    {
      name: 'Total Orders',
      value: analytics?.summary?.totalOrders || 0,
      icon: ShoppingCartIcon,
      color: 'bg-yellow-500'
    },
    {
      name: 'Total Sales',
      value: `₹${analytics?.summary?.totalRevenue || 0}`,
      icon: CurrencyRupeeIcon,
      color: 'bg-red-500'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">Welcome to the construction materials e-commerce admin panel</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <p className="text-gray-600">No recent activity to display</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
