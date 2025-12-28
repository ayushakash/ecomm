import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { addressAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  MapPinIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  HomeIcon,
  BuildingOfficeIcon,
  StarIcon,
  XMarkIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    area: user?.area || ''
  });
  const [addressForm, setAddressForm] = useState({
    title: '',
    fullName: '',
    phoneNumber: '',
    addressLine1: '',
    addressLine2: '',
    landmark: '',
    area: '',
    city: '',
    state: '',
    pincode: '',
    addressType: 'home'
  });
  const [addressErrors, setAddressErrors] = useState({});

  // Fetch addresses
  const { data: addressesData, isLoading: addressesLoading, refetch } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressAPI.getAllAddresses(),
  });

  // Create address mutation
  const createAddressMutation = useMutation({
    mutationFn: (addressData) => addressAPI.createAddress(addressData),
    onSuccess: () => {
      toast.success('Address added successfully!');
      setShowAddModal(false);
      resetAddressForm();
      refetch();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to add address');
    }
  });

  // Update address mutation
  const updateAddressMutation = useMutation({
    mutationFn: ({ id, data }) => addressAPI.updateAddress(id, data),
    onSuccess: () => {
      toast.success('Address updated successfully!');
      setShowEditModal(false);
      setEditingAddress(null);
      resetAddressForm();
      refetch();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update address');
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

  const resetAddressForm = () => {
    setAddressForm({
      title: '',
      fullName: '',
      phoneNumber: '',
      addressLine1: '',
      addressLine2: '',
      landmark: '',
      area: '',
      city: '',
      state: '',
      pincode: '',
      addressType: 'home'
    });
    setAddressErrors({});
  };

  // Validation function - matches backend validation in Address model
  const validateAddressForm = () => {
    const errors = {};

    // Title validation - Backend: required, max 50 chars
    if (!addressForm.title.trim()) {
      errors.title = 'Address title is required';
    } else if (addressForm.title.trim().length > 50) {
      errors.title = 'Address title cannot exceed 50 characters';
    }

    // Full Name validation - Backend: required, max 100 chars
    if (!addressForm.fullName.trim()) {
      errors.fullName = 'Full name is required';
    } else if (addressForm.fullName.trim().length > 100) {
      errors.fullName = 'Full name cannot exceed 100 characters';
    }

    // Phone Number validation - Backend: required, must be Indian format [6-9]\d{9}
    if (!addressForm.phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required';
    } else {
      const cleanPhone = addressForm.phoneNumber.replace(/\s/g, '');
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        errors.phoneNumber = 'Please enter a valid Indian phone number (10 digits starting with 6-9)';
      }
    }

    // Address Line 1 validation - Backend: required, max 200 chars
    if (!addressForm.addressLine1.trim()) {
      errors.addressLine1 = 'Address line 1 is required';
    } else if (addressForm.addressLine1.trim().length > 200) {
      errors.addressLine1 = 'Address line 1 cannot exceed 200 characters';
    }

    // Address Line 2 validation - Backend: optional, max 200 chars
    if (addressForm.addressLine2 && addressForm.addressLine2.trim().length > 200) {
      errors.addressLine2 = 'Address line 2 cannot exceed 200 characters';
    }

    // Landmark validation - Backend: optional, max 100 chars
    if (addressForm.landmark && addressForm.landmark.trim().length > 100) {
      errors.landmark = 'Landmark cannot exceed 100 characters';
    }

    // Area validation - Backend: required, max 100 chars
    if (!addressForm.area.trim()) {
      errors.area = 'Area is required';
    } else if (addressForm.area.trim().length > 100) {
      errors.area = 'Area cannot exceed 100 characters';
    }

    // City validation - Backend: required, max 50 chars
    if (!addressForm.city.trim()) {
      errors.city = 'City is required';
    } else if (addressForm.city.trim().length > 50) {
      errors.city = 'City cannot exceed 50 characters';
    }

    // State validation - Backend: required, max 50 chars
    if (!addressForm.state.trim()) {
      errors.state = 'State is required';
    } else if (addressForm.state.trim().length > 50) {
      errors.state = 'State cannot exceed 50 characters';
    }

    // Pincode validation - Backend: required, must be 6 digits
    if (!addressForm.pincode.trim()) {
      errors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(addressForm.pincode.replace(/\s/g, ''))) {
      errors.pincode = 'Please enter a valid 6-digit pincode';
    }

    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateProfile(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAddNew = () => {
    resetAddressForm();
    setShowAddModal(true);
  };

  const handleEdit = (address) => {
    setEditingAddress(address);
    setAddressForm({
      title: address.title || '',
      fullName: address.fullName || '',
      phoneNumber: address.phoneNumber || '',
      addressLine1: address.addressLine1 || '',
      addressLine2: address.addressLine2 || '',
      landmark: address.landmark || '',
      area: address.area || '',
      city: address.city || '',
      state: address.state || '',
      pincode: address.pincode || '',
      addressType: address.addressType || 'home'
    });
    setShowEditModal(true);
  };

  const handleDelete = (address) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      deleteAddressMutation.mutate(address._id);
    }
  };

  const handleAddressSubmit = (e) => {
    e.preventDefault();
    if (!validateAddressForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    if (editingAddress) {
      updateAddressMutation.mutate({
        id: editingAddress._id,
        data: addressForm
      });
    } else {
      createAddressMutation.mutate(addressForm);
    }
  };

  const handleAddressInputChange = (e) => {
    setAddressForm({
      ...addressForm,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with solid color */}
        <div className="bg-primary-700 rounded-xl shadow-lg p-6 sm:p-8 mb-6 text-white">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1">My Profile</h1>
              <p className="text-gray-100 text-sm">Manage your personal information</p>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="bg-white text-secondary-600 px-5 py-2.5 rounded-xl hover:bg-secondary-50 font-semibold shadow-md transition-all duration-200 transform hover:scale-105 self-start sm:self-auto"
            >
              {isEditing ? '✕ Cancel' : '✏️ Edit Profile'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                👤 Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-600 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📧 Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-600 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📱 Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-600 transition-all duration-200"
              />
            </div>
          </div>

          {isEditing && (
            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:space-x-4 pt-4">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-primary-700 hover:bg-primary-800 text-white rounded-xl font-semibold shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                💾 Save Changes
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Mobile Addresses Section */}
      <div className="mt-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-primary-700">📍 My Addresses</h2>
              <p className="text-sm text-gray-500 mt-1">Manage your delivery locations</p>
            </div>
            <button
              onClick={handleAddNew}
              className="inline-flex items-center px-5 py-3 bg-primary-700 hover:bg-primary-800 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 self-start sm:self-auto"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add New Address
            </button>
          </div>

          {addressesLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600"></div>
            </div>
          ) : addressesData?.addresses?.length > 0 ? (
            <div className="space-y-4">
              {addressesData.addresses.map((address) => {
                const AddressIcon = getAddressIcon(address.addressType);
                return (
                  <div key={address._id} className="border-2 border-gray-200 rounded-xl p-5 hover:border-secondary-400 hover:shadow-lg transition-all duration-200 bg-white">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary-100 rounded-xl shadow-sm">
                        <AddressIcon className="w-6 h-6 text-primary-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-gray-900 truncate text-lg">
                            {address.title}
                          </h3>
                          {address.isDefault && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-success-600 text-white flex-shrink-0 shadow-sm">
                              <StarIcon className="w-3 h-3 mr-0.5" />
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 capitalize mb-3 font-medium">{address.addressType}</p>
                        <p className="text-sm text-gray-700 font-semibold mb-1">{address.fullName}</p>
                        <p className="text-sm text-gray-600 mb-2">📞 {address.phoneNumber}</p>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {address.addressLine1}
                          {address.addressLine2 && `, ${address.addressLine2}`}
                        </p>
                        {address.landmark && (
                          <p className="text-xs text-gray-500 mt-1">📍 Near: {address.landmark}</p>
                        )}
                        <p className="text-sm text-gray-700 font-medium mt-2">
                          {address.area}, {address.city}, {address.state} - {address.pincode}
                        </p>
                      </div>
                    </div>

                    {/* Address Actions */}
                    <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
                      {!address.isDefault && (
                        <button
                          onClick={() => setDefaultMutation.mutate(address._id)}
                          disabled={setDefaultMutation.isLoading}
                          className="flex-1 text-sm text-green-600 hover:text-white hover:bg-green-500 font-semibold py-2 rounded-lg transition-all duration-200 disabled:opacity-50"
                        >
                          ⭐ Set as Default
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(address)}
                        className="p-2.5 text-blue-600 hover:text-white hover:bg-blue-500 rounded-lg transition-all duration-200"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(address)}
                        disabled={deleteAddressMutation.isLoading}
                        className="p-2.5 text-red-600 hover:text-white hover:bg-red-500 rounded-lg transition-all duration-200 disabled:opacity-50"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPinIcon className="w-10 h-10 text-primary-700" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">No addresses found</h3>
              <p className="text-sm text-gray-600 mb-6">Add your first delivery address to get started</p>
              <button
                onClick={handleAddNew}
                className="inline-flex items-center px-6 py-3 bg-primary-700 hover:bg-primary-800 text-white rounded-xl text-sm font-semibold shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add Your First Address
              </button>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Add/Edit Address Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-t-xl md:rounded-xl shadow-lg max-w-2xl w-full mx-0 md:mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                  {editingAddress ? 'Edit Address' : 'Add New Address'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setEditingAddress(null);
                    resetAddressForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddressSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Address Title
                      </label>
                      <span className="text-xs text-gray-500">{addressForm.title.length}/50</span>
                    </div>
                    <input
                      type="text"
                      name="title"
                      value={addressForm.title}
                      onChange={handleAddressInputChange}
                      placeholder="e.g., Home, Office"
                      maxLength="50"
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        addressErrors.title ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {addressErrors.title && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <span>⚠️</span> {addressErrors.title}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address Type
                    </label>
                    <select
                      name="addressType"
                      value={addressForm.addressType}
                      onChange={handleAddressInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="home">🏠 Home</option>
                      <option value="office">🏢 Office</option>
                      <option value="other">📍 Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Full Name
                      </label>
                      <span className="text-xs text-gray-500">{addressForm.fullName.length}/100</span>
                    </div>
                    <input
                      type="text"
                      name="fullName"
                      value={addressForm.fullName}
                      onChange={handleAddressInputChange}
                      maxLength="100"
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        addressErrors.fullName ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {addressErrors.fullName && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <span>⚠️</span> {addressErrors.fullName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={addressForm.phoneNumber}
                      onChange={handleAddressInputChange}
                      placeholder="10-digit (6-9 start)"
                      maxLength="10"
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        addressErrors.phoneNumber ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {addressErrors.phoneNumber && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <span>⚠️</span> {addressErrors.phoneNumber}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    name="addressLine1"
                    value={addressForm.addressLine1}
                    onChange={handleAddressInputChange}
                    placeholder="House/Flat number, Street name"
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      addressErrors.addressLine1 ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {addressErrors.addressLine1 && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <span>⚠️</span> {addressErrors.addressLine1}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Address Line 2 (Optional)
                    </label>
                    <span className="text-xs text-gray-500">{addressForm.addressLine2.length}/200</span>
                  </div>
                  <input
                    type="text"
                    name="addressLine2"
                    value={addressForm.addressLine2}
                    onChange={handleAddressInputChange}
                    placeholder="Apartment, suite, etc."
                    maxLength="200"
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      addressErrors.addressLine2 ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {addressErrors.addressLine2 && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <span>⚠️</span> {addressErrors.addressLine2}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Area/Locality
                    </label>
                    <input
                      type="text"
                      name="area"
                      value={addressForm.area}
                      onChange={handleAddressInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        addressErrors.area ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {addressErrors.area && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <span>⚠️</span> {addressErrors.area}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={addressForm.city}
                      onChange={handleAddressInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        addressErrors.city ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {addressErrors.city && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <span>⚠️</span> {addressErrors.city}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pincode
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      value={addressForm.pincode}
                      onChange={handleAddressInputChange}
                      placeholder="000000"
                      maxLength="6"
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        addressErrors.pincode ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {addressErrors.pincode && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <span>⚠️</span> {addressErrors.pincode}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={addressForm.state}
                      onChange={handleAddressInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        addressErrors.state ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {addressErrors.state && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <span>⚠️</span> {addressErrors.state}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Landmark (Optional)
                      </label>
                      <span className="text-xs text-gray-500">{addressForm.landmark.length}/100</span>
                    </div>
                    <input
                      type="text"
                      name="landmark"
                      value={addressForm.landmark}
                      onChange={handleAddressInputChange}
                      placeholder="Near a landmark"
                      maxLength="100"
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        addressErrors.landmark ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {addressErrors.landmark && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <span>⚠️</span> {addressErrors.landmark}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                      setEditingAddress(null);
                      resetAddressForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createAddressMutation.isLoading || updateAddressMutation.isLoading || Object.keys(addressErrors).length > 0}
                    className={`px-6 py-2 rounded-lg font-medium transition-all ${
                      Object.keys(addressErrors).length > 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    } ${(createAddressMutation.isLoading || updateAddressMutation.isLoading) ? 'opacity-50' : ''}`}
                  >
                    {(createAddressMutation.isLoading || updateAddressMutation.isLoading)
                      ? 'Saving...'
                      : editingAddress
                      ? 'Update Address'
                      : 'Save Address'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
