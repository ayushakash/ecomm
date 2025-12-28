import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsAPI } from '../../services/api';
import { toast } from 'react-hot-toast';

const Settings = () => {
  const queryClient = useQueryClient();
  
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.getSettings()
  });

  const { data: deliveryPreview } = useQuery({
    queryKey: ['delivery-preview'],
    queryFn: () => settingsAPI.getDeliveryPreview(),
    enabled: !!settings
  });

  const [formData, setFormData] = useState({
    taxRate: 0.18,
    deliveryConfig: {
      type: 'threshold',
      fixedCharge: 50,
      freeDeliveryThreshold: 1000,
      chargeForBelowThreshold: 100,
      perKmRate: 5,
      baseDistance: 5,
      perKgRate: 10,
      freeWeightLimit: 50,
      maxDeliveryRadius: 10,
      maxExpandedRadius: 25,
      minimumMerchantsBeforeExpand: 3,
      fallbackStrategy: 'expand',
      enablePincodeGrouping: true
    },
    priceDisplayMode: 'admin',
    gstDisplayMode: 'exclusive',
    stockValidationMode: 'admin',
    autoReduceStockOnDelivery: true,
    minimumOrderValue: 100,
    platformFeeRate: 0.02
  });


  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data) => settingsAPI.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['settings']);
      queryClient.invalidateQueries(['delivery-preview']);
      toast.success('Settings updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update settings');
    }
  });


  const handleSubmit = (e) => {
    e.preventDefault();
    updateSettingsMutation.mutate(formData);
  };


  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) || 0 : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) || 0 : value
      }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 pl-8">
      <div className="max-w-7xl mx-auto px-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
          <p className="text-gray-600">Configure pricing, delivery, and display settings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Settings Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Pricing Configuration */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing Configuration</h2>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>ℹ️ Note:</strong> GST is now calculated per product based on individual product GST rates. Configure product GST rates in the Products section.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Order Value (₹)
                    </label>
                    <input
                      type="number"
                      name="minimumOrderValue"
                      value={formData.minimumOrderValue}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Minimum cart value required for checkout</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Platform Fee Rate (%)
                    </label>
                    <input
                      type="number"
                      name="platformFeeRate"
                      value={(formData.platformFeeRate * 100).toFixed(2)}
                      onChange={(e) => handleInputChange({
                        target: { name: 'platformFeeRate', value: e.target.value / 100, type: 'number' }
                      })}
                      min="0"
                      max="10"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Current: {(formData.platformFeeRate * 100).toFixed(2)}% platform fee</p>
                  </div>
                </div>
              </div>

              {/* Delivery Configuration */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery Configuration</h2>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Calculation Method
                  </label>
                  <select
                    name="deliveryConfig.type"
                    value={formData.deliveryConfig.type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="fixed">Fixed Charge</option>
                    <option value="threshold">Order Value Threshold</option>
                    <option value="distance">Distance-based (Future)</option>
                    <option value="weight">Weight-based (Future)</option>
                  </select>
                </div>

                {formData.deliveryConfig.type === 'fixed' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fixed Delivery Charge (₹)
                    </label>
                    <input
                      type="number"
                      name="deliveryConfig.fixedCharge"
                      value={formData.deliveryConfig.fixedCharge}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}

                {formData.deliveryConfig.type === 'threshold' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Free Delivery Above (₹)
                      </label>
                      <input
                        type="number"
                        name="deliveryConfig.freeDeliveryThreshold"
                        value={formData.deliveryConfig.freeDeliveryThreshold}
                        onChange={handleInputChange}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Charge Below Threshold (₹)
                      </label>
                      <input
                        type="number"
                        name="deliveryConfig.chargeForBelowThreshold"
                        value={formData.deliveryConfig.chargeForBelowThreshold}
                        onChange={handleInputChange}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Location-Based Delivery Filtering */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Location-Based Product Filtering</h2>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>ℹ️ How it works:</strong> Customers will only see products from merchants within their delivery area. This ensures no checkout failures and better delivery experience.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Delivery Radius (km)
                    </label>
                    <input
                      type="number"
                      name="deliveryConfig.maxDeliveryRadius"
                      value={formData.deliveryConfig.maxDeliveryRadius}
                      onChange={handleInputChange}
                      min="1"
                      max="50"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Default distance for merchant search
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Expanded Radius (km)
                    </label>
                    <input
                      type="number"
                      name="deliveryConfig.maxExpandedRadius"
                      value={formData.deliveryConfig.maxExpandedRadius}
                      onChange={handleInputChange}
                      min="5"
                      max="100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Extended search for sparse areas
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Merchants Before Expanding Search
                  </label>
                  <input
                    type="number"
                    name="deliveryConfig.minimumMerchantsBeforeExpand"
                    value={formData.deliveryConfig.minimumMerchantsBeforeExpand}
                    onChange={handleInputChange}
                    min="1"
                    max="10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    If fewer merchants found, expand search radius automatically
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fallback Strategy (When No Merchants Nearby)
                  </label>
                  <select
                    name="deliveryConfig.fallbackStrategy"
                    value={formData.deliveryConfig.fallbackStrategy}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="expand">Expand Radius (Recommended)</option>
                    <option value="city-wide">Show All City Merchants</option>
                    <option value="none">Show No Products</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    <strong>Expand:</strong> Gradually increase search radius<br/>
                    <strong>City-wide:</strong> Show all merchants in same city<br/>
                    <strong>None:</strong> Display "not available" message
                  </p>
                </div>

                <div className="mt-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="deliveryConfig.enablePincodeGrouping"
                      checked={formData.deliveryConfig.enablePincodeGrouping}
                      onChange={handleInputChange}
                      className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Enable nearby pincode grouping
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    Group adjacent pincodes as same delivery zone (e.g., 560034, 560035, 560095)
                  </p>
                </div>
              </div>

              {/* Display Configuration */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Display & Behavior Settings</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price Display Mode
                    </label>
                    <select
                      name="priceDisplayMode"
                      value={formData.priceDisplayMode}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="admin">Admin Set Prices</option>
                      <option value="merchant">Merchant Prices</option>
                      <option value="lowest">Lowest Available Price</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Controls which price customers see on products
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock Validation Mode
                    </label>
                    <select
                      name="stockValidationMode"
                      value={formData.stockValidationMode}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="admin">Total Available Stock</option>
                      <option value="merchant">Per Merchant Stock</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      How stock availability is calculated
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GST Display Mode (How Customers See Prices)
                  </label>
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-xs text-blue-800">
                      <strong>💡 How it works:</strong> Each product has its own GST rate. This setting controls how prices are displayed to customers.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center cursor-pointer p-3 border border-gray-300 rounded-md hover:bg-gray-50">
                      <input
                        type="radio"
                        name="gstDisplayMode"
                        value="inclusive"
                        checked={formData.gstDisplayMode === 'inclusive'}
                        onChange={handleInputChange}
                        className="form-radio h-4 w-4 text-blue-600"
                      />
                      <div className="ml-3">
                        <span className="text-sm font-medium text-gray-900">
                          Inclusive (Show price with GST included)
                        </span>
                        <p className="text-xs text-gray-500">
                          Example: Product ₹1000 + 18% GST → Shows ₹1180
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center cursor-pointer p-3 border border-gray-300 rounded-md hover:bg-gray-50">
                      <input
                        type="radio"
                        name="gstDisplayMode"
                        value="exclusive"
                        checked={formData.gstDisplayMode === 'exclusive'}
                        onChange={handleInputChange}
                        className="form-radio h-4 w-4 text-blue-600"
                      />
                      <div className="ml-3">
                        <span className="text-sm font-medium text-gray-900">
                          Exclusive (Show price without GST, add at checkout)
                        </span>
                        <p className="text-xs text-gray-500">
                          Example: Product ₹1000 + 18% GST → Shows ₹1000 (GST added at checkout)
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center cursor-pointer p-3 border border-gray-300 rounded-md hover:bg-gray-50">
                      <input
                        type="radio"
                        name="gstDisplayMode"
                        value="no-display"
                        checked={formData.gstDisplayMode === 'no-display'}
                        onChange={handleInputChange}
                        className="form-radio h-4 w-4 text-blue-600"
                      />
                      <div className="ml-3">
                        <span className="text-sm font-medium text-gray-900">
                          No GST Display (Price is final, GST extracted on invoice)
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          Example: Product price ₹100 (18% GST item) → Customer pays ₹100
                        </p>
                        <p className="text-xs text-gray-500">
                          Invoice shows: Base ₹84.75 + GST ₹15.25 = Total ₹100
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          💡 Use this when you add products with GST-inclusive prices
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <p className="text-xs text-gray-700">
                      <strong>Current Selection:</strong>
                      {formData.gstDisplayMode === 'inclusive' && ' Prices shown will include GST (customers see final price)'}
                      {formData.gstDisplayMode === 'exclusive' && ' GST will be added at checkout (prices appear lower during browsing)'}
                      {formData.gstDisplayMode === 'no-display' && ' Prices are final (no GST added at checkout). GST extracted on invoice if requested.'}
                    </p>
                  </div>

                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-xs text-yellow-800">
                      <strong>Legal Note:</strong> Invoices will always show GST breakdown separately for compliance, regardless of this setting.
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="autoReduceStockOnDelivery"
                      checked={formData.autoReduceStockOnDelivery}
                      onChange={handleInputChange}
                      className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Automatically reduce merchant stock when order is delivered
                    </span>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={updateSettingsMutation.isLoading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {updateSettingsMutation.isLoading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Preview</h3>
              
              {deliveryPreview && (
                <div className="space-y-3">
                  <div className="text-sm text-gray-600 mb-3">
                    <strong>Current Config:</strong><br/>
                    Type: {deliveryPreview.deliveryConfig.type}<br/>
                    Tax Rate: {(deliveryPreview.taxRate * 100).toFixed(1)}%
                  </div>
                  
                  {deliveryPreview.preview.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-sm">
                      <div>
                        <div className="font-medium">₹{item.orderValue}</div>
                        <div className="text-xs text-gray-500">Order Value</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">₹{item.total}</div>
                        <div className="text-xs text-gray-500">
                          (₹{item.deliveryCharges} delivery + ₹{Math.round(item.tax)} tax)
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;