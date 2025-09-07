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

const MerchantAnalytics = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['merchant-analytics'],
    queryFn: () => orderAPI.getMerchantAnalytics(),
    refetchInterval: 30000 // Auto-refresh every 30 seconds
  });

  const statusPieData = [
    { name: 'Pending', value: data?.summary?.pendingOrders || 0, color: '#fbbf24' },
    { name: 'Processing', value: data?.summary?.processingOrders || 0, color: '#fb923c' },
    { name: 'Delivered', value: data?.summary?.deliveredOrders || 0, color: '#a78bfa' },
  ];

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
        <p className="text-red-600">Error loading analytics: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                📊 Analytics Dashboard
              </h1>
              <p className="text-gray-600 text-lg mt-2">Track your business performance and growth</p>
            </div>
            <div className="flex items-center space-x-3 bg-gradient-to-r from-green-50 to-blue-50 px-6 py-3 rounded-full border border-green-200">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-700 font-semibold">Live Data</span>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {stats.map((stat) => (
            <div key={stat.key} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-4 rounded-full ${stat.color} shadow-lg`}>
                    <stat.icon className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{stat.name}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Monthly Revenue Chart */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                📈 Monthly Performance
              </h2>
              <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                Last 6 Months
              </div>
            </div>
            {monthlyRevenue.length === 0 ? (
              <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-6xl mb-4">📊</div>
                  <p className="text-gray-600 font-medium">No sales data yet</p>
                  <p className="text-gray-500 text-sm">Start selling to see your performance</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={monthlyRevenue} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue (₹)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="orders" fill="#3b82f6" name="Orders" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Order Status Pie Chart */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                🎯 Order Status
              </h2>
              <div className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                Distribution
              </div>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  innerRadius={60}
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                  }} 
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Revenue Trend Line Chart */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              📊 Revenue Trend
            </h2>
            <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              Growth Analysis
            </div>
          </div>
          {monthlyLineData.length === 0 ? (
            <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-6xl mb-4">📈</div>
                <p className="text-gray-600 font-medium">No trend data available</p>
                <p className="text-gray-500 text-sm">Complete more orders to see trends</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyLineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                  }} 
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  name="Revenue (₹)" 
                  strokeWidth={4} 
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Performance Insights */}
        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl shadow-lg p-8 text-white">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold flex items-center">
              🎯 Performance Insights
            </h2>
            <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
              <span className="text-white font-semibold text-sm">Key Metrics</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-green-500/20 rounded-full">
                  <span className="text-2xl">🏆</span>
                </div>
                <h3 className="font-semibold text-white/90 ml-3">Best Month</h3>
              </div>
              <p className="text-3xl font-bold text-white mb-2">
                {data?.insights?.bestMonth || 'N/A'}
              </p>
              <p className="text-white/70 text-sm">
                ₹{(data?.insights?.bestMonthRevenue || 0).toLocaleString()} earned
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-blue-500/20 rounded-full">
                  <span className="text-2xl">💰</span>
                </div>
                <h3 className="font-semibold text-white/90 ml-3">Avg Order Value</h3>
              </div>
              <p className="text-3xl font-bold text-white mb-2">
                ₹{(data?.insights?.averageOrderValue || 0).toLocaleString()}
              </p>
              <p className="text-white/70 text-sm">
                Per order earnings
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-purple-500/20 rounded-full">
                  <span className="text-2xl">✅</span>
                </div>
                <h3 className="font-semibold text-white/90 ml-3">Success Rate</h3>
              </div>
              <p className="text-3xl font-bold text-white mb-2">
                {data?.insights?.successRate || 0}%
              </p>
              <p className="text-white/70 text-sm">
                Orders delivered
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-orange-500/20 rounded-full">
                  <span className="text-2xl">📈</span>
                </div>
                <h3 className="font-semibold text-white/90 ml-3">Growth Rate</h3>
              </div>
              <p className="text-3xl font-bold text-white mb-2">
                {data?.insights?.growthRate >= 0 ? '+' : ''}{data?.insights?.growthRate || 0}%
              </p>
              <p className="text-white/70 text-sm">
                Month over month
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Orders Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              📋 Recent Orders
            </h2>
            <button 
              onClick={() => window.location.href = '/merchant/orders'}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-full font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              View All Orders →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Order #
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {data?.recentOrders?.slice(0, 10).map((order, index) => (
                  <tr key={order._id} className={`hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                      #{order.orderNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {order.customerName}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-green-600">
                      ₹{order.totalAmount?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-2 text-xs font-bold rounded-full shadow-sm ${
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                        order.status === 'processing' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        order.status === 'delivered' ? 'bg-green-100 text-green-800 border border-green-200' :
                        'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {order.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="text-center">
                        <div className="text-6xl mb-4">📦</div>
                        <p className="text-gray-600 font-medium text-lg">No orders yet</p>
                        <p className="text-gray-500">Start accepting orders to see them here</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MerchantAnalytics;
