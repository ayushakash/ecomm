import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orderAPI, addressAPI } from '../../services/api';
import { reverseGeocode } from '../../services/geocodingService';
import toast from 'react-hot-toast';
import { useTranslation, Trans } from 'react-i18next';
import LocationConfirmation from '../../components/location/LocationConfirmation';
import AddressFormModal from '../../components/modals/AddressFormModal';
import analytics from '../../services/analytics';
import { isWithinDeliveryHours, getDeliveryWindowMessage, DELIVERY_WINDOW_LABEL } from '../../utils/deliveryHours';
import {
  MapPinIcon,
  PlusIcon,
  PencilIcon,
  HomeIcon,
  BuildingOfficeIcon,
  UserIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  ArrowPathIcon,
  PhoneIcon,
  DocumentTextIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';


const Checkout = () => {
  const { t } = useTranslation('checkout');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { cart, clearCart, cartCity } = useCart();
  const { user, setUser, sendLinkPhoneOTP, linkPhone } = useAuth();
  const { selectedAddress: contextSelectedAddress, merchantIds, setSelectedAddress: setContextAddress } = useLocation();
  
  const [formData, setFormData] = useState({
    customerName: user?.name || '',
    customerPhone: user?.phone || '',
    customerAddress: user?.address || '',
    customerArea: user?.area || '',
    deliveryInstructions: '',
    paymentMethod: 'cod'
  });

  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [showLocationStep, setShowLocationStep] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressSelection, setShowAddressSelection] = useState(false);
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [requireGSTBill, setRequireGSTBill] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  // Phone verification modal state (for Google-auth users without a phone)
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneModalStep, setPhoneModalStep] = useState(1); // 1: enter phone, 2: enter OTP
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneModalLoading, setPhoneModalLoading] = useState(false);
  const [phoneModalError, setPhoneModalError] = useState('');
  const [devOtp, setDevOtp] = useState('');

  // Prepare items for cart totals calculation (send product IDs + variant label)
  const cartItems = useMemo(() =>
    cart.map(item => ({
      productId: item._id,
      quantity: item.quantity,
      variantLabel: item.variantLabel || null
    })), [cart]
  );

  // Get dynamic pricing from backend using new endpoint
  const { data: pricingData, isLoading: pricingLoading } = useQuery({
    queryKey: ['checkout-pricing', cartItems, selectedAddress?._id],
    queryFn: () => orderAPI.calculateCartTotals(cartItems, formData.customerArea, selectedAddress?._id),
    enabled: cart.length > 0
  });

  // Fetch saved addresses
  const { data: addressesData, isLoading: addressesLoading, refetch: refetchAddresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressAPI.getAllAddresses(),
    enabled: !!user,
  });

  // Get default address
  const { data: defaultAddressData } = useQuery({
    queryKey: ['default-address'],
    queryFn: () => addressAPI.getDefaultAddress(),
    enabled: !!user,
  });

  // Auto-select default address when addresses are loaded
  useEffect(() => {
    if (addressesData?.addresses?.length > 0 && !selectedAddress) {
      // First try to find and select the default address
      const defaultAddress = addressesData.addresses.find(addr => addr.isDefault);
      if (defaultAddress) {
        setSelectedAddress(defaultAddress);
      } else {
        // If no default address, select the first one
        setSelectedAddress(addressesData.addresses[0]);
      }
    }
  }, [addressesData, selectedAddress]);

  // Track begin checkout when page loads with cart items
  useEffect(() => {
    if (cart && cart.length > 0) {
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      analytics.trackBeginCheckout(cart, subtotal);
    }
  }, []); // Only track once when component mounts

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Use dynamic pricing from backend (no fallback to avoid incorrect calculations)
  const finalPricing = pricingData || {
    subtotal: 0,
    subtotalBeforeGST: 0,
    tax: 0,
    deliveryCharges: 0,
    platformFee: 0,
    totalAmount: 0,
    gstBreakdown: {
      mode: 'no-gst',
      merchantGST: 0,
      platformGST: 0,
      totalGST: 0,
      isDummyGST: false
    }
  };

    const createOrderMutation = useMutation({
    mutationFn: (orderData) => orderAPI.createOrder(orderData),
    onSuccess: (res) => {

      const newOrder = res.data.order || res.data;

      // Track purchase in analytics
      analytics.trackPurchase({
        orderId: newOrder._id || newOrder.orderId,
        items: newOrder.items || cart,
        totalAmount: newOrder.totalAmount || finalPricing.totalAmount,
        tax: newOrder.tax || finalPricing.tax,
        shipping: newOrder.deliveryCharges || finalPricing.deliveryCharges
      });

      clearCart();

      // Optimistically update the cache with the new order
      queryClient.setQueryData(['orders'], (oldData) => {
        if (oldData && oldData.orders) {
          return {
            ...oldData,
            orders: [newOrder, ...oldData.orders]
          };
        }
        return {
          orders: [newOrder],
          totalPages: 1,
          currentPage: 1,
          total: 1
        };
      });

      // Also refetch to ensure latest data
      queryClient.refetchQueries({
        queryKey: ['orders'],
        type: 'active'
      });

      // Navigate to order success page with order data
      navigate('/order-success', {
        state: {
          orderData: newOrder
        }
      });
    },
    onError: (err) => {
      console.error("❌ Order creation failed:", err.response?.data || err.message);
      if (err.response?.status === 401) {
        toast.error(t('toast.loginToOrder'));
        navigate('/login');
      } else {
        alert(t('toast.orderFailed'));
      }
    }
  });


  const handleLocationConfirm = (location) => {
    console.log('Location confirmed:', location);
    setDeliveryLocation(location);
    setShowLocationStep(false);
  };

  const getCurrentLocation = () => {
    setGettingLocation(true);

    if (!navigator.geolocation) {
      toast.error(t('location:errors.notSupported'));
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        // Reverse geocode to get address
        reverseGeocode(latitude, longitude)
          .then((address) => {
            setDeliveryLocation({
              coordinates: [longitude, latitude], // [lng, lat] format for MongoDB
              address: address,
              isCurrentLocation: true
            });
            toast.success(t('toast.currentLocationDetected'));
          })
          .catch((error) => {
            console.error('Reverse geocoding failed:', error);
            setDeliveryLocation({
              coordinates: [longitude, latitude], // [lng, lat] format for MongoDB
              address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
              isCurrentLocation: true
            });
            toast.success(t('toast.locationDetected'));
          })
          .finally(() => {
            setGettingLocation(false);
          });
      },
      (error) => {
        console.error('Error getting location:', error);
        let errorMessage = t('location:errors.unableToGet');

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = t('location:errors.denied');
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = t('location:errors.unavailable');
            break;
          case error.TIMEOUT:
            errorMessage = t('location:errors.timeout');
            break;
        }

        toast.error(errorMessage);
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };


  // Helper functions for address handling
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

  const handleAddressSelect = (address) => {
    setSelectedAddress(address);
    // Also update the context to fetch nearby merchants
    setContextAddress(address);
  };

  const handleAddNewAddress = () => {
    setShowAddAddressForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if user is authenticated - if not, prompt for login
    if (!user) {
      const shouldLogin = window.confirm(
        t('loginOrRegisterConfirm')
      );
      if (shouldLogin) {
        navigate('/login');
      } else {
        navigate('/register');
      }
      return;
    }

    // Google-auth users must verify phone before placing orders
    if (!user.phone) {
      setShowPhoneModal(true);
      return;
    }

    if (!selectedAddress) {
      toast.error(t('toast.selectAddress'));
      return;
    }

    // CRITICAL: Check if cart city matches selected address city
    if (cartCity && selectedAddress.city) {
      if (cartCity.toLowerCase() !== selectedAddress.city.toLowerCase()) {
        toast.error(
          t('toast.cityMismatch', { cartCity, addressCity: selectedAddress.city }),
          { duration: 5000 }
        );
        return;
      }
    }

    // Validate that cart items are from available merchants
    const unavailableItems = cart.filter(item => {
      // Check if item's merchant is in the available merchantIds
      return item.merchantId && !merchantIds.includes(item.merchantId);
    });

    if (unavailableItems.length > 0) {
      toast.error(t('toast.undeliverable', { count: unavailableItems.length }));
      return;
    }

    console.log('Selected Address:', selectedAddress);
    console.log('Cart:', cart);
    console.log('Delivery Location:', deliveryLocation);

    const orderData = {
      customerName: selectedAddress.fullName,
      customerPhone: selectedAddress.phoneNumber,
      customerAddress: `${selectedAddress.addressLine1}${selectedAddress.addressLine2 ? ', ' + selectedAddress.addressLine2 : ''}`,
      customerArea: selectedAddress.area,
      paymentMethod: formData.paymentMethod,
      deliveryInstructions: formData.deliveryInstructions,
      deliveryLocation: deliveryLocation || null,
      addressId: selectedAddress._id,
      requireGSTBill: requireGSTBill,
      items: cart.map(item => ({
        productId: item._id,
        productName: item.name,
        unitPrice: item.price,
        quantity: item.quantity,
        unit: item.unit,
        sku: item.sku,
        variantLabel: item.variantLabel || null,
        totalPrice: item.price * item.quantity
      })),
      subtotal: finalPricing.subtotal,
      tax: finalPricing.tax,
      deliveryCharge: finalPricing.deliveryCharges,
      totalAmount: finalPricing.totalAmount
    };

    // Orders are accepted 24x7, but delivery only happens 8 AM - 7 PM.
    // If ordering outside the window, let the customer know when it'll arrive.
    if (!isWithinDeliveryHours()) {
      toast(getDeliveryWindowMessage(), { icon: '🕗', duration: 7000 });
    }

    createOrderMutation.mutate(orderData);
  };

  const handlePhoneSendOTP = async () => {
    if (!/^[6-9]\d{9}$/.test(phoneInput.trim())) {
      setPhoneModalError(t('phone.invalidNumber'));
      return;
    }
    setPhoneModalError('');
    setPhoneModalLoading(true);
    try {
      const result = await sendLinkPhoneOTP(phoneInput.trim());
      if (result.success) {
        if (result.otp) setDevOtp(result.otp); // dev mode
        setPhoneModalStep(2);
        toast.success(t('phone.otpSent', { phone: `+91${phoneInput}` }));
      }
    } finally {
      setPhoneModalLoading(false);
    }
  };

  const handlePhoneVerifyOTP = async () => {
    if (!/^\d{4,6}$/.test(phoneOtp.trim())) {
      setPhoneModalError(t('phone.invalidOtp'));
      return;
    }
    setPhoneModalError('');
    setPhoneModalLoading(true);
    try {
      const result = await linkPhone(phoneInput.trim(), phoneOtp.trim());
      if (result.success) {
        setShowPhoneModal(false);
        setPhoneModalStep(1);
        setPhoneInput('');
        setPhoneOtp('');
        setDevOtp('');
      }
    } finally {
      setPhoneModalLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (cart.length === 0) {
    navigate('/cart');
    return null;
  }

  // Check for unavailable items
  const unavailableItems = cart.filter(item => {
    return item.merchantId && merchantIds.length > 0 && !merchantIds.includes(item.merchantId);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="bg-primary-700 rounded-xl shadow-lg p-6 mb-6 text-white">
          <h1 className="text-2xl font-bold">{t('header.title')}</h1>
          <p className="text-gray-200 text-sm mt-1">{t('header.subtitle')}</p>
        </div>

        {/* Outside delivery hours notice — orders accepted 24x7, delivery 8 AM - 7 PM */}
        {!isWithinDeliveryHours() && (
          <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 p-4 sm:p-5 rounded-xl shadow-sm flex items-start gap-3">
            <span className="text-xl leading-none">🕗</span>
            <div>
              <p className="text-sm font-semibold text-blue-900">
                {t('deliveryHours.title')}
              </p>
              <p className="text-sm text-blue-700 mt-0.5">
                {getDeliveryWindowMessage()} {t('deliveryHours.label')}: <strong>{DELIVERY_WINDOW_LABEL}</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Warning Banner for Unavailable Items */}
        {unavailableItems.length > 0 && selectedAddress && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 sm:p-6 rounded-xl shadow-md">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400 mr-3 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800 mb-1">
                  {t('unavailable.title')}
                </h3>
                <p className="text-sm text-yellow-700 mb-2">
                  <Trans t={t} i18nKey="unavailable.message" count={unavailableItems.length} values={{ place: `${selectedAddress.area}, ${selectedAddress.city}` }} components={{ b: <strong /> }} />
                </p>
                <ul className="list-disc list-inside text-xs text-yellow-600 space-y-1">
                  {unavailableItems.map(item => (
                    <li key={item._id}>{item.name}</li>
                  ))}
                </ul>
                <p className="text-xs text-yellow-600 mt-2">
                  {t('unavailable.hint')}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Checkout Form */}
        <div className="order-2 lg:order-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5">{t('deliveryDetails')}</h2>

          {/* City Mismatch Warning */}
          {cartCity && selectedAddress && selectedAddress.city &&
           cartCity.toLowerCase() !== selectedAddress.city.toLowerCase() && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 sm:p-6 mb-6 shadow-md">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-red-900 font-bold text-base mb-2">{t('cityMismatch.title')}</h4>
                  <p className="text-red-800 text-sm mb-4">
                    <Trans t={t} i18nKey="cityMismatch.message" values={{ cartCity, addressCity: selectedAddress.city }} components={{ b: <span className="font-bold bg-red-100 px-2 py-0.5 rounded" /> }} />
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={clearCart}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold"
                    >
                      <TrashIcon className="h-4 w-4" />
                      {t('cityMismatch.clearCart')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const matchingAddress = addressesData?.addresses?.find(
                          addr => addr.city.toLowerCase() === cartCity.toLowerCase()
                        );
                        if (matchingAddress) {
                          setSelectedAddress(matchingAddress);
                          toast.success(t('cityMismatch.switched', { city: cartCity }));
                        } else {
                          toast.error(t('cityMismatch.noAddress', { city: cartCity }));
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-semibold"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                      {t('cityMismatch.switch', { city: cartCity })}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Phone verification banner for Google-auth users */}
          {user && !user.phone && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <PhoneIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-800 text-sm">{t('phone.requiredTitle')}</p>
                  <p className="text-xs text-amber-700 mt-1">
                    {t('phone.requiredMessage')}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowPhoneModal(true)}
                    className="mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    {t('phone.verifyButton')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Address Selection Section */}
          {user && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold text-gray-900">{t('addresses.selectTitle')}</h3>
                <button
                  type="button"
                  onClick={() => setShowAddAddressForm(true)}
                  className="text-primary-700 hover:text-primary-800 text-sm font-semibold flex items-center transition-colors"
                >
                  <PlusIcon className="w-4 h-4 mr-1" />
                  {t('addresses.addNew')}
                </button>
              </div>

              {/* Address List with Radio Buttons */}
              {addressesLoading ? (
                <div className="flex justify-center items-center py-8">
                  <span className="text-2xl animate-bounce">🏗️</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {addressesData?.addresses?.length > 0 ? (
                    addressesData.addresses.map((address) => {
                      const AddressIcon = getAddressIcon(address.addressType);
                      return (
                        <label
                          key={address._id}
                          className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 block ${
                            selectedAddress?._id === address._id
                              ? 'border-secondary-500 bg-secondary-50 shadow-md'
                              : 'border-gray-200 hover:border-secondary-300 hover:bg-gray-50 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-start">
                            <input
                              type="radio"
                              name="selectedAddress"
                              value={address._id}
                              checked={selectedAddress?._id === address._id}
                              onChange={() => handleAddressSelect(address)}
                              className="mt-1 mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <div className="flex items-start flex-1">
                              <div className="p-2 bg-gray-100 rounded-lg mr-3">
                                <AddressIcon className="w-5 h-5 text-gray-600" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center">
                                  <h4 className="font-medium text-gray-900">{address.title}</h4>
                                  {address.isDefault && (
                                    <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                                      {t('addresses.default')}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">{address.fullName}</p>
                                <p className="text-sm text-gray-600">{address.phoneNumber}</p>
                                <p className="text-sm text-gray-600">
                                  {address.addressLine1}
                                  {address.addressLine2 && `, ${address.addressLine2}`}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {address.area}, {address.city} - {address.pincode}
                                </p>
                              </div>
                            </div>
                          </div>
                        </label>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-xl bg-gradient-to-br from-gray-50 to-stone-50">
                      <MapPinIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 font-medium mb-4">{t('addresses.none')}</p>
                      <button
                        type="button"
                        onClick={() => setShowAddAddressForm(true)}
                        className="inline-flex items-center text-primary-700 hover:text-primary-800 font-semibold transition-colors"
                      >
                        <PlusIcon className="w-5 h-5 mr-1" />
                        {t('addresses.addFirst')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('form.instructions')}
              </label>
              <textarea
                name="deliveryInstructions"
                value={formData.deliveryInstructions}
                onChange={handleInputChange}
                rows={3}
                placeholder={t('form.instructionsPlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('form.paymentMethod')}
              </label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
              >
                <option value="cod">{t('form.cod')}</option>
                <option value="" disabled>{t('form.onlineSoon')}</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={!selectedAddress || unavailableItems.length > 0}
              className={`w-full py-3.5 px-6 rounded-xl font-bold text-center transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                !selectedAddress || unavailableItems.length > 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none hover:scale-100'
                  : 'bg-primary-700 hover:bg-primary-800 text-white'
              }`}
            >
              {!selectedAddress
                ? t('form.selectAddressToContinue')
                : unavailableItems.length > 0
                ? t('form.removeUnavailable')
                : t('form.placeOrder')}
            </button>
          </form>
        </div>

        {/* Order Summary - first on mobile, right on desktop */}
        <div className="order-1 lg:order-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:sticky lg:top-8 self-start">
          <h2 className="text-lg font-bold text-gray-900 mb-5">{t('summary.title')}</h2>
          
          {/* Cart Items */}
          <div className="space-y-4 mb-6">
            {cart.map((item, index) => (
              <div key={item.cartKey} className={`pb-4 ${index !== cart.length - 1 ? 'border-b border-gray-100' : ''} hover:bg-gray-50 transition-all duration-200 p-3 rounded-xl`}>
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">
                      {item.name}
                      {item.variantLabel && (
                        <span className="ml-2 px-2 py-0.5 bg-primary-50 text-primary-700 text-xs font-semibold rounded-full">
                          {item.variantLabel}
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {item.quantity} x ₹{item.price.toLocaleString()} <span className="text-xs text-gray-500">{t('summary.perUnit', { unit: item.unit })}</span>
                    </p>
                  </div>
                  <span className="font-black text-lg text-primary-700">
                    ₹{(item.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t-2 border-gray-200 pt-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{t('summary.subtotal', { count: cart.length })}:</span>
              <span className="font-semibold text-gray-900">₹{finalPricing.subtotal.toLocaleString()}</span>
            </div>

            {/* Show GST breakdown only if NOT in no-display mode OR if customer wants GST bill */}
            {(pricingData?.breakdown?.gstDisplayMode !== 'no-display' || requireGSTBill) && finalPricing.tax > 0 && (
              <>
                {finalPricing.subtotalBeforeGST && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">└─ {t('summary.baseAmount')}:</span>
                    <span className="text-gray-500">₹{Math.round(finalPricing.subtotalBeforeGST).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">└─ GST:</span>
                  <span className="text-gray-500">₹{Math.round(finalPricing.tax).toLocaleString()}</span>
                </div>
              </>
            )}

            <div className="flex justify-between">
              <span className="text-gray-600">
                {t('summary.delivery')} {pricingData?.breakdown?.deliveryConfig?.type === 'threshold' &&
                        finalPricing.subtotal >= pricingData.breakdown.deliveryConfig.freeDeliveryThreshold ?
                        `(${t('summary.free')})` : ''}:
              </span>
              <span className="font-medium">₹{Math.round(finalPricing.deliveryCharges).toLocaleString()}</span>
            </div>
            {pricingData?.breakdown?.deliveryConfig?.type === 'threshold' &&
             pricingData.breakdown.deliveryConfig.freeDeliveryThreshold > 0 &&
             finalPricing.subtotal < pricingData.breakdown.deliveryConfig.freeDeliveryThreshold && (
              <div className="text-xs text-primary-700 bg-primary-50 rounded-lg px-3 py-2">
                {t('summary.addForFreeDelivery', { amount: (pricingData.breakdown.deliveryConfig.freeDeliveryThreshold - finalPricing.subtotal).toLocaleString() })}
              </div>
            )}
            {finalPricing.platformFee && finalPricing.platformFee > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">{t('summary.platformFee')}:</span>
                <span className="font-medium">₹{Math.round(finalPricing.platformFee).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-lg sm:text-xl font-bold border-t-2 border-gray-300 pt-4 mt-3">
              <span className="text-gray-900">{t('summary.total')}:</span>
              <div className="text-right">
                <span className="text-2xl font-bold text-gray-900">₹{Math.round(finalPricing.totalAmount).toLocaleString()}</span>
                {pricingLoading && (
                  <div className="text-xs text-primary-600 mt-1 animate-pulse">{t('summary.updatingPrices')}</div>
                )}
              </div>
            </div>

            {/* Info message when no-display mode is active */}
            {pricingData?.breakdown?.gstDisplayMode === 'no-display' && !requireGSTBill && (
              <div className="flex items-start gap-1.5 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                <InformationCircleIcon className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                {t('summary.gstIncludedHint')}
              </div>
            )}
          </div>

          {/* GST Bill Checkbox */}
          <div className="border-t border-gray-100 pt-5 mt-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={requireGSTBill}
                onChange={(e) => setRequireGSTBill(e.target.checked)}
                className="mt-0.5 h-4 w-4 text-primary-700 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <DocumentTextIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-900">{t('gst.needInvoice')}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t('gst.needInvoiceHint')}
                </p>
              </div>
            </label>
            {requireGSTBill && (
              <button
                type="button"
                onClick={() => setShowInvoice(true)}
                className="mt-3 w-full inline-flex items-center justify-center gap-2 text-green-700 border border-green-200 bg-green-50 hover:bg-green-100 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                <DocumentTextIcon className="h-4 w-4" />
                {t('gst.previewSample')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Address Selection Modal */}
      {showAddressSelection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-primary-700 p-6 rounded-t-xl">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">{t('addresses.selectTitle')}</h2>
                <button
                  onClick={() => setShowAddressSelection(false)}
                  aria-label={t('close')}
                  className="text-white hover:text-gray-200 text-2xl font-bold transition-colors duration-150"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">

              {addressesLoading ? (
                <div className="flex justify-center items-center py-8">
                  <span className="text-2xl animate-bounce">🏗️</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {addressesData?.addresses?.length > 0 ? (
                    addressesData.addresses.map((address) => {
                      const AddressIcon = getAddressIcon(address.addressType);
                      return (
                        <label
                          key={address._id}
                          className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 block ${
                            selectedAddress?._id === address._id
                              ? 'border-secondary-500 bg-secondary-50 shadow-md'
                              : 'border-gray-200 hover:border-secondary-300 hover:bg-gray-50 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-start">
                            <input
                              type="radio"
                              name="selectedAddress"
                              value={address._id}
                              checked={selectedAddress?._id === address._id}
                              onChange={() => handleAddressSelect(address)}
                              className="mt-1 mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <div className="flex items-start flex-1">
                              <div className="p-2 bg-gray-100 rounded-lg mr-3">
                                <AddressIcon className="w-5 h-5 text-gray-600" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center">
                                  <h4 className="font-medium text-gray-900">{address.title}</h4>
                                  {address.isDefault && (
                                    <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                                      {t('addresses.default')}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">{address.fullName}</p>
                                <p className="text-sm text-gray-600">{address.phoneNumber}</p>
                                <p className="text-sm text-gray-600">
                                  {address.addressLine1}
                                  {address.addressLine2 && `, ${address.addressLine2}`}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {address.area}, {address.city} - {address.pincode}
                                </p>
                              </div>
                            </div>
                          </div>
                        </label>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <MapPinIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">{t('addresses.none')}</p>
                    </div>
                  )}

                  {/* Add New Address Button */}
                  <button
                    onClick={handleAddNewAddress}
                    className="w-full p-4 border border-dashed border-gray-300 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition-colors flex items-center justify-center group"
                  >
                    <PlusIcon className="w-5 h-5 text-gray-400 group-hover:text-primary-700 mr-2 transition-colors" />
                    <span className="text-gray-600 group-hover:text-primary-700 font-semibold transition-colors">{t('addresses.addNewAddress')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <AddressFormModal
        isOpen={showAddAddressForm}
        onClose={() => setShowAddAddressForm(false)}
        onSuccess={() => refetchAddresses()}
      />


      {/* Sample Invoice Modal */}
      {showInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 sm:p-8">
              {/* Invoice Header */}
              <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-gray-200">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-black text-primary-700 mb-2">📄 {t('sample.title')}</h1>
                  <p className="text-sm text-gray-600 font-medium">{t('sample.subtitle')}</p>
                </div>
                <button
                  onClick={() => setShowInvoice(false)}
                  aria-label={t('close')}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold transition-colors duration-150"
                >
                  ✕
                </button>
              </div>

              {/* Company Details */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{t('sample.from')}:</h3>
                  <p className="text-sm text-gray-800 font-semibold">{t('sample.companyName')}</p>
                  <p className="text-sm text-gray-600">123 Business Street</p>
                  <p className="text-sm text-gray-600">City, State - 123456</p>
                  <p className="text-sm text-gray-600 mt-2">GSTIN: 22AAAAA0000A1Z5</p>
                  <p className="text-sm text-gray-600">{t('invoice.phoneLabel')}: +91 1234567890</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{t('invoice.billTo')}:</h3>
                  <p className="text-sm text-gray-800 font-semibold">{selectedAddress?.fullName || user?.name || t('sample.customerName')}</p>
                  <p className="text-sm text-gray-600">{selectedAddress?.addressLine1 || t('sample.addressLine1')}</p>
                  {selectedAddress?.addressLine2 && (
                    <p className="text-sm text-gray-600">{selectedAddress.addressLine2}</p>
                  )}
                  <p className="text-sm text-gray-600">
                    {selectedAddress?.area || t('sample.area')}, {selectedAddress?.city || t('sample.city')} - {selectedAddress?.pincode || '000000'}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">{t('invoice.phoneLabel')}: {selectedAddress?.phoneNumber || user?.phone || 'N/A'}</p>
                </div>
              </div>

              {/* Invoice Details */}
              <div className="grid grid-cols-3 gap-4 mb-8 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-600">{t('sample.invoiceNumber')}</p>
                  <p className="text-sm font-semibold text-gray-900">INV-{Date.now().toString().slice(-8)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">{t('invoice.date')}</p>
                  <p className="text-sm font-semibold text-gray-900">{new Date().toLocaleDateString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">{t('invoice.paymentMethod')}</p>
                  <p className="text-sm font-semibold text-gray-900">{formData.paymentMethod.toUpperCase()}</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-8">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b-2 border-gray-300">
                    <tr>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">#</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">{t('invoice.table.description')}</th>
                      <th className="text-right p-3 text-sm font-semibold text-gray-700">HSN/SAC</th>
                      <th className="text-right p-3 text-sm font-semibold text-gray-700">{t('invoice.table.qty')}</th>
                      <th className="text-right p-3 text-sm font-semibold text-gray-700">{t('sample.rate')}</th>
                      <th className="text-right p-3 text-sm font-semibold text-gray-700">GST %</th>
                      <th className="text-right p-3 text-sm font-semibold text-gray-700">{t('sample.amount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item, index) => {
                      const itemTotal = item.price * item.quantity;
                      const gstRate = item.gstRate || 18;

                      // Extract base price and GST from total (treating price as GST-inclusive)
                      const rate = gstRate / 100;
                      const basePrice = item.price / (1 + rate);
                      const gstAmount = item.price - basePrice;

                      return (
                        <tr key={item.cartKey} className="border-b border-gray-200">
                          <td className="p-3 text-sm text-gray-600">{index + 1}</td>
                          <td className="p-3 text-sm text-gray-900">
                            <div className="font-medium">
                              {item.name}
                              {item.variantLabel && (
                                <span className="ml-1.5 text-xs text-primary-600 font-semibold">({item.variantLabel})</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">SKU: {item.sku || 'N/A'}</div>
                          </td>
                          <td className="p-3 text-sm text-gray-600 text-right">-</td>
                          <td className="p-3 text-sm text-gray-600 text-right">{item.quantity} {item.unit}</td>
                          <td className="p-3 text-sm text-gray-600 text-right">
                            <div>₹{item.price.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">{t('sample.base')}: ₹{basePrice.toFixed(2)}</div>
                          </td>
                          <td className="p-3 text-sm text-gray-600 text-right">
                            <div>{gstRate}%</div>
                            <div className="text-xs text-gray-500">₹{gstAmount.toFixed(2)}</div>
                          </td>
                          <td className="p-3 text-sm text-gray-900 font-medium text-right">₹{itemTotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="flex justify-end">
                <div className="w-80">
                  <div className="space-y-2">
                    {finalPricing.subtotalBeforeGST && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t('invoice.taxableAmount')}:</span>
                        <span className="font-medium text-gray-900">₹{Math.round(finalPricing.subtotalBeforeGST).toFixed(2)}</span>
                      </div>
                    )}
                    {finalPricing.tax > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t('sample.gstAmount')}:</span>
                        <span className="font-medium text-gray-900">₹{Math.round(finalPricing.tax).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-2">
                      <span className="text-gray-900">{t('invoice.subtotalIncGst')}:</span>
                      <span className="text-gray-900">₹{finalPricing.subtotal.toFixed(2)}</span>
                    </div>
                    {finalPricing.deliveryCharges > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t('invoice.deliveryCharges')}:</span>
                        <span className="font-medium text-gray-900">₹{Math.round(finalPricing.deliveryCharges).toFixed(2)}</span>
                      </div>
                    )}
                    {finalPricing.platformFee && finalPricing.platformFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t('summary.platformFee')}:</span>
                        <span className="font-medium text-gray-900">₹{Math.round(finalPricing.platformFee).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t-2 border-gray-300 pt-2 mt-2">
                      <span className="text-gray-900">{t('sample.totalAmount')}:</span>
                      <span className="text-gray-900">₹{Math.round(finalPricing.totalAmount).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>{t('sample.noteLabel')}:</strong> {t('sample.note')}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowInvoice(false)}
                  className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  {t('close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phone Verification Modal — required for Google-auth users at checkout */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">{t('phone.modalTitle')}</h2>
            <p className="text-sm text-gray-500 mb-6">
              {t('phone.modalSubtitle')}
            </p>

            {phoneModalStep === 1 ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('phone.mobileNumber')}
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => { setPhoneInput(e.target.value.replace(/\D/g, '')); setPhoneModalError(''); }}
                      maxLength={10}
                      placeholder={t('address.placeholders.phone')}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  {phoneModalError && <p className="text-red-600 text-sm mt-1">{phoneModalError}</p>}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPhoneModal(false)}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handlePhoneSendOTP}
                    disabled={phoneModalLoading}
                    className="flex-1 py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {phoneModalLoading ? t('phone.sending') : t('phone.sendOtp')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  <Trans t={t} i18nKey="phone.enterOtpSent" values={{ phone: `+91${phoneInput}` }} components={{ b: <strong /> }} />
                </p>
                {devOtp && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                    Dev OTP: <strong>{devOtp}</strong>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    OTP
                  </label>
                  <input
                    type="text"
                    value={phoneOtp}
                    onChange={(e) => { setPhoneOtp(e.target.value.replace(/\D/g, '')); setPhoneModalError(''); }}
                    maxLength={6}
                    placeholder={t('phone.enterOtp')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-center text-lg font-mono tracking-widest focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  {phoneModalError && <p className="text-red-600 text-sm mt-1">{phoneModalError}</p>}
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <button
                    onClick={() => { setPhoneModalStep(1); setPhoneOtp(''); setPhoneModalError(''); }}
                    className="text-primary-600 hover:text-primary-500"
                  >
                    {t('phone.changeNumber')}
                  </button>
                  <button
                    onClick={handlePhoneSendOTP}
                    disabled={phoneModalLoading}
                    className="text-primary-600 hover:text-primary-500 underline disabled:opacity-50"
                  >
                    {t('phone.resendOtp')}
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPhoneModal(false)}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handlePhoneVerifyOTP}
                    disabled={phoneModalLoading}
                    className="flex-1 py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {phoneModalLoading ? t('phone.verifying') : t('phone.verifyContinue')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
