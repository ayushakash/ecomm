import { useQuery } from '@tanstack/react-query';
import React, { useState, useEffect, useRef } from 'react';
import { productAPI } from '../services/api';
import {
  FunnelIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import ProductCard from '../components/products/ProductCard';
import { useLocation } from '../contexts/LocationContext';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO/SEO';
import { useBulkWhatsApp } from '../hooks/useBulkWhatsApp';

const Home = () => {
  const { user } = useAuth();
  const { number: bulkPhone } = useBulkWhatsApp();
  const { selectedAddress, merchantIds, isLoadingMerchants, locationInfo, selectedCity, cityMerchantIds, addresses, setSelectedAddress, requestLocationPermission } = useLocation();
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const categoryScrollRef = useRef(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close price filter when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showPriceFilter && !event.target.closest('.price-filter-container')) {
        setShowPriceFilter(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPriceFilter]);

  // Determine which merchant IDs to use for filtering
  const activeMerchantIds = merchantIds.length > 0
    ? merchantIds        // Logged-in user with address: address-based merchants
    : cityMerchantIds.length > 0
      ? cityMerchantIds  // City selected (guest or logged-in with no address): city merchants
      : undefined;       // No location set — no filter, show all

  // Fetch all products - with location filtering for logged-in users or city filtering for guests
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products', selectedCategory, sortBy, debouncedSearchQuery, priceRange, merchantIds, cityMerchantIds],
    queryFn: () => productAPI.getProducts({
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      search: debouncedSearchQuery || undefined,
      sortBy: sortBy,
      minPrice: priceRange.min || undefined,
      maxPrice: priceRange.max || undefined,
      merchantIds: activeMerchantIds
    }),
    enabled: true, // Always fetch; activeMerchantIds handles filtering
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    refetchOnReconnect: false,
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productAPI.getCategories(),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    refetchOnReconnect: false,
  });

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  const handleSearch = (e) => {
    e.preventDefault();
  };

  const scrollCategories = (direction) => {
    if (categoryScrollRef.current) {
      const scrollAmount = 300;
      if (direction === 'left') {
        categoryScrollRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        categoryScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title="Chardeevari - Buy Construction Materials Online in Ranchi, Jharkhand"
        description="Best online store for construction materials in Ranchi. Buy cement, sand, bricks, TMT bars, aggregates with doorstep delivery. Quality products at competitive prices."
        keywords="construction materials Ranchi, buy cement online Ranchi, building materials Jharkhand, M-Sand Ranchi, TMT bars online, bricks delivery Ranchi, construction supplies Ranchi, aggregates Jharkhand"
        breadcrumbs={[
          { name: 'Home', path: '/' }
        ]}
      />
      {/* Hero Banner */}
      <div className="bg-primary-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">Welcome to Chardeevari</h1>
            <p className="text-gray-100 text-sm sm:text-base mb-6">Find the best construction materials from verified merchants</p>

          </div>
        </div>
      </div>

      {/* Search Bar & Filter - Combined in one line */}
      <div className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search materials..."
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </form>

            {/* Price Filter */}
            <div className="relative price-filter-container">
              <button
                onClick={() => setShowPriceFilter(!showPriceFilter)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                  (priceRange.min || priceRange.max)
                    ? 'bg-primary-50 border border-primary-300 text-primary-700'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FunnelIcon className="h-5 w-5" />
                <span className="hidden sm:inline">Filter</span>
                {(priceRange.min || priceRange.max) && (
                  <span className="hidden sm:inline bg-primary-100 text-primary-800 px-2 py-0.5 rounded text-xs">
                    ₹{priceRange.min || '0'} - ₹{priceRange.max || '∞'}
                  </span>
                )}
              </button>

              {showPriceFilter && (
                <div className="absolute top-full right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-10 min-w-[320px]">
                  <h4 className="font-medium text-gray-900 mb-3">Price Range</h4>

                  {/* Preset Price Ranges */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[
                      { label: 'Under ₹500', min: '', max: '500' },
                      { label: '₹500 - ₹1000', min: '500', max: '1000' },
                      { label: '₹1000 - ₹5000', min: '1000', max: '5000' },
                      { label: 'Above ₹5000', min: '5000', max: '' }
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => setPriceRange({ min: preset.min, max: preset.max })}
                        className={`px-3 py-2 text-xs border rounded-lg transition-colors ${
                          priceRange.min === preset.min && priceRange.max === preset.max
                            ? 'bg-primary-100 border-primary-300 text-primary-700'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom Range Inputs */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">Min</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div className="text-gray-500 mt-6">-</div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">Max</label>
                      <input
                        type="number"
                        placeholder="∞"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setPriceRange({ min: '', max: '' });
                        setShowPriceFilter(false);
                      }}
                      className="flex-1 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setShowPriceFilter(false)}
                      className="flex-1 px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Show message if user is logged in but no address and no city selected */}
      {user && !selectedAddress && !selectedCity && (
        <div className="bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Icon + Text */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner">
                  <MapPinIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white text-base leading-tight">Select Your Delivery Location</p>
                  <p className="text-sm text-primary-100 mt-0.5">Add an address to see products available in your area</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  onClick={async () => {
                    setDetectingLocation(true);
                    try { await requestLocationPermission(); } catch {}
                    finally { setDetectingLocation(false); }
                  }}
                  disabled={detectingLocation}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 border border-white/30 text-white px-4 py-2.5 rounded-xl transition-all text-sm font-medium whitespace-nowrap disabled:opacity-60 backdrop-blur-sm"
                >
                  {detectingLocation ? (
                    <><ArrowPathIcon className="h-4 w-4 animate-spin" /> Detecting...</>
                  ) : (
                    <><ArrowPathIcon className="h-4 w-4" /> Use Current Location</>
                  )}
                </button>
                <Link
                  to="/profile/addresses"
                  className="flex-1 sm:flex-none flex items-center justify-center bg-white text-primary-700 font-semibold px-4 py-2.5 rounded-xl hover:bg-primary-50 transition-all text-sm whitespace-nowrap shadow-md hover:shadow-lg"
                >
                  Add Address
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show message if address selected but no merchants available */}
      {user && selectedAddress && merchantIds.length === 0 && !isLoadingMerchants && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between flex-col sm:flex-row gap-3">
                <div className="flex items-center">
                  <MapPinIcon className="w-6 h-6 text-yellow-600 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">
                      No Merchants Available in {selectedAddress.area}, {selectedAddress.city}
                    </p>
                    <p className="text-xs text-yellow-700">
                      Try selecting a different delivery address or check back later
                    </p>
                  </div>
                </div>
                {addresses.length > 1 ? (
                  <button
                    onClick={() => setShowAddressModal(true)}
                    className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium whitespace-nowrap"
                  >
                    Change Address
                  </button>
                ) : (
                  <Link
                    to="/profile/addresses"
                    className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium whitespace-nowrap"
                  >
                    Add New Address
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Categories Section - Mobile Optimized */}
      <div className="bg-white border-b border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Categories</h2>
            <div className="flex gap-2 md:hidden">
              <button
                onClick={() => scrollCategories('left')}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4 text-gray-600" />
              </button>
              <button
                onClick={() => scrollCategories('right')}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRightIcon className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Categories Scroll Container */}
          <div className="relative">
            <div
              ref={categoryScrollRef}
              className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
              style={{ scrollBehavior: 'smooth' }}
            >
              {/* All Products */}
              <button
                onClick={() => handleCategoryChange('all')}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-shrink-0 whitespace-nowrap ${
                  selectedCategory === 'all'
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Products
              </button>

              {/* Category Buttons */}
              {categoriesData?.map((category) => (
                <button
                  key={category._id}
                  onClick={() => handleCategoryChange(category._id)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-shrink-0 whitespace-nowrap ${
                    selectedCategory === category._id
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>


      {/* Results Summary */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {selectedCategory === 'all' ? 'All Products' : categoriesData?.find(cat => cat._id === selectedCategory)?.name || 'Products'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {productsData?.totalProducts || 0} products found
          </p>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {productsLoading || isLoadingMerchants ? (
          <div className="grid gap-3 sm:gap-6 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(12)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="bg-gray-200 rounded-xl mb-4 aspect-square"></div>
                <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded mb-3 w-1/2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        ) : productsData?.products?.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-gray-400 text-3xl">🔍</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-6">
              No products available in this category
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-6 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {productsData?.products?.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                viewMode="grid"
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {productsData?.totalPages > 1 && (
          <div className="flex justify-center mt-12">
            <div className="flex items-center space-x-2">
              {[...Array(productsData.totalPages)].map((_, index) => (
                <button
                  key={index}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    index + 1 === (productsData.currentPage || 1)
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Address Selection Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-primary-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Select Delivery Address</h2>
                <button
                  onClick={() => setShowAddressModal(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-gray-100 text-sm mt-1">
                Choose an address to see available merchants and products
              </p>
            </div>

            {/* Addresses List */}
            <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6">
              <div className="space-y-3">
                {addresses.filter(addr => addr._id !== selectedAddress?._id).map((address) => (
                  <button
                    key={address._id}
                    onClick={() => {
                      setSelectedAddress(address);
                      setShowAddressModal(false);
                    }}
                    className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPinIcon className="w-5 h-5 text-primary-600 flex-shrink-0" />
                          <span className="text-base font-semibold text-gray-900">{address.title}</span>
                          {address.isDefault && (
                            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-medium">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mb-1">
                          {address.addressLine1}
                          {address.addressLine2 && `, ${address.addressLine2}`}
                        </p>
                        <p className="text-sm text-gray-600">
                          {address.area}, {address.city}, {address.state} - {address.pincode}
                        </p>
                        {address.phoneNumber && (
                          <p className="text-sm text-gray-500 mt-1">
                            📞 {address.phoneNumber}
                          </p>
                        )}
                      </div>
                      <div className="ml-3 flex-shrink-0">
                        <div className="w-8 h-8 rounded-full border-2 border-gray-300 group-hover:border-primary-600 group-hover:bg-primary-600 flex items-center justify-center transition-all">
                          <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}

                {addresses.length <= 1 && (
                  <div className="text-center py-8">
                    <MapPinIcon className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 mb-4">You don't have any other saved addresses</p>
                    <Link
                      to="/profile/addresses"
                      className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                      onClick={() => setShowAddressModal(false)}
                    >
                      Add New Address
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <div className="flex items-center justify-between gap-3">
                <Link
                  to="/profile/addresses"
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  onClick={() => setShowAddressModal(false)}
                >
                  Manage Addresses
                </Link>
                <button
                  onClick={() => setShowAddressModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating WhatsApp Bulk Order Button */}
      {bulkPhone && (
        <a
          href={`https://wa.me/${bulkPhone}?text=${encodeURIComponent('Hi, I want to place a bulk order for construction materials.\nPlease share the pricing and availability.')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-20 md:bottom-6 right-6 z-50 flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white pl-4 pr-5 py-3 rounded-full shadow-xl transition-all duration-200 hover:shadow-2xl hover:scale-105"
        >
          <svg className="w-5 h-5 fill-current flex-shrink-0" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <span className="text-sm font-semibold">Bulk Order</span>
        </a>
      )}
    </div>
  );
};

export default Home;
