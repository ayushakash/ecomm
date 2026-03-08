import React, { useState } from 'react';
import { PageSpinner } from '../../components/ui/Spinner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addressAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import AddressFormModal from '../../components/modals/AddressFormModal';
import {
  MapPinIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  HomeIcon,
  BuildingOfficeIcon,
  StarIcon
} from '@heroicons/react/24/outline';


const Addresses = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Fetch addresses
  const { data: addressesData, isLoading, refetch } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressAPI.getAllAddresses(),
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
    setEditingAddress(null);
    setShowModal(true);
  };

  const handleEdit = (address) => {
    setEditingAddress(address);
    setShowModal(true);
  };

  const handleDelete = (address) => {
    setConfirmDeleteId(address._id);
  };

  const confirmDelete = (id) => {
    deleteAddressMutation.mutate(id);
    setConfirmDeleteId(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <PageSpinner />
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
                          {address.coordinates?.latitude && address.coordinates?.longitude && (
                            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-2 py-1 inline-block mt-1">
                              📍 GPS: {address.coordinates.latitude.toFixed(4)}, {address.coordinates.longitude.toFixed(4)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto">
                      {confirmDeleteId === address._id ? (
                        <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                          <p className="text-sm font-semibold text-danger-700">Delete this address?</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all duration-200"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => confirmDelete(address._id)}
                              disabled={deleteAddressMutation.isLoading}
                              className="px-4 py-2 text-sm bg-danger-600 hover:bg-danger-700 text-white rounded-xl font-semibold disabled:opacity-50 shadow-md transition-all duration-200"
                            >
                              {deleteAddressMutation.isLoading ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
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
                              className="p-3 text-white bg-danger-600 hover:bg-danger-700 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                              title="Delete Address"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </>
                      )}
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

        <AddressFormModal
          isOpen={showModal}
          onClose={() => { setShowModal(false); setEditingAddress(null); }}
          onSuccess={() => refetch()}
          editingAddress={editingAddress}
        />
      </div>
    </div>
  );
};

export default Addresses;