import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addressAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { reverseGeocode } from '../../services/geocodingService';
import toast from 'react-hot-toast';
import {
  MapPinIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  HomeIcon,
  BuildingOfficeIcon,
  StarIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

// Indian States
const INDIAN_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal'
];

const Addresses = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [capturingCoordinates, setCapturingCoordinates] = useState(false);
  const [addressForm, setAddressForm] = useState({
    phoneNumber: '',
    addressLine1: '',
    addressLine2: '',
    landmark: '',
    area: '',
    city: '',
    state: '',
    pincode: '',
    addressType: 'home',
    coordinates: {
      latitude: null,
      longitude: null
    }
  });

  // Fetch addresses
  const { data: addressesData, isLoading, refetch } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressAPI.getAllAddresses(),
  });

  // Create address mutation
  const createAddressMutation = useMutation({
    mutationFn: (addressData) => addressAPI.createAddress(addressData),
    onSuccess: () => {
      toast.success('Address added successfully!');
      setShowAddModal(false);
      resetForm();
      refetch();
    },
    onError: (err) => {
      // Handle validation errors from backend
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        // Check if it's an array (old format) or object (new format)
        if (Array.isArray(errors)) {
          const errorMessages = errors.map(e => e.msg).join('\n');
          toast.error(errorMessages, { duration: 5000 });
        } else {
          // Object format - display just the error messages without field names
          const errorMessages = Object.values(errors).join('\n');
          toast.error(errorMessages, { duration: 5000 });
        }
      } else {
        toast.error(err.response?.data?.message || 'Failed to add address');
      }
    }
  });

  // Update address mutation
  const updateAddressMutation = useMutation({
    mutationFn: ({ id, data }) => addressAPI.updateAddress(id, data),
    onSuccess: () => {
      toast.success('Address updated successfully!');
      setShowEditModal(false);
      setEditingAddress(null);
      resetForm();
      refetch();
    },
    onError: (err) => {
      // Handle validation errors from backend
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        // Check if it's an array (old format) or object (new format)
        if (Array.isArray(errors)) {
          const errorMessages = errors.map(e => e.msg).join('\n');
          toast.error(errorMessages, { duration: 5000 });
        } else {
          // Object format - display just the error messages without field names
          const errorMessages = Object.values(errors).join('\n');
          toast.error(errorMessages, { duration: 5000 });
        }
      } else {
        toast.error(err.response?.data?.message || 'Failed to update address');
      }
    }
  });

  // Delete address mutation
  const deleteAddressMutation = useMutation({
    mutationFn: (id) => addressAPI.deleteAddress(id),
    onSuccess: () => {
      toast.success('Address deleted successfully!');
      refetch();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete address');
    }
  });

  // Set default address mutation
  const setDefaultMutation = useMutation({
    mutationFn: (addressId) => addressAPI.setDefaultAddress(addressId),
    onSuccess: () => {
      toast.success('Default address updated!');
      refetch();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to set default address');
    }
  });

  const resetForm = () => {
    setAddressForm({
      phoneNumber: '',
      addressLine1: '',
      addressLine2: '',
      landmark: '',
      area: '',
      city: '',
      state: '',
      pincode: '',
      addressType: 'home',
      coordinates: {
        latitude: null,
        longitude: null
      }
    });
  };

  const getAddressIcon = (type) => {
    switch (type) {
      case 'home':
        return HomeIcon;
      case 'office':
        return BuildingOfficeIcon;
      default:
        return MapPinIcon;
    }
  };

  const handleAddNew = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleEdit = (address) => {
    setEditingAddress(address);
    setAddressForm({
      phoneNumber: address.phoneNumber || '',
      addressLine1: address.addressLine1 || '',
      addressLine2: address.addressLine2 || '',
      landmark: address.landmark || '',
      area: address.area || '',
      city: address.city || '',
      state: address.state || '',
      pincode: address.pincode || '',
      addressType: address.addressType || 'home',
      coordinates: {
        latitude: address.coordinates?.latitude || null,
        longitude: address.coordinates?.longitude || null
      }
    });
    setShowEditModal(true);
  };

  // Capture coordinates function
  const captureCoordinates = async () => {
    setCapturingCoordinates(true);

    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      setCapturingCoordinates(false);
      return;
    }

    // Check if page is served over HTTPS (required for geolocation on mobile)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      toast.error('Location access requires HTTPS. Please access the site using https://', { duration: 5000 });
      setCapturingCoordinates(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // Call reverse geocoding to get address details
          toast.loading('Getting address details...', { id: 'geocoding' });
          const addressData = await reverseGeocode(latitude, longitude);

          if (addressData.success) {
            // Auto-fill address fields from geocoding
            setAddressForm(prev => ({
              ...prev,
              coordinates: {
                latitude,
                longitude
              },
              area: addressData.area || prev.area,
              city: addressData.city || prev.city,
              state: addressData.state || prev.state,
              pincode: addressData.pincode || prev.pincode
            }));

            toast.success('Location captured and address filled!', { id: 'geocoding' });
          } else {
            // Just set coordinates if geocoding fails
            setAddressForm(prev => ({
              ...prev,
              coordinates: {
                latitude,
                longitude
              }
            }));
            toast.success('Location captured!', { id: 'geocoding' });
          }
        } catch (error) {
          console.error('Geocoding error:', error);
          // Just set coordinates if geocoding fails
          setAddressForm(prev => ({
            ...prev,
            coordinates: {
              latitude,
              longitude
            }
          }));
          toast.success('Location captured!', { id: 'geocoding' });
        }

        setCapturingCoordinates(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        let errorMessage = 'Unable to get your location';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }

        toast.error(errorMessage);
        setCapturingCoordinates(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  };

  const handleDelete = (address) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      deleteAddressMutation.mutate(address._id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Coordinates are optional - backend will auto-geocode if not provided
    // Show info message if coordinates not captured
    if (!addressForm.coordinates.latitude || !addressForm.coordinates.longitude) {
      toast.info('📍 Address will be saved with approximate location based on city', { duration: 3000 });
    }

    // Add user's name and generate title from address type
    const addressTypeLabel = addressForm.addressType.charAt(0).toUpperCase() + addressForm.addressType.slice(1);
    const addressData = {
      ...addressForm,
      fullName: user?.name || '',
      title: `${addressTypeLabel} - ${addressForm.area}`
    };

    if (editingAddress) {
      updateAddressMutation.mutate({
        id: editingAddress._id,
        data: addressData
      });
    } else {
      createAddressMutation.mutate(addressData);
    }
  };

  const handleInputChange = (e) => {
    setAddressForm({
      ...addressForm,
      [e.target.name]: e.target.value
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Modern Header with Solid Color */}
        <div className="bg-primary-700 rounded-xl shadow-lg p-8 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="text-white">
              <h1 className="text-3xl sm:text-4xl font-bold mb-2 flex items-center">
                <MapPinIcon className="w-8 h-8 sm:w-10 sm:h-10 mr-3" />
                My Addresses
              </h1>
              <p className="text-gray-100 text-sm sm:text-base">Manage your saved delivery addresses</p>
            </div>
            <button
              onClick={handleAddNew}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-white text-secondary-600 rounded-xl hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-all duration-200 font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add New Address
            </button>
          </div>
        </div>

        {/* Addresses List */}
        <div className="space-y-6">
          {addressesData?.addresses?.length > 0 ? (
            addressesData.addresses.map((address) => {
              const AddressIcon = getAddressIcon(address.addressType);
              return (
                <div
                  key={address._id}
                  className="bg-white rounded-xl shadow-lg border-2 border-gray-100 hover:border-secondary-400 p-6 sm:p-8 transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1"
                >
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex items-start w-full sm:w-auto">
                      <div className="p-4 bg-primary-100 rounded-xl mr-4 flex-shrink-0 shadow-sm">
                        <AddressIcon className="w-7 h-7 text-primary-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                            {address.title}
                          </h3>
                          {address.isDefault && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-success-600 text-white shadow-sm">
                              <StarIcon className="w-3 h-3 mr-1 fill-white" />
                              Default
                            </span>
                          )}
                          <span className="px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-700 rounded-full capitalize">
                            {address.addressType}
                          </span>
                        </div>

                        <div className="space-y-2 text-gray-600 text-sm sm:text-base">
                          <p className="font-semibold text-gray-900 flex items-center">
                            <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {address.fullName}
                          </p>
                          <p className="flex items-center">
                            <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {address.phoneNumber}
                          </p>
                          <p className="flex items-start">
                            <MapPinIcon className="w-4 h-4 mr-2 text-purple-600 flex-shrink-0 mt-0.5" />
                            <span className="break-words">
                              {address.addressLine1}
                              {address.addressLine2 && `, ${address.addressLine2}`}
                            </span>
                          </p>
                          {address.landmark && (
                            <p className="text-sm flex items-center text-orange-600 bg-orange-50 px-3 py-1 rounded-lg inline-block">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              Near: {address.landmark}
                            </p>
                          )}
                          <p className="font-medium text-gray-700">
                            {address.area}, {address.city}, {address.state} - {address.pincode}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto">
                      {!address.isDefault && (
                        <button
                          onClick={() => setDefaultMutation.mutate(address._id)}
                          disabled={setDefaultMutation.isLoading}
                          className="flex-1 sm:flex-none text-sm px-4 py-2 bg-success-600 hover:bg-success-700 text-white rounded-xl font-semibold disabled:opacity-50 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                        >
                          ⭐ Set Default
                        </button>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(address)}
                          className="p-3 text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                          title="Edit Address"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(address)}
                          disabled={deleteAddressMutation.isLoading}
                          className="p-3 text-white bg-danger-600 hover:bg-danger-700 rounded-xl transition-all duration-200 disabled:opacity-50 shadow-md hover:shadow-lg transform hover:scale-105"
                          title="Delete Address"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <div className="bg-primary-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 shadow-sm">
                <MapPinIcon className="w-12 h-12 text-primary-700" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No Addresses Yet</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">Add your first delivery address to start shopping and get products delivered to your doorstep</p>
              <button
                onClick={handleAddNew}
                className="inline-flex items-center px-8 py-4 bg-primary-700 hover:bg-primary-800 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add Your First Address
              </button>
            </div>
          )}
        </div>

        {/* Add/Edit Address Modal */}
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 sm:p-8">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center">
                    <div className="p-3 bg-gradient-to-br from-orange-50 to-stone-50 rounded-xl mr-3 shadow-md">
                      <MapPinIcon className="w-6 h-6 text-orange-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {editingAddress ? 'Edit Address' : 'Add New Address'}
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                      setEditingAddress(null);
                      resetForm();
                    }}
                    className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Address Type Selection */}
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-2">
                      Address Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="addressType"
                      value={addressForm.addressType}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:border-gray-300"
                    >
                      <option value="home">🏠 Home</option>
                      <option value="office">🏢 Office</option>
                      <option value="other">📍 Other</option>
                    </select>
                  </div>

                  {/* GPS Coordinates Capture - OPTIONAL but RECOMMENDED */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-4 sm:p-6 shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-blue-900 mb-2 text-sm flex items-center flex-wrap">
                          📍 Location Coordinates
                          {!addressForm.coordinates.latitude && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Optional</span>
                          )}
                        </h4>
                        <p className="text-xs sm:text-sm text-blue-800 mb-3 font-medium">
                          💡 Recommended for accurate delivery estimates and finding nearby merchants
                        </p>
                        {addressForm.coordinates.latitude && addressForm.coordinates.longitude ? (
                          <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 inline-block font-medium break-all">
                            ✓ Exact location captured: {addressForm.coordinates.latitude.toFixed(4)}, {addressForm.coordinates.longitude.toFixed(4)}
                            <div className="text-xs text-green-600 mt-1">Merchants will be sorted by distance</div>
                          </div>
                        ) : (
                          <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 inline-block font-medium">
                            ℹ️ Without GPS: We'll use city-based location (approximate distances)
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={captureCoordinates}
                        disabled={capturingCoordinates}
                        className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg sm:transform sm:hover:scale-105 flex-shrink-0 whitespace-nowrap"
                      >
                        {capturingCoordinates ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Getting...
                          </>
                        ) : (
                          <>
                            <MapPinIcon className="w-4 h-4 mr-2" />
                            {addressForm.coordinates.latitude ? 'Update Location' : 'Capture GPS (Optional)'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Info box explaining GPS vs No GPS */}
                  {!addressForm.coordinates.latitude && !addressForm.coordinates.longitude && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-semibold text-yellow-800">Adding address without GPS?</h3>
                          <div className="mt-2 text-xs text-yellow-700">
                            <p className="mb-1">✓ You can save this address - we'll auto-detect location from your city</p>
                            <p className="mb-1">✓ All merchants in your city will be available</p>
                            <p>⚠️ Distance estimates may be approximate</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Phone Number */}
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={addressForm.phoneNumber}
                      onChange={handleInputChange}
                      placeholder="10-digit mobile number"
                      required
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:border-gray-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-2">
                      Full Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="addressLine1"
                      value={addressForm.addressLine1}
                      onChange={handleInputChange}
                      placeholder="House/Flat number, Street name"
                      required
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:border-gray-300"
                    />
                  </div>


                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-2">
                        Area/Locality <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="area"
                        value={addressForm.area}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g. Koramangala"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:border-gray-300"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-2">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={addressForm.city}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g. Bangalore"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:border-gray-300"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-2">
                        Pincode <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="pincode"
                        value={addressForm.pincode}
                        onChange={handleInputChange}
                        required
                        placeholder="6-digit pincode"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:border-gray-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-2">
                        State <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="state"
                        value={addressForm.state}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:border-gray-300"
                      >
                        <option value="">Select State</option>
                        {INDIAN_STATES.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-2">
                        Landmark (Optional)
                      </label>
                      <input
                        type="text"
                        name="landmark"
                        value={addressForm.landmark}
                        onChange={handleInputChange}
                        placeholder="Near a landmark"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:border-gray-300"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        setShowEditModal(false);
                        setEditingAddress(null);
                        resetForm();
                      }}
                      className="w-full sm:w-auto px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition-all duration-200 hover:shadow-md"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createAddressMutation.isLoading || updateAddressMutation.isLoading}
                      className="w-full sm:w-auto px-8 py-3 bg-primary-700 hover:bg-primary-800 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none"
                    >
                      {(createAddressMutation.isLoading || updateAddressMutation.isLoading) ? (
                        <span className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Saving...
                        </span>
                      ) : (
                        editingAddress ? '✓ Update Address' : '✓ Save Address'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Addresses;