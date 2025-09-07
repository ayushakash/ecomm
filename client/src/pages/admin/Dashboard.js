import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  UsersIcon, 
  BuildingStorefrontIcon, 
  CubeIcon, 
  ShoppingCartIcon,
  CurrencyRupeeIcon,
  ChartBarIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';
import { orderAPI } from '../../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';

const AdminDashboard = () => {
  const { data: dashboard } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => orderAPI.getAdminDashboard(),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000 // 10 minutes
  });

  // Critical quick-view metrics for dashboard
  const criticalStats = [
    {
      name: "Today's Orders",
      value: dashboard?.summary?.todaysOrders || 0,
      icon: ShoppingCartIcon,
      color: 'bg-blue-500',
      subtitle: `vs ${dashboard?.summary?.weeklyOrders - dashboard?.summary?.todaysOrders || 0} yesterday`,
      change: '+12%',
      isToday: true
    },
    {
      name: "Today's Revenue", 
      value: `₹${(dashboard?.summary?.todaysRevenue || 0).toLocaleString()}`,
      icon: CurrencyRupeeIcon,
      color: 'bg-green-500',
      subtitle: `₹${dashboard?.insights?.averageOrderValue || 0} avg order`,
      change: '+8%',
      isToday: true
    },
    {
      name: '🚨 Unassigned Items',
      value: dashboard?.summary?.unassignedItems || 0,
      icon: ChartBarIcon, 
      color: 'bg-red-500',
      subtitle: 'Require immediate attention',
      urgent: true,
      actionable: true
    },
    {
      name: '⏳ Pending Approvals',
      value: (dashboard?.summary?.pendingMerchants || 0) + (dashboard?.summary?.pendingUsers || 0),
      icon: UsersIcon,
      color: 'bg-orange-500', 
      subtitle: 'Users & merchants awaiting approval',
      urgent: true,
      actionable: true
    }
  ];

  // Quick platform overview (non-urgent)
  const overviewStats = [
    {
      name: 'Active Merchants',
      value: dashboard?.summary?.activeMerchants || 0,
      subtitle: `${dashboard?.insights?.merchantUtilization || 0}% utilization`,
      color: 'bg-indigo-100 text-indigo-800'
    },
    {
      name: 'Total Products', 
      value: dashboard?.summary?.totalProducts || 0,
      subtitle: 'In catalog',
      color: 'bg-purple-100 text-purple-800'
    },
    {
      name: 'This Week\'s Revenue',
      value: `₹${(dashboard?.summary?.weeklyRevenue || 0).toLocaleString()}`,
      subtitle: 'Last 7 days performance',
      color: 'bg-green-100 text-green-800'
    }
  ];

  // Recent activity and actionable items
  const actionItems = [
    {
      title: "Unassigned Orders",
      count: dashboard?.summary?.unassignedItems || 0,
      description: "Items awaiting merchant assignment",
      action: "Assign Now",
      link: "/admin/orders",
      urgent: dashboard?.summary?.unassignedItems > 0,
      color: "border-red-200 bg-red-50"
    },
    {
      title: "Pending Merchant Approvals", 
      count: dashboard?.summary?.pendingMerchants || 0,
      description: "New merchants awaiting approval",
      action: "Review Applications",
      link: "/admin/merchants",
      urgent: dashboard?.summary?.pendingMerchants > 0,
      color: "border-orange-200 bg-orange-50"
    },
    {
      title: "Low Stock Alerts",
      count: dashboard?.summary?.lowStockItems || 0,
      description: "Products running low on inventory", 
      action: "View Products",
      link: "/admin/products",
      color: "border-yellow-200 bg-yellow-50"
    }
  ];

  // Format monthly revenue data for charts
  const monthlyData = dashboard?.monthlyRevenue?.map(item => ({
    month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
    revenue: item.revenue,
    orders: item.orders
  })) || [];

  return (
    <div className="min-h-screen bg-gray-50 py-8 pl-8">
      <div className="max-w-7xl mx-auto px-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Today's critical metrics and action items</p>
        </div>
        <div className="flex items-center space-x-2 bg-blue-100 px-4 py-2 rounded-lg">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-blue-700 font-medium">Live</span>
        </div>
      </div>

      {/* Critical Metrics - What Admin Needs to Know Right Now */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {criticalStats.map((stat) => (
          <div key={stat.name} className={`bg-white rounded-lg shadow-sm border-2 ${
            stat.urgent ? 'border-red-200 bg-red-50' : 
            stat.isToday ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
          } p-6 hover:shadow-md transition-shadow`}>
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
              <div className="text-right">
                {stat.change && (
                  <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded mb-1">
                    {stat.change}
                  </div>
                )}
                {stat.urgent && (
                  <div className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded animate-pulse">
                    ACTION NEEDED
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Items - Things Admin Needs to Do */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          ⚡ Action Items
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {actionItems.map((item, index) => (
            <div key={index} className={`p-6 rounded-lg border-2 ${item.color} ${
              item.urgent ? 'ring-2 ring-red-200' : ''
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  {item.urgent && <span className="text-red-500 mr-2">🚨</span>}
                  {item.title}
                </h3>
                <span className={`text-2xl font-bold ${
                  item.urgent ? 'text-red-600' : 'text-gray-700'
                }`}>
                  {item.count}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-4">{item.description}</p>
              <button 
                onClick={() => window.location.href = item.link}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                  item.urgent 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {item.action}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Platform Health Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Platform Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {overviewStats.map((stat, index) => (
            <div key={index} className="text-center p-4 rounded-lg bg-gray-50">
              <div className={`inline-flex px-4 py-2 rounded-full ${stat.color} font-bold text-3xl mb-2`}>
                {stat.value}
              </div>
              <p className="font-medium text-gray-900">{stat.name}</p>
              <p className="text-sm text-gray-500">{stat.subtitle}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Access to Recent Orders - Only Most Critical */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Recent Critical Orders</h2>
          <button 
            onClick={() => window.location.href = '/admin/orders'}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
          >
            View All Orders →
          </button>
        </div>
        <div className="space-y-3">
          {dashboard?.recentOrders?.slice(0, 3).map((order) => (
            <div key={order._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Order #{order.orderNumber}</p>
                <p className="text-sm text-gray-600">{order.customerName}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">₹{order.totalAmount?.toLocaleString()}</p>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  order.orderStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  order.orderStatus === 'processing' ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {order.orderStatus}
                </span>
              </div>
            </div>
          )) || <p className="text-gray-500">No recent orders</p>}
        </div>
      </div>

      {/* Quick Navigation to Other Sections */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Quick Navigation</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={() => window.location.href = '/admin/analytics'}
            className="p-4 text-center bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
          >
            <div className="text-2xl mb-2">📊</div>
            <div className="font-medium text-gray-900">Detailed Analytics</div>
            <div className="text-xs text-gray-500">Charts & Trends</div>
          </button>
          
          <button 
            onClick={() => window.location.href = '/admin/users'}
            className="p-4 text-center bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
          >
            <div className="text-2xl mb-2">👥</div>
            <div className="font-medium text-gray-900">User Management</div>
            <div className="text-xs text-gray-500">Customers & Roles</div>
          </button>
          
          <button 
            onClick={() => window.location.href = '/admin/merchants'}
            className="p-4 text-center bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
          >
            <div className="text-2xl mb-2">🏪</div>
            <div className="font-medium text-gray-900">Merchants</div>
            <div className="text-xs text-gray-500">Approvals & Management</div>
          </button>
          
          <button 
            onClick={() => window.location.href = '/admin/products'}
            className="p-4 text-center bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 transition-colors"
          >
            <div className="text-2xl mb-2">📦</div>
            <div className="font-medium text-gray-900">Products</div>
            <div className="text-xs text-gray-500">Catalog & Inventory</div>
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
