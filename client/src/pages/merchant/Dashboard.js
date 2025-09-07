import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  CubeIcon, 
  ShoppingCartIcon,
  CurrencyRupeeIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { orderAPI } from '../../services/api';

const MerchantDashboard = () => {
  const { data: dashboard, refetch } = useQuery({
    queryKey: ['merchant-dashboard'],
    queryFn: () => orderAPI.getMerchantDashboard(),
    refetchInterval: 30000 // Auto-refresh every 30 seconds
  });

  // Today's critical metrics for immediate attention
  const criticalStats = [
    {
      name: "Today's Revenue",
      value: `₹${(dashboard?.summary?.todaysRevenue || 0).toLocaleString()}`,
      icon: CurrencyRupeeIcon,
      color: 'bg-green-500',
      subtitle: `${dashboard?.summary?.todaysOrders || 0} orders today`,
      change: '+5%',
      isToday: true
    },
    {
      name: '🔥 New Orders Available',
      value: dashboard?.summary?.unassignedOrders || 0,
      icon: ExclamationTriangleIcon,
      color: 'bg-orange-500',
      subtitle: 'Click to accept & earn',
      urgent: (dashboard?.summary?.unassignedOrders || 0) > 0,
      actionable: true
    },
    {
      name: '⏳ Processing Orders',
      value: dashboard?.summary?.processingOrders || 0,
      icon: ClockIcon,
      color: 'bg-blue-500',
      subtitle: 'Need to be delivered',
      urgent: (dashboard?.summary?.processingOrders || 0) > 0,
      actionable: true
    },
    {
      name: '✅ Completed Today',
      value: dashboard?.summary?.completedToday || 0,
      icon: CheckCircleIcon,
      color: 'bg-purple-500',
      subtitle: 'Great job!',
      isToday: true
    }
  ];

  // Quick overview stats (non-urgent)
  const overviewStats = [
    {
      name: 'Total Revenue',
      value: `₹${(dashboard?.summary?.totalRevenue || 0).toLocaleString()}`,
      subtitle: 'All time earnings',
      color: 'bg-green-100 text-green-800'
    },
    {
      name: 'Total Orders',
      value: dashboard?.summary?.totalOrders || 0,
      subtitle: 'Orders completed',
      color: 'bg-blue-100 text-blue-800'
    },
    {
      name: 'Success Rate',
      value: `${dashboard?.summary?.successRate || 0}%`,
      subtitle: 'Orders delivered',
      color: 'bg-purple-100 text-purple-800'
    }
  ];

  // Action items for merchant
  const actionItems = [
    {
      title: "New Orders Available",
      count: dashboard?.summary?.unassignedOrders || 0,
      description: "Accept these orders to start earning",
      action: "View & Accept",
      link: "/merchant/orders?tab=new",
      urgent: (dashboard?.summary?.unassignedOrders || 0) > 0,
      color: "border-orange-200 bg-orange-50"
    },
    {
      title: "Orders to Deliver",
      count: dashboard?.summary?.processingOrders || 0,
      description: "Mark these as delivered when completed",
      action: "Mark Delivered",
      link: "/merchant/orders?tab=my",
      urgent: (dashboard?.summary?.processingOrders || 0) > 0,
      color: "border-blue-200 bg-blue-50"
    },
    {
      title: "Low Stock Items",
      count: dashboard?.summary?.lowStockItems || 0,
      description: "Update stock to avoid missing orders",
      action: "Update Stock",
      link: "/merchant/products",
      color: "border-yellow-200 bg-yellow-50"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 pl-8">
      <div className="max-w-7xl mx-auto px-8 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Merchant Dashboard</h1>
            <p className="text-gray-600">Today's metrics and action items</p>
          </div>
          <div className="flex items-center space-x-2 bg-green-100 px-4 py-2 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-700 font-medium">Live</span>
          </div>
        </div>

        {/* Critical Metrics - What Merchant Needs to Know Right Now */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {criticalStats.map((stat) => (
            <div key={stat.name} className={`bg-white rounded-lg shadow-sm border-2 ${
              stat.urgent ? 'border-orange-200 bg-orange-50' : 
              stat.isToday ? 'border-green-200 bg-green-50' : 'border-gray-200'
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
                    <div className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded animate-pulse">
                      ACTION NEEDED
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Items - Things Merchant Needs to Do */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            ⚡ Action Items
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {actionItems.map((item, index) => (
              <div key={index} className={`p-6 rounded-lg border-2 ${item.color} ${
                item.urgent ? 'ring-2 ring-orange-200' : ''
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    {item.urgent && <span className="text-orange-500 mr-2">🔥</span>}
                    {item.title}
                  </h3>
                  <span className={`text-2xl font-bold ${
                    item.urgent ? 'text-orange-600' : 'text-gray-700'
                  }`}>
                    {item.count}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4">{item.description}</p>
                <button 
                  onClick={() => window.location.href = item.link}
                  className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                    item.urgent 
                      ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {item.action}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Platform Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Performance Overview</h2>
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

        {/* Recent Orders - Only Most Important */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent Active Orders</h2>
            <button 
              onClick={() => window.location.href = '/merchant/orders'}
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
                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            )) || <p className="text-gray-500">No recent orders</p>}
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Quick Navigation</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button 
              onClick={() => window.location.href = '/merchant/orders?tab=new'}
              className="p-4 text-center bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 transition-colors"
            >
              <div className="text-2xl mb-2">🆕</div>
              <div className="font-medium text-gray-900">New Orders</div>
              <div className="text-xs text-gray-500">Accept & Earn</div>
            </button>
            
            <button 
              onClick={() => window.location.href = '/merchant/orders?tab=my'}
              className="p-4 text-center bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
            >
              <div className="text-2xl mb-2">📦</div>
              <div className="font-medium text-gray-900">My Orders</div>
              <div className="text-xs text-gray-500">Track & Deliver</div>
            </button>
            
            <button 
              onClick={() => window.location.href = '/merchant/products'}
              className="p-4 text-center bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
            >
              <div className="text-2xl mb-2">🏪</div>
              <div className="font-medium text-gray-900">Products</div>
              <div className="text-xs text-gray-500">Stock & Pricing</div>
            </button>
            
            <button 
              onClick={() => window.location.href = '/merchant/analytics'}
              className="p-4 text-center bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
            >
              <div className="text-2xl mb-2">📊</div>
              <div className="font-medium text-gray-900">Detailed Analytics</div>
              <div className="text-xs text-gray-500">Charts & Trends</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MerchantDashboard;