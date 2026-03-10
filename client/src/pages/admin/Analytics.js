import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { orderAPI } from '../../services/api';
import api from '../../services/api';
import { ChartBarIcon, CurrencyRupeeIcon, ShoppingCartIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
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
  const [searchDays, setSearchDays] = useState(30);

  const { data: analytics } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => orderAPI.getAnalytics(),
  });

  const { data: dashboard } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => orderAPI.getAdminDashboard(),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // User behavior analytics
  const { data: searchTerms } = useQuery({
    queryKey: ['search-analytics', searchDays],
    queryFn: () => api.get(`/api/analytics/search-terms?days=${searchDays}&limit=20`).then(res => res.data),
  });

  const { data: popularProducts } = useQuery({
    queryKey: ['popular-products', searchDays],
    queryFn: () => api.get(`/api/analytics/popular-products?eventType=product_view&days=${searchDays}&limit=10`).then(res => res.data),
  });

  const { data: calculatorUsage } = useQuery({
    queryKey: ['calculator-usage', searchDays],
    queryFn: () => api.get(`/api/analytics/calculator-usage?days=${searchDays}`).then(res => res.data),
  });

  console.log('Analytics:', analytics);
  console.log('Dashboard:', dashboard);
  console.log('Search Terms:', searchTerms);
  console.log('Popular Products:', popularProducts);
  console.log('Calculator Usage:', calculatorUsage);

  // Use dashboard data for real-time metrics and analytics for historical data
  const combinedData = { ...analytics, ...dashboard };

  // Today's quick stats
  const todayStats = [
    {
      key: 'todaysOrders',
      name: "Today's Orders",
      value: dashboard?.summary?.todaysOrders || 0,
      icon: statIcons.totalOrders,
      color: 'bg-blue-500',
      subtitle: `${dashboard?.summary?.weeklyOrders || 0} this week`,
      isToday: true
    },
    {
      key: 'todaysRevenue',
      name: "Today's Revenue",
      value: `₹${(dashboard?.summary?.todaysRevenue || 0).toLocaleString()}`,
      icon: statIcons.totalRevenue,
      color: 'bg-green-500',
      subtitle: `₹${(dashboard?.summary?.weeklyRevenue || 0).toLocaleString()} this week`,
      isToday: true
    },
    {
      key: 'unassignedItems',
      name: 'Items Pending Assignment',
      value: dashboard?.summary?.unassignedItems || 0,
      icon: statIcons.pendingOrders,
      color: 'bg-orange-500',
      subtitle: 'Need immediate attention',
      urgent: true
    },
    {
      key: 'activeToday',
      name: 'Merchants Active This Week',
      value: dashboard?.summary?.activeThisWeek || 0,
      icon: statIcons.deliveredOrders,
      color: 'bg-purple-500',
      subtitle: `${dashboard?.summary?.activeMerchants || 0} total active`
    }
  ];

  // Pie chart data for order status (using analytics data)
  const statusPieData = [
    { name: 'Pending', value: analytics?.summary?.pendingOrders || 0, color: '#fbbf24' },
    { name: 'Processing', value: analytics?.summary?.processingOrders || 0, color: '#fb923c' },
    { name: 'Delivered', value: analytics?.summary?.deliveredOrders || 0, color: '#a78bfa' },
  ];

  // Line chart data for revenue trend  
  const monthlyLineData = (dashboard?.monthlyRevenue || []).map(m => ({
    month: formatMonth(m._id),
    revenue: m.revenue,
  })).reverse();

  // All-time analytics stats
  const stats = [
    {
      key: 'totalOrders',
      name: 'Total Orders',
      value: analytics?.summary?.totalOrders || 0,
      icon: statIcons.totalOrders,
      color: statColors.totalOrders,
    },
    {
      key: 'deliveredOrders',
      name: 'Delivered Orders',
      value: analytics?.summary?.deliveredOrders || 0,
      icon: statIcons.deliveredOrders,
      color: statColors.deliveredOrders,
    },
    {
      key: 'pendingOrders',
      name: 'Pending Orders',
      value: analytics?.summary?.pendingOrders || 0,
      icon: statIcons.pendingOrders,
      color: statColors.pendingOrders,
    },
    {
      key: 'processingOrders',
      name: 'Processing Orders',
      value: analytics?.summary?.processingOrders || 0,
      icon: statIcons.processingOrders,
      color: statColors.processingOrders,
    },
    {
      key: 'totalRevenue',
      name: 'Total Revenue',
      value: `₹${(analytics?.summary?.totalRevenue || 0).toLocaleString()}`,
      icon: statIcons.totalRevenue,
      color: statColors.totalRevenue,
    },
  ];

  const monthlyRevenue = (dashboard?.monthlyRevenue || []).map(m => ({
    month: formatMonth(m._id),
    revenue: m.revenue,
    orders: m.orders,
  })).reverse();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-8">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Real-time insights and comprehensive analytics</p>
          <p className="text-sm text-gray-500 mt-1">Auto-refreshes every 30 seconds</p>
        </div>
        <div className="flex items-center space-x-2 bg-blue-100 px-4 py-2 rounded-lg">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-blue-700 font-medium">Live Analytics</span>
        </div>
      </div>

      {/* Today's Performance */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          📊 Today's Performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {todayStats.map((stat) => (
            <div key={stat.key} className={`bg-white rounded-lg shadow-sm border-2 p-6 ${
              stat.urgent ? 'border-orange-200 bg-orange-50' : 
              stat.isToday ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.subtitle}</p>
                  </div>
                </div>
                {stat.isToday && (
                  <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">TODAY</div>
                )}
                {stat.urgent && (
                  <div className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded animate-pulse">URGENT</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All-time Analytics Stats Grid */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">📈 Historical Analytics</h2>
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
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#22c55e" name="Revenue" />
              <Bar dataKey="orders" fill="#3b82f6" name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Detailed Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Line Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend (6 Months)</h2>
          {monthlyLineData.length === 0 ? (
            <p className="text-gray-600">No data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyLineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#22c55e" name="Revenue" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Order Status Pie Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Status Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusPieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({name, value}) => `${name}: ${value}`}
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
      </div>

      {/* Performance Analysis Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            🏆 Top Selling Products
          </h2>
          <div className="space-y-4">
            {dashboard?.topProducts?.length > 0 ? (
              dashboard.topProducts.map((product, index) => (
                <div key={product._id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm mr-4 ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-orange-400' : 'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{product.productName}</p>
                      <p className="text-sm text-gray-600">{product.totalSold} units sold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">₹{product.totalRevenue.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Revenue</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600">No product data available</p>
            )}
          </div>
        </div>

        {/* Top Merchants by Performance */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            🥇 Top Performing Merchants
          </h2>
          <div className="space-y-4">
            {dashboard?.topMerchants?.length > 0 ? (
              dashboard.topMerchants.map((merchant, index) => (
                <div key={merchant._id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm mr-4 ${
                      index === 0 ? 'bg-green-500' : 
                      index === 1 ? 'bg-blue-500' : 
                      index === 2 ? 'bg-purple-500' : 'bg-indigo-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{merchant.merchantInfo?.businessName || merchant.merchantInfo?.name || 'Unknown Merchant'}</p>
                      <p className="text-sm text-gray-600">{merchant.merchantInfo?.name || 'Unknown Contact'}</p>
                      <p className="text-xs text-gray-500">{merchant.totalOrders} orders completed</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">₹{merchant.totalRevenue.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Revenue</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600">No merchant data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Analytics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Platform Performance Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              ₹{dashboard?.insights?.averageOrderValue || 0}
            </div>
            <p className="text-sm font-medium text-gray-700">Average Order Value</p>
            <p className="text-xs text-gray-500">Per transaction</p>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {dashboard?.insights?.merchantUtilization || 0}%
            </div>
            <p className="text-sm font-medium text-gray-700">Merchant Utilization</p>
            <p className="text-xs text-gray-500">Active vs total</p>
          </div>
          
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-3xl font-bold text-yellow-600 mb-2">
              {dashboard?.summary?.weeklyOrders || 0}
            </div>
            <p className="text-sm font-medium text-gray-700">Weekly Orders</p>
            <p className="text-xs text-gray-500">Last 7 days</p>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {dashboard?.summary?.activeThisWeek || 0}
            </div>
            <p className="text-sm font-medium text-gray-700">Active Merchants</p>
            <p className="text-xs text-gray-500">This week</p>
          </div>
        </div>
      </div>

      {/* Comprehensive Order Analytics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Detailed Order Analytics</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dashboard?.recentOrders?.slice(0, 8).map((order) => (
                <tr key={order._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                    #{order.orderNumber || order._id.slice(-6)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{order.customerId?.name || order.customerName}</div>
                      <div className="text-gray-500">{order.customerPhone}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    ₹{order.totalAmount?.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      order.orderStatus === 'delivered' ? 'bg-green-100 text-green-800' :
                      order.orderStatus === 'processing' ? 'bg-blue-100 text-blue-800' :
                      order.orderStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.orderStatus?.charAt(0).toUpperCase() + order.orderStatus?.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <div>{new Date(order.createdAt).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.items?.length || 0} items
                  </td>
                </tr>
              )) || (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No order data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Behavior Analytics Section */}
      <div className="border-t-4 border-blue-600 pt-8">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <MagnifyingGlassIcon className="h-7 w-7 mr-2 text-blue-600" />
              User Behavior & Search Analytics
            </h2>
            <p className="text-gray-600 mt-1">Track what users are searching for and their behavior</p>
          </div>
          <select
            value={searchDays}
            onChange={(e) => setSearchDays(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        {/* Calculator Usage Stats */}
        {calculatorUsage?.stats && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow-sm border-2 border-purple-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              🧮 Construction Calculator Usage
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {calculatorUsage.stats.totalUsage || 0}
                </div>
                <p className="text-sm font-medium text-gray-700">Total Uses</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {Math.round(calculatorUsage.stats.avgArea || 0)}
                </div>
                <p className="text-sm font-medium text-gray-700">Avg Area (sq.ft)</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-600">
                  {calculatorUsage.stats.avgFloors?.toFixed(1) || 0}
                </div>
                <p className="text-sm font-medium text-gray-700">Avg Floors</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">
                  ₹{Math.round(calculatorUsage.stats.avgCost || 0).toLocaleString()}
                </div>
                <p className="text-sm font-medium text-gray-700">Avg Estimate</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-600">
                  ₹{Math.round(calculatorUsage.stats.totalEstimatedValue || 0).toLocaleString()}
                </div>
                <p className="text-sm font-medium text-gray-700">Total Value</p>
                <p className="text-xs text-gray-500">All estimates</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Search Terms */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              🔍 Top Search Terms
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({searchTerms?.totalUnique || 0} unique searches)
              </span>
            </h3>
            <div className="space-y-3">
              {searchTerms?.searchTerms && searchTerms.searchTerms.length > 0 ? (
                searchTerms.searchTerms.map((term, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors">
                    <div className="flex items-center flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3 ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-400' : 'bg-blue-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{term.searchTerm}</p>
                        <p className="text-xs text-gray-500">
                          Last searched: {new Date(term.lastSearched).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                        {term.count} {term.count === 1 ? 'search' : 'searches'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-600 text-center py-8">No search data available</p>
              )}
            </div>
          </div>

          {/* Most Viewed Products */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              👁️ Most Viewed Products
            </h3>
            <div className="space-y-3">
              {popularProducts?.products && popularProducts.products.length > 0 ? (
                popularProducts.products.map((product, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-green-50 transition-colors">
                    <div className="flex items-center flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3 ${
                        index === 0 ? 'bg-green-500' :
                        index === 1 ? 'bg-blue-500' :
                        index === 2 ? 'bg-purple-500' : 'bg-indigo-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{product.productName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                            {product.category}
                          </span>
                          {product.currentPrice && (
                            <span className="text-xs text-green-600 font-semibold">
                              ₹{product.currentPrice.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                        {product.count} views
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-600 text-center py-8">No product view data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Search Insights */}
        {searchTerms?.searchTerms && searchTerms.searchTerms.length > 0 && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 Insights & Recommendations</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>
                  <strong>Most searched term:</strong> "{searchTerms.searchTerms[0]?.searchTerm}"
                  with {searchTerms.searchTerms[0]?.count} searches - Consider featuring these products prominently.
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>
                  <strong>User engagement:</strong> {searchTerms.totalUnique} unique search terms indicate
                  {searchTerms.totalUnique > 50 ? ' high' : searchTerms.totalUnique > 20 ? ' moderate' : ' low'} user engagement.
                </span>
              </li>
              {calculatorUsage?.stats?.totalUsage > 0 && (
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    <strong>Calculator leads:</strong> {calculatorUsage.stats.totalUsage} calculator uses
                    with avg estimate of ₹{Math.round(calculatorUsage.stats.avgCost || 0).toLocaleString()}
                    - These are high-intent potential customers!
                  </span>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default Analytics;
