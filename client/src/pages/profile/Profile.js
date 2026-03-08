import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { addressAPI } from '../../services/api';
import toast from 'react-hot-toast';
import AddressFormModal from '../../components/modals/AddressFormModal';
import {
  MapPinIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  HomeIcon,
  BuildingOfficeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const Profile = () => {
  const { user, updateProfile, sendLinkPhoneOTP, linkPhone, sendChangeEmailOTP, verifyChangeEmail } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  // OTP verification state
  const [otpStep, setOtpStep] = useState(null); // null | 'phone' | 'email'
  const [otpValue, setOtpValue] = useState('');
  const [pendingPhone, setPendingPhone] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // Fetch addresses
  const { data: addressesData, isLoading: addressesLoading, refetch } = useQuery({
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const phoneChanged = formData.phone && formData.phone !== user?.phone;
    const emailChanged = formData.email && formData.email !== user?.email;

    // Save name immediately if it changed (name never needs OTP)
    if (formData.name !== user?.name) {
      await updateProfile({ name: formData.name });
    }

    // If phone changed — trigger phone OTP flow
    if (phoneChanged) {
      setIsSendingOtp(true);
      const result = await sendLinkPhoneOTP(formData.phone);
      setIsSendingOtp(false);
      if (result.success) {
        setPendingPhone(formData.phone);
        setOtpStep('phone');
        setOtpValue('');
      }
      return;
    }

    // If email changed — trigger email OTP flow
    if (emailChanged) {
      setIsSendingOtp(true);
      const result = await sendChangeEmailOTP(formData.email);
      setIsSendingOtp(false);
      if (result.success) {
        setPendingEmail(formData.email);
        setOtpStep('email');
        setOtpValue('');
      }
      return;
    }

    // Nothing sensitive changed
    setIsEditing(false);
  };

  const handleVerifyOtp = async () => {
    if (otpStep === 'phone') {
      const result = await linkPhone(pendingPhone, otpValue);
      if (result.success) {
        setOtpStep(null);
        setIsEditing(false);
        // Check if email also changed
        if (formData.email !== user?.email) {
          setIsSendingOtp(true);
          const emailResult = await sendChangeEmailOTP(formData.email);
          setIsSendingOtp(false);
          if (emailResult.success) {
            setPendingEmail(formData.email);
            setOtpStep('email');
            setOtpValue('');
          }
        }
      }
    } else if (otpStep === 'email') {
      const result = await verifyChangeEmail(pendingEmail, otpValue);
      if (result.success) {
        setOtpStep(null);
        setIsEditing(false);
      }
    }
  };

  const handleResendOtp = async () => {
    setIsSendingOtp(true);
    if (otpStep === 'phone') {
      await sendLinkPhoneOTP(pendingPhone);
    } else if (otpStep === 'email') {
      await sendChangeEmailOTP(pendingEmail);
    }
    setIsSendingOtp(false);
    setOtpValue('');
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAddNew = () => {
    setEditingAddress(null);
    setShowAddModal(true);
  };

  const handleEdit = (address) => {
    setEditingAddress(address);
    setShowEditModal(true);
  };

  const handleDelete = (address) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      deleteAddressMutation.mutate(address._id);
    }
  };

  const closeAddressModal = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setEditingAddress(null);
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : '?';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Accent strip */}
          <div className="h-1.5 bg-primary-700" />

          <div className="p-5">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-full bg-primary-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-white text-lg font-bold tracking-wide">{initials}</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-gray-900 truncate">{user?.name || '—'}</p>
                {user?.email && <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>}
                {user?.phone && <p className="text-xs text-gray-500 mt-0.5">{user.phone}</p>}
              </div>

              {/* Edit toggle — small pill button */}
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex-shrink-0 ${
                  isEditing
                    ? 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100'
                    : 'border-gray-200 text-gray-600 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                {isEditing
                  ? <><XMarkIcon className="w-3.5 h-3.5" /> Cancel</>
                  : <><PencilIcon className="w-3.5 h-3.5" /> Edit</>
                }
              </button>
            </div>

            {/* OTP verification step */}
            {otpStep && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-primary-900 mb-1">
                    {otpStep === 'phone' ? 'Verify new phone number' : 'Verify new email address'}
                  </p>
                  <p className="text-xs text-primary-700 mb-4">
                    We sent a 6-digit code to{' '}
                    <span className="font-semibold">
                      {otpStep === 'phone' ? pendingPhone : pendingEmail}
                    </span>. Enter it below to confirm.
                  </p>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit code"
                    className="w-full px-3 py-2 text-sm text-center tracking-widest font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none mb-3"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setOtpStep(null); setOtpValue(''); }}
                      className="flex-1 py-2 text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isSendingOtp}
                      className="px-3 py-2 text-xs font-semibold text-primary-700 border border-primary-300 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50"
                    >
                      Resend
                    </button>
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={otpValue.length < 4}
                      className="flex-1 py-2 text-xs font-semibold text-white bg-primary-700 hover:bg-primary-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Inline edit form */}
            {isEditing && !otpStep && (
              <form onSubmit={handleSubmit} className="mt-5 pt-5 border-t border-gray-100 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Email
                      {formData.email !== user?.email && (
                        <span className="ml-1 text-amber-600">(will be verified)</span>
                      )}
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Phone
                      {formData.phone !== user?.phone && (
                        <span className="ml-1 text-amber-600">(will be verified)</span>
                      )}
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      maxLength={10}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingOtp}
                    className="px-4 py-2 text-xs font-semibold text-white bg-primary-700 hover:bg-primary-800 rounded-lg transition-colors disabled:opacity-60"
                  >
                    {isSendingOtp ? 'Sending code...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Addresses Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Saved Addresses</h2>
              <p className="text-xs text-gray-400 mt-0.5">Manage your delivery locations</p>
            </div>
            <button
              onClick={handleAddNew}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-700 hover:bg-primary-800 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              Add New
            </button>
          </div>

          {addressesLoading ? (
            <div className="flex justify-center items-center h-20">
              <span className="text-2xl animate-bounce">🏗️</span>
            </div>
          ) : addressesData?.addresses?.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {addressesData.addresses.map((address) => {
                const AddressIcon = getAddressIcon(address.addressType);
                return (
                  <div key={address._id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <AddressIcon className="w-4 h-4 text-primary-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className="text-sm font-semibold text-gray-900 truncate">{address.title}</span>
                            <span className="text-xs text-gray-400 capitalize">{address.addressType}</span>
                            {address.isDefault && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">Default</span>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            <button
                              onClick={() => handleEdit(address)}
                              className="p-1.5 text-gray-400 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                            >
                              <PencilIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(address)}
                              disabled={deleteAddressMutation.isLoading}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{address.fullName} · {address.phoneNumber}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                          {address.addressLine1}{address.addressLine2 && `, ${address.addressLine2}`}
                          {address.landmark && ` · Near ${address.landmark}`}
                        </p>
                        <p className="text-xs text-gray-500">{address.area}, {address.city} - {address.pincode}</p>
                        {!address.isDefault && (
                          <button
                            onClick={() => setDefaultMutation.mutate(address._id)}
                            disabled={setDefaultMutation.isLoading}
                            className="mt-2 text-xs text-primary-700 hover:text-primary-800 font-semibold transition-colors disabled:opacity-40"
                          >
                            Set as default
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 px-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <MapPinIcon className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-1">No addresses saved</p>
              <p className="text-xs text-gray-400 mb-4">Add a delivery address to get started</p>
              <button
                onClick={handleAddNew}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-700 hover:bg-primary-800 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Add Address
              </button>
            </div>
          )}
        </div>

      </div>

      <AddressFormModal
        isOpen={showAddModal || showEditModal}
        onClose={closeAddressModal}
        onSuccess={refetch}
        editingAddress={editingAddress}
      />
    </div>
  );
};

export default Profile;
