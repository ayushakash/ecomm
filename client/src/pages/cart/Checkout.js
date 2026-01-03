import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orderAPI, settingsAPI, addressAPI } from '../../services/api';
import { reverseGeocode, forwardGeocode } from '../../services/geocodingService';
import toast from 'react-hot-toast';
import LocationConfirmation from '../../components/location/LocationConfirmation';
import {
  MapPinIcon,
  PlusIcon,
  PencilIcon,
  HomeIcon,
  BuildingOfficeIcon,
  UserIcon,
  ExclamationTriangleIcon
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

const Checkout = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { cart, clearCart, cartCity } = useCart();
  const { user } = useAuth();
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
  const [newAddressForm, setNewAddressForm] = useState({
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
  const [capturingCoordinates, setCapturingCoordinates] = useState(false);

  // Prepare items for pricing calculation
  const cartItems = useMemo(() =>
    cart.map(item => ({
      price: item.price,
      quantity: item.quantity,
      weight: item.weight || 0,
      gstRate: item.gstRate || 18,
      gstType: item.gstType || 'exclusive'
    })), [cart]
  );

  // Get dynamic pricing from backend
  const { data: pricingData, isLoading: pricingLoading } = useQuery({
    queryKey: ['checkout-pricing', cartItems],
    queryFn: () => settingsAPI.calculatePricing(cartItems),
    enabled: cart.length > 0
  });
  console.log("PRICING DATAAAA",pricingData)

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

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Use dynamic pricing if available, fallback to static calculation
  const finalPricing = pricingData || {
    subtotal: subtotal,
    tax: subtotal * 0.1,
    deliveryCharges: 50,
    totalAmount: subtotal + (subtotal * 0.1) + 50
  };

    const createOrderMutation = useMutation({
    mutationFn: (orderData) => orderAPI.createOrder(orderData),
    onSuccess: (res) => {
      console.log("✅ Order created:", res.data);

      clearCart();

      const newOrder = res.data.order || res.data;

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
        toast.error('Please login to place order');
        navigate('/login');
      } else {
        alert("Failed to place order. Please try again!");
      }
    }
  });

  // Create address mutation
  const createAddressMutation = useMutation({
    mutationFn: (addressData) => addressAPI.createAddress(addressData),
    onSuccess: () => {
      toast.success('Address added successfully!');
      setShowAddAddressForm(false);
      setNewAddressForm({
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
      refetchAddresses();
    },
    onError: (err) => {
      // Show specific validation errors if available
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        // Display each error on a separate line without the field name for cleaner UI
        const errorMessages = Object.values(errors).join('\n');
        toast.error(errorMessages, { duration: 5000 });
      } else {
        toast.error(err.response?.data?.message || 'Failed to add address');
      }
    }
  });

  // Set default address mutation
  const setDefaultMutation = useMutation({
    mutationFn: (addressId) => addressAPI.setDefaultAddress(addressId),
    onSuccess: () => {
      toast.success('Default address updated!');
      refetchAddresses();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to set default address');
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
      toast.error('Geolocation is not supported by this browser');
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
            toast.success('Current location detected successfully!');
          })
          .catch((error) => {
            console.error('Reverse geocoding failed:', error);
            setDeliveryLocation({
              coordinates: [longitude, latitude], // [lng, lat] format for MongoDB
              address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
              isCurrentLocation: true
            });
            toast.success('Location detected successfully!');
          })
          .finally(() => {
            setGettingLocation(false);
          });
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
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      // Using a simple reverse geocoding approach
      // You can replace this with your preferred geocoding service
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );

      if (!response.ok) throw new Error('Geocoding failed');

      const data = await response.json();
      return `${data.locality || data.city || ''}, ${data.principalSubdivision || ''}, ${data.countryName || ''}`.replace(/^,\s*|,\s*$/g, '');
    } catch (error) {
      throw error;
    }
  };

  const captureAddressCoordinates = async () => {
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
            setNewAddressForm(prev => ({
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
            setNewAddressForm(prev => ({
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
          setNewAddressForm(prev => ({
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

  // NEW: Get coordinates from entered address using forward geocoding
  const getCoordinatesFromAddress = async (silent = false) => {
    // Validate that required fields are filled
    if (!newAddressForm.area || !newAddressForm.city || !newAddressForm.state) {
      if (!silent) {
        toast.error('Please fill in Area, City, and State before getting coordinates');
      }
      return;
    }

    // Skip if coordinates already captured via GPS
    if (newAddressForm.coordinates.latitude && newAddressForm.coordinates.longitude) {
      return;
    }

    if (!silent) {
      setCapturingCoordinates(true);
      toast.loading('Finding coordinates from address...', { id: 'forward-geocode' });
    }

    try {
      const result = await forwardGeocode({
        addressLine1: newAddressForm.addressLine1,
        area: newAddressForm.area,
        city: newAddressForm.city,
        state: newAddressForm.state,
        pincode: newAddressForm.pincode
      });

      if (result.success && result.coordinates) {
        setNewAddressForm(prev => ({
          ...prev,
          coordinates: result.coordinates
        }));

        if (!silent) {
          toast.success(`Coordinates found! (Accuracy: ${Math.round(result.accuracy * 100)}%)`, { id: 'forward-geocode' });
        } else {
          // Silent success - just show subtle indicator
          console.log('✅ Auto-geocoded address:', result.coordinates);
        }
      } else {
        if (!silent) {
          toast.error(result.error || 'Could not find coordinates for this address', { id: 'forward-geocode' });
        }
      }
    } catch (error) {
      console.error('Forward geocoding error:', error);
      if (!silent) {
        toast.error('Failed to get coordinates from address', { id: 'forward-geocode' });
      }
    } finally {
      if (!silent) {
        setCapturingCoordinates(false);
      }
    }
  };

  // Auto-geocode when address fields are filled (debounced)
  useEffect(() => {
    // Only auto-geocode if we don't have coordinates yet
    if (newAddressForm.coordinates.latitude && newAddressForm.coordinates.longitude) {
      return;
    }

    // Check if required fields are filled
    if (newAddressForm.area && newAddressForm.city && newAddressForm.state && newAddressForm.pincode) {
      // Debounce: wait 2 seconds after user stops typing
      const timer = setTimeout(() => {
        console.log('🔍 Auto-geocoding address...');
        getCoordinatesFromAddress(true); // silent = true
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [newAddressForm.area, newAddressForm.city, newAddressForm.state, newAddressForm.pincode]);

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

  const handleNewAddressSubmit = (e) => {
    e.preventDefault();

    // Validate coordinates
    if (!newAddressForm.coordinates.latitude || !newAddressForm.coordinates.longitude) {
      toast.error('Please capture your location coordinates before saving the address');
      return;
    }

    // Add user's name and generate title from address type
    const addressTypeLabel = newAddressForm.addressType.charAt(0).toUpperCase() + newAddressForm.addressType.slice(1);
    const addressData = {
      ...newAddressForm,
      fullName: user?.name || '',
      title: `${addressTypeLabel} - ${newAddressForm.area}`
    };

    createAddressMutation.mutate(addressData);
  };

  const handleNewAddressChange = (e) => {
    setNewAddressForm({
      ...newAddressForm,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if user is authenticated - if not, prompt for login
    if (!user) {
      const shouldLogin = window.confirm(
        'Please login or register to place your order.\n\nClick OK to login, or Cancel to register.'
      );
      if (shouldLogin) {
        navigate('/login');
      } else {
        navigate('/register');
      }
      return;
    }

    if (!selectedAddress) {
      toast.error('Please select a delivery address');
      return;
    }

    // CRITICAL: Check if cart city matches selected address city
    if (cartCity && selectedAddress.city) {
      if (cartCity.toLowerCase() !== selectedAddress.city.toLowerCase()) {
        toast.error(
          `Cart contains items from ${cartCity} but delivery address is in ${selectedAddress.city}. Please clear your cart or select a ${cartCity} address.`,
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
      toast.error(`${unavailableItems.length} item(s) in your cart cannot be delivered to the selected address`);
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
        totalPrice: item.price * item.quantity
      })),
      subtotal: finalPricing.subtotal,
      tax: finalPricing.tax,
      deliveryCharge: finalPricing.deliveryCharges,
      totalAmount: finalPricing.totalAmount
    };

    console.log('Order data being sent:', JSON.stringify(orderData, null, 2));
    createOrderMutation.mutate(orderData);
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
        <div className="bg-primary-700 rounded-xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 text-white">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">🛍️ Checkout</h1>
          <p className="text-gray-100 text-sm sm:text-base">Complete your order</p>
        </div>

        {/* Warning Banner for Unavailable Items */}
        {unavailableItems.length > 0 && selectedAddress && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 sm:p-6 rounded-xl shadow-md">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400 mr-3 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800 mb-1">
                  Some items cannot be delivered to your address
                </h3>
                <p className="text-sm text-yellow-700 mb-2">
                  {unavailableItems.length} item(s) in your cart are from merchants not available in{' '}
                  <strong>{selectedAddress.area}, {selectedAddress.city}</strong>
                </p>
                <ul className="list-disc list-inside text-xs text-yellow-600 space-y-1">
                  {unavailableItems.map(item => (
                    <li key={item._id}>{item.name}</li>
                  ))}
                </ul>
                <p className="text-xs text-yellow-600 mt-2">
                  Please remove these items or select a different delivery address to continue.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Checkout Form */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-primary-700 mb-6">📦 Shipping Information</h2>

          {/* City Mismatch Warning */}
          {cartCity && selectedAddress && selectedAddress.city &&
           cartCity.toLowerCase() !== selectedAddress.city.toLowerCase() && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 sm:p-6 mb-6 shadow-md">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-red-900 font-bold text-base mb-2">⚠️ City Mismatch Error!</h4>
                  <p className="text-red-800 text-sm mb-4">
                    Your cart contains items from <span className="font-bold bg-red-100 px-2 py-0.5 rounded">{cartCity}</span>, but you're trying to deliver to <span className="font-bold bg-red-100 px-2 py-0.5 rounded">{selectedAddress.city}</span>.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={clearCart}
                      className="px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-200 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      🗑️ Clear Cart & Start Fresh
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Try to select an address from cart city
                        const matchingAddress = addressesData?.addresses?.find(
                          addr => addr.city.toLowerCase() === cartCity.toLowerCase()
                        );
                        if (matchingAddress) {
                          setSelectedAddress(matchingAddress);
                          toast.success(`Switched to ${cartCity} address`);
                        } else {
                          toast.error(`No address found in ${cartCity}. Please add one or clear cart.`);
                        }
                      }}
                      className="px-4 py-2.5 bg-white border-2 border-red-600 text-red-600 rounded-xl hover:bg-red-50 transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
                    >
                      🔄 Switch to {cartCity} Address
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Address Selection Section */}
          {user && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">📍 Select Delivery Address</h3>
                <button
                  type="button"
                  onClick={() => setShowAddAddressForm(true)}
                  className="text-orange-600 hover:text-orange-700 text-sm font-semibold flex items-center transition-colors duration-150"
                >
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Add New
                </button>
              </div>

              {/* Address List with Radio Buttons */}
              {addressesLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
                                      Default
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
                      <p className="text-gray-600 font-medium mb-4">No saved addresses found</p>
                      <button
                        type="button"
                        onClick={() => setShowAddAddressForm(true)}
                        className="inline-flex items-center text-orange-600 hover:text-orange-700 font-semibold transition-colors duration-150"
                      >
                        <PlusIcon className="w-5 h-5 mr-1" />
                        Add your first address
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                📝 Delivery Instructions (Optional)
              </label>
              <textarea
                name="deliveryInstructions"
                value={formData.deliveryInstructions}
                onChange={handleInputChange}
                rows={3}
                placeholder="Any special instructions for delivery..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                💳 Payment Method
              </label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 font-medium"
              >
                <option value="cod">💵 Cash on Delivery</option>
                <option value="online">💳 Online Payment</option>
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
                ? '📍 Select an Address'
                : unavailableItems.length > 0
                ? '⚠️ Remove Unavailable Items'
                : '✨ Place Order'}
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 sm:p-8 sticky top-8">
          <h2 className="text-xl sm:text-2xl font-bold text-primary-700 mb-6">💳 Order Summary</h2>
          
          {/* Cart Items */}
          <div className="space-y-4 mb-6">
            {cart.map((item, index) => (
              <div key={item._id} className={`pb-4 ${index !== cart.length - 1 ? 'border-b border-gray-100' : ''} hover:bg-gray-50 transition-all duration-200 p-3 rounded-xl`}>
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">{item.name}</h3>
                    <p className="text-sm text-gray-600">
                      {item.quantity} x ₹{item.price.toLocaleString()} <span className="text-xs text-gray-500">per {item.unit}</span>
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
              <span className="text-gray-600">Subtotal ({cart.length} item{cart.length !== 1 ? 's' : ''}):</span>
              <span className="font-semibold text-gray-900">₹{finalPricing.subtotal.toLocaleString()}</span>
            </div>

            {/* Show GST breakdown only if NOT in no-display mode OR if customer wants GST bill */}
            {(pricingData?.breakdown?.gstDisplayMode !== 'no-display' || requireGSTBill) && finalPricing.tax > 0 && (
              <>
                {finalPricing.subtotalBeforeGST && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">└─ Base Amount:</span>
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
                Delivery {pricingData?.breakdown?.deliveryConfig?.type === 'threshold' &&
                        finalPricing.subtotal >= pricingData.breakdown.deliveryConfig.freeDeliveryThreshold ?
                        '(Free)' : ''}:
              </span>
              <span className="font-medium">₹{Math.round(finalPricing.deliveryCharges).toLocaleString()}</span>
            </div>
            {finalPricing.platformFee && finalPricing.platformFee > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Platform Fee:</span>
                <span className="font-medium">₹{Math.round(finalPricing.platformFee).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-lg sm:text-xl font-bold border-t-2 border-gray-300 pt-4 mt-3">
              <span className="text-gray-900">Total:</span>
              <div className="text-right">
                <span className="text-2xl font-bold text-gray-900">₹{Math.round(finalPricing.totalAmount).toLocaleString()}</span>
                {pricingLoading && (
                  <div className="text-xs text-primary-600 mt-1 animate-pulse">Updating prices...</div>
                )}
              </div>
            </div>

            {/* Info message when no-display mode is active */}
            {pricingData?.breakdown?.gstDisplayMode === 'no-display' && !requireGSTBill && (
              <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
                ℹ️ Prices shown are final (GST included). Check "I need a GST Invoice" to see GST breakdown.
              </div>
            )}
          </div>

          {/* GST Bill Checkbox */}
          <div className="border-t-2 border-gray-100 pt-6 mt-6">
            <label className="flex items-start cursor-pointer group">
              <input
                type="checkbox"
                checked={requireGSTBill}
                onChange={(e) => setRequireGSTBill(e.target.checked)}
                className="mt-1 h-5 w-5 text-orange-600 border-gray-300 rounded-md focus:ring-orange-500 cursor-pointer"
              />
              <div className="ml-3">
                <span className="text-sm font-bold text-gray-900 group-hover:text-orange-600 transition-colors duration-150">📄 I need a GST Invoice</span>
                <p className="text-xs text-gray-600 mt-1">
                  Check this if you require a detailed GST invoice for tax purposes. A sample invoice will be generated.
                </p>
              </div>
            </label>
            {requireGSTBill && (
              <button
                type="button"
                onClick={() => setShowInvoice(true)}
                className="mt-4 w-full bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-2 border-green-200 px-4 py-3 rounded-xl hover:bg-green-100 text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
              >
                📄 Preview Sample Invoice
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
                <h2 className="text-xl sm:text-2xl font-bold text-white">📍 Select Delivery Address</h2>
                <button
                  onClick={() => setShowAddressSelection(false)}
                  className="text-white hover:text-gray-200 text-2xl font-bold transition-colors duration-150"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">

              {addressesLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
                                      Default
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
                      <p className="text-gray-500">No saved addresses found</p>
                    </div>
                  )}

                  {/* Add New Address Button */}
                  <button
                    onClick={handleAddNewAddress}
                    className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-orange-400 hover:bg-gradient-to-r hover:from-orange-50 hover:to-stone-50 transition-all duration-200 flex items-center justify-center group shadow-sm hover:shadow-md"
                  >
                    <PlusIcon className="w-5 h-5 text-gray-400 group-hover:text-orange-600 mr-2 transition-colors duration-150" />
                    <span className="text-gray-600 group-hover:text-orange-600 font-semibold transition-colors duration-150">Add New Address</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add New Address Modal */}
      {showAddAddressForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-primary-700 p-6 rounded-t-xl">
              <div className="flex justify-between items-center">
                <h2 className="text-xl sm:text-2xl font-bold text-white">📍 Add New Address</h2>
                <button
                  onClick={() => setShowAddAddressForm(false)}
                  className="text-white hover:text-gray-200 text-2xl font-bold transition-colors duration-150"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">

              <form onSubmit={handleNewAddressSubmit} className="space-y-4">
                {/* Address Type Selection */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Address Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="addressType"
                    value={newAddressForm.addressType}
                    onChange={handleNewAddressChange}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 font-medium"
                  >
                    <option value="home">🏠 Home</option>
                    <option value="office">🏢 Office</option>
                    <option value="other">📍 Other</option>
                  </select>
                </div>

                {/* GPS Coordinates Capture - REQUIRED */}
                <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-xl p-4 sm:p-6 shadow-md">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-bold text-orange-900 mb-2 text-sm flex items-center flex-wrap">
                        📍 Capture Location Coordinates <span className="text-red-500 ml-1">*</span>
                        {!newAddressForm.coordinates.latitude && (
                          <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Required</span>
                        )}
                      </h4>
                      <p className="text-xs sm:text-sm text-orange-800 mb-3 font-medium">
                        ⚠️ Required to find nearby merchants and enable product delivery to this address
                      </p>
                      {newAddressForm.coordinates.latitude && newAddressForm.coordinates.longitude ? (
                        <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 inline-block font-medium break-all">
                          ✓ Location set: {newAddressForm.coordinates.latitude.toFixed(4)}, {newAddressForm.coordinates.longitude.toFixed(4)}
                        </div>
                      ) : (
                        <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 inline-block font-medium">
                          📍 We'll automatically find coordinates from your address to show deliverable merchants
                        </div>
                      )}
                    </div>

                    {/* Location Capture Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={captureAddressCoordinates}
                        disabled={capturingCoordinates}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 disabled:opacity-50 transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg sm:transform sm:hover:scale-105"
                      >
                        {capturingCoordinates ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Getting...
                          </>
                        ) : (
                          <>
                            <MapPinIcon className="w-4 h-4 mr-2" />
                            Use Current Location
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => getCoordinatesFromAddress(false)}
                        disabled={capturingCoordinates || !newAddressForm.area || !newAddressForm.city || !newAddressForm.state}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg sm:transform sm:hover:scale-105"
                        title={!newAddressForm.area || !newAddressForm.city || !newAddressForm.state ? 'Fill Area, City & State first' : 'Manually find coordinates from address'}
                      >
                        {capturingCoordinates ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Finding...
                          </>
                        ) : (
                          <>
                            <MapPinIcon className="w-4 h-4 mr-2" />
                            Find Coordinates Now
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={newAddressForm.phoneNumber}
                    onChange={handleNewAddressChange}
                    placeholder="10-digit mobile number"
                    required
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    name="addressLine1"
                    value={newAddressForm.addressLine1}
                    onChange={handleNewAddressChange}
                    placeholder="House/Flat number, Street name"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 2 (Optional)
                  </label>
                  <input
                    type="text"
                    name="addressLine2"
                    value={newAddressForm.addressLine2}
                    onChange={handleNewAddressChange}
                    placeholder="Apartment, suite, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Area/Locality
                    </label>
                    <input
                      type="text"
                      name="area"
                      value={newAddressForm.area}
                      onChange={handleNewAddressChange}
                      required
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={newAddressForm.city}
                      onChange={handleNewAddressChange}
                      required
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Pincode
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      value={newAddressForm.pincode}
                      onChange={handleNewAddressChange}
                      required
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      State
                    </label>
                    <select
                      name="state"
                      value={newAddressForm.state}
                      onChange={handleNewAddressChange}
                      required
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 font-medium"
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
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      name="landmark"
                      value={newAddressForm.landmark}
                      onChange={handleNewAddressChange}
                      placeholder="Near a landmark"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t-2 border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowAddAddressForm(false)}
                    className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createAddressMutation.isLoading}
                    className="px-8 py-3 bg-primary-700 hover:bg-primary-800 text-white rounded-xl disabled:opacity-50 font-bold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    {createAddressMutation.isLoading ? '💾 Saving...' : '✅ Save Address'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Sample Invoice Modal */}
      {showInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 sm:p-8">
              {/* Invoice Header */}
              <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-gray-200">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-black text-primary-700 mb-2">📄 TAX INVOICE</h1>
                  <p className="text-sm text-gray-600 font-medium">Sample Invoice - For Preview Only</p>
                </div>
                <button
                  onClick={() => setShowInvoice(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold transition-colors duration-150"
                >
                  ✕
                </button>
              </div>

              {/* Company Details */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">From:</h3>
                  <p className="text-sm text-gray-800 font-semibold">Your Company Name</p>
                  <p className="text-sm text-gray-600">123 Business Street</p>
                  <p className="text-sm text-gray-600">City, State - 123456</p>
                  <p className="text-sm text-gray-600 mt-2">GSTIN: 22AAAAA0000A1Z5</p>
                  <p className="text-sm text-gray-600">Phone: +91 1234567890</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Bill To:</h3>
                  <p className="text-sm text-gray-800 font-semibold">{selectedAddress?.fullName || user?.name || 'Customer Name'}</p>
                  <p className="text-sm text-gray-600">{selectedAddress?.addressLine1 || 'Address Line 1'}</p>
                  {selectedAddress?.addressLine2 && (
                    <p className="text-sm text-gray-600">{selectedAddress.addressLine2}</p>
                  )}
                  <p className="text-sm text-gray-600">
                    {selectedAddress?.area || 'Area'}, {selectedAddress?.city || 'City'} - {selectedAddress?.pincode || '000000'}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">Phone: {selectedAddress?.phoneNumber || user?.phone || 'N/A'}</p>
                </div>
              </div>

              {/* Invoice Details */}
              <div className="grid grid-cols-3 gap-4 mb-8 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-600">Invoice Number</p>
                  <p className="text-sm font-semibold text-gray-900">INV-{Date.now().toString().slice(-8)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Invoice Date</p>
                  <p className="text-sm font-semibold text-gray-900">{new Date().toLocaleDateString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Payment Method</p>
                  <p className="text-sm font-semibold text-gray-900">{formData.paymentMethod.toUpperCase()}</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-8">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b-2 border-gray-300">
                    <tr>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">#</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Item Description</th>
                      <th className="text-right p-3 text-sm font-semibold text-gray-700">HSN/SAC</th>
                      <th className="text-right p-3 text-sm font-semibold text-gray-700">Qty</th>
                      <th className="text-right p-3 text-sm font-semibold text-gray-700">Rate</th>
                      <th className="text-right p-3 text-sm font-semibold text-gray-700">GST %</th>
                      <th className="text-right p-3 text-sm font-semibold text-gray-700">Amount</th>
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
                        <tr key={item._id} className="border-b border-gray-200">
                          <td className="p-3 text-sm text-gray-600">{index + 1}</td>
                          <td className="p-3 text-sm text-gray-900">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-gray-500">SKU: {item.sku || 'N/A'}</div>
                          </td>
                          <td className="p-3 text-sm text-gray-600 text-right">-</td>
                          <td className="p-3 text-sm text-gray-600 text-right">{item.quantity} {item.unit}</td>
                          <td className="p-3 text-sm text-gray-600 text-right">
                            <div>₹{item.price.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">Base: ₹{basePrice.toFixed(2)}</div>
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
                        <span className="text-gray-600">Taxable Amount (Base):</span>
                        <span className="font-medium text-gray-900">₹{Math.round(finalPricing.subtotalBeforeGST).toFixed(2)}</span>
                      </div>
                    )}
                    {finalPricing.tax > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">GST Amount:</span>
                        <span className="font-medium text-gray-900">₹{Math.round(finalPricing.tax).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-2">
                      <span className="text-gray-900">Subtotal (Inc. GST):</span>
                      <span className="text-gray-900">₹{finalPricing.subtotal.toFixed(2)}</span>
                    </div>
                    {finalPricing.deliveryCharges > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Delivery Charges:</span>
                        <span className="font-medium text-gray-900">₹{Math.round(finalPricing.deliveryCharges).toFixed(2)}</span>
                      </div>
                    )}
                    {finalPricing.platformFee && finalPricing.platformFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Platform Fee:</span>
                        <span className="font-medium text-gray-900">₹{Math.round(finalPricing.platformFee).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t-2 border-gray-300 pt-2 mt-2">
                      <span className="text-gray-900">Total Amount:</span>
                      <span className="text-gray-900">₹{Math.round(finalPricing.totalAmount).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> This is a sample invoice for preview purposes only. The actual invoice will be generated after order confirmation and will include additional details like invoice number, authorized signature, and official seal.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowInvoice(false)}
                  className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
