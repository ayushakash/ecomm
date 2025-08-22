import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  CubeIcon, 
  ShoppingCartIcon,
  CurrencyRupeeIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { orderAPI } from '../../services/api';

const MerchantDashboard = () => {
  const { data: dashboard } = useQuery({
    queryKey: ['merchant-dashboard'],
  queryFn: () => orderAPI.getMerchantDashboard()
  });

  const stats = [
    {
      name: 'Total Products',
      value: dashboard?.totalProducts || 0,
      icon: CubeIcon,
      color: 'bg-blue-500'
    },
    {
      name: 'Total Orders',
      value: dashboard?.totalOrders || 0,
      icon: ShoppingCartIcon,
      color: 'bg-green-500'
    },
    {
      name: 'Total Revenue',
      value: `₹${dashboard?.totalRevenue || 0}`,
      icon: CurrencyRupeeIcon,
      color: 'bg-purple-500'
    },
    {
      name: 'Pending Orders',
      value: dashboard?.pendingOrders || 0,
      icon: ChartBarIcon,
      color: 'bg-yellow-500'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Merchant Dashboard</h1>
        <p className="text-gray-600">Welcome to your merchant dashboard</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* Recent Orders */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h2>
        <div className="space-y-4">
          {dashboard?.recentOrders?.length > 0 ? (
            dashboard.recentOrders.map((order) => (
              <div key={order._id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Order #{order.orderNumber}</p>
                  <p className="text-sm text-gray-600">{order.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">₹{order.totalAmount}</p>
                  <p className="text-sm text-gray-600">{order.status}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-600">No recent orders</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MerchantDashboard;
