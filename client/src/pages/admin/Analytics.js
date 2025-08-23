import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { orderAPI } from '../../services/api';
import { ChartBarIcon, CurrencyRupeeIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

const statIcons = {
  totalOrders: ShoppingCartIcon,
  totalRevenue: CurrencyRupeeIcon,
  deliveredOrders: ChartBarIcon,
  pendingOrders: ShoppingCartIcon,
  processingOrders: ShoppingCartIcon,
};

const statColors = {
  totalOrders: 'bg-blue-500',
  totalRevenue: 'bg-green-500',
  deliveredOrders: 'bg-purple-500',
  pendingOrders: 'bg-yellow-500',
  processingOrders: 'bg-orange-500',
};

function formatMonth({ year, month }) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

const Analytics = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => orderAPI.getAnalytics().then(res => res.data),
  });

  // Pie chart data for order status
  const statusPieData = [
    { name: 'Pending', value: data?.summary?.pendingOrders || 0, color: '#fbbf24' },
    { name: 'Processing', value: data?.summary?.processingOrders || 0, color: '#fb923c' },
    { name: 'Delivered', value: data?.summary?.deliveredOrders || 0, color: '#a78bfa' },
  ];

  // Line chart data for revenue trend
  const monthlyLineData = (data?.monthlyRevenue || []).map(m => ({
    month: formatMonth(m._id),
    revenue: m.revenue,
  })).reverse();
  const stats = [
    {
      key: 'totalOrders',
      name: 'Total Orders',
      value: data?.summary?.totalOrders || 0,
      icon: statIcons.totalOrders,
      color: statColors.totalOrders,
    },
    {
      key: 'deliveredOrders',
      name: 'Delivered Orders',
      value: data?.summary?.deliveredOrders || 0,
      icon: statIcons.deliveredOrders,
      color: statColors.deliveredOrders,
    },
    {
      key: 'pendingOrders',
      name: 'Pending Orders',
      value: data?.summary?.pendingOrders || 0,
      icon: statIcons.pendingOrders,
      color: statColors.pendingOrders,
    },
    {
      key: 'processingOrders',
      name: 'Processing Orders',
      value: data?.summary?.processingOrders || 0,
      icon: statIcons.processingOrders,
      color: statColors.processingOrders,
    },
    {
      key: 'totalRevenue',
      name: 'Total Revenue',
      value: `₹${data?.summary?.totalRevenue || 0}`,
      icon: statIcons.totalRevenue,
      color: statColors.totalRevenue,
    },
  ];

  const monthlyRevenue = (data?.monthlyRevenue || []).map(m => ({
    month: formatMonth(m._id),
    revenue: m.revenue,
    orders: m.count,
  })).reverse();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600">Overview of sales, orders, and revenue trends</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat) => (
          <div key={stat.key} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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

      {/* Monthly Revenue Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue & Orders</h2>
        {monthlyRevenue.length === 0 ? (
          <p className="text-gray-600">No data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyRevenue} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              {/* Order Status Pie Chart */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Status Distribution</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <YAxis />
              {/* Revenue Trend Line Chart */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend (Last 6 Months)</h2>
                {monthlyLineData.length === 0 ? (
                  <p className="text-gray-600">No data available</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={monthlyLineData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#22c55e" name="Revenue" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#22c55e" name="Revenue" />
              <Bar dataKey="orders" fill="#3b82f6" name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default Analytics;
