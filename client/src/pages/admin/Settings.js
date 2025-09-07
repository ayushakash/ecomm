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
      freeWeightLimit: 50
    },
    priceDisplayMode: 'admin',
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
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      name="taxRate"
                      value={(formData.taxRate * 100).toFixed(2)}
                      onChange={(e) => handleInputChange({
                        target: { name: 'taxRate', value: e.target.value / 100, type: 'number' }
                      })}
                      min="0"
                      max="100"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Current: {(formData.taxRate * 100).toFixed(2)}% GST</p>
                  </div>

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