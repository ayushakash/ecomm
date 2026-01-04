import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MagnifyingGlassIcon, FunnelIcon, ChevronDownIcon, MapPinIcon } from '@heroicons/react/24/outline';
import ProductCard from '../../components/products/ProductCard';
import { productAPI } from '../../services/api';
import { useLocation } from '../../contexts/LocationContext';
import { useAuth } from '../../contexts/AuthContext';
import LocationEducationModal from '../../components/location/LocationEducationModal';
import { Link } from 'react-router-dom';
import SEO from '../../components/SEO/SEO';
import analytics from '../../services/analytics';

const ProductList = () => {
  const { user } = useAuth();
  const { selectedAddress, merchantIds, isLoadingMerchants, locationInfo } = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [sortBy, setSortBy] = useState('latest');
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Show location modal for authenticated users without selected address
  useEffect(() => {
    if (user && !selectedAddress) {
      setShowLocationModal(true);
    }
  }, [user, selectedAddress]);

  // Track search analytics with debounce
  useEffect(() => {
    if (searchTerm && searchTerm.trim().length > 2) {
      const searchTimeout = setTimeout(() => {
        analytics.trackSearch(searchTerm.trim());
      }, 1000); // Wait 1 second after user stops typing

      return () => clearTimeout(searchTimeout);
    }
  }, [searchTerm]);

  const { data: productList, isLoading, error } = useQuery({
    queryKey: ['products', searchTerm, selectedCategory, priceRange, merchantIds],
    queryFn: () => productAPI.getProducts({
      search: searchTerm,
      category: selectedCategory,
      minPrice: priceRange.min,
      maxPrice: priceRange.max,
      merchantIds: merchantIds.length > 0 ? merchantIds : undefined // Filter by nearby merchants
    }),
    enabled: !user || (user && merchantIds.length > 0) || !selectedAddress // Only fetch if we have merchant IDs or user not logged in
  });

  const { data: categorieList } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productAPI.getCategories()
  });

  // Function to sort products based on sortBy value
  const getSortedProducts = (products) => {
    if (!products) return [];
    const sorted = [...products];

    switch(sortBy) {
      case 'price-low':
        return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
      case 'price-high':
        return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
      case 'latest':
      default:
        return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  };

  if (isLoading || isLoadingMerchants) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">{isLoadingMerchants ? 'Finding nearby merchants...' : 'Loading products...'}</p>
      </div>
    );
  }

  // Show message if user is logged in but no address selected
  if (user && !selectedAddress) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12 bg-blue-50 border border-blue-200 rounded-lg">
          <MapPinIcon className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Your Delivery Location</h2>
          <p className="text-gray-600 mb-6">
            Please add a delivery address to see products available in your area
          </p>
          <Link
            to="/profile/addresses"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Address
          </Link>
        </div>
        <LocationEducationModal
          isOpen={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          onAllowLocation={() => {
            setShowLocationModal(false);
            window.location.href = '/profile/addresses';
          }}
          onManualEntry={() => {
            setShowLocationModal(false);
            window.location.href = '/profile/addresses';
          }}
        />
      </div>
    );
  }

  // Show message if no merchants available in the area
  if (user && selectedAddress && merchantIds.length === 0 && !isLoadingMerchants) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12 bg-yellow-50 border border-yellow-200 rounded-lg">
          <MapPinIcon className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Merchants Available</h2>
          <p className="text-gray-600 mb-2">
            Sorry, we don't have any merchants serving <strong>{selectedAddress.area}, {selectedAddress.city}</strong> yet.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Try selecting a different delivery address or check back later
          </p>
          <Link
            to="/profile/addresses"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Change Address
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading products: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SEO
        title="Buy Construction Materials Online in Ranchi | Cement, Steel, Sand, Bricks | Chardeevari"
        description="Buy premium quality construction materials online in Ranchi, Jharkhand. Order cement (ACC, UltraTech), TMT steel bars (Tata, Jindal), M-sand, bricks, aggregates with doorstep delivery. Best prices guaranteed. Shop now at Chardeevari!"
        keywords="buy construction materials Ranchi, cement dealers Ranchi, TMT steel suppliers Jharkhand, M-sand online Ranchi, building materials Ranchi, brick suppliers Ranchi, aggregate dealers Jharkhand, construction material shop near me, cement price Ranchi, steel bars online Jharkhand, building supplies delivery Ranchi, construction materials wholesale Ranchi, ACC cement Ranchi, UltraTech cement dealers, Tata steel TMT bars, Jindal TMT Ranchi, cheap construction materials Ranchi, best building material suppliers Jharkhand, online building materials store, construction materials home delivery, buy cement online India, Chardeevari Ranchi"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Products', path: '/products' }
        ]}
      />
      {/* Location Info Banner */}
      {user && selectedAddress && locationInfo && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <MapPinIcon className="w-5 h-5 text-green-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-green-900">
                  Delivering to {selectedAddress.area}, {selectedAddress.city}
                </p>
                <p className="text-xs text-green-700">
                  {locationInfo.merchantCount} merchants • Products from within {locationInfo.searchRadius}km
                  {locationInfo.fallbackApplied && ' (expanded search)'}
                </p>
              </div>
            </div>
            <Link
              to="/profile/addresses"
              className="text-sm text-green-600 hover:text-green-800 underline"
            >
              Change
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Construction Materials</h1>
        <p className="mt-2 text-gray-600">Find the best quality materials for your construction needs</p>
      </div>

      {/* Filters - Desktop */}
      <div className="hidden md:flex md:justify-between md:items-end gap-3 mb-8">
        {/* Search - Left */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Right Filters - Compact */}
        <div className="flex gap-2 items-end">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {categorieList?.categories?.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          {/* Min Price */}
          <input
            type="number"
            placeholder="Min"
            value={priceRange.min}
            onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
            className="px-3 py-2 text-sm w-20 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {/* Max Price */}
          <input
            type="number"
            placeholder="Max"
            value={priceRange.max}
            onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
            className="px-3 py-2 text-sm w-20 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none pr-8 bg-white"
            >
              <option value="latest">Latest</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
            <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 pointer-events-none text-gray-400" />
          </div>
        </div>
      </div>

      {/* Filters - Mobile */}
      <div className="md:hidden bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-6">
        {/* Mobile Search */}
        <div className="relative mb-3">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Mobile Filters Row */}
        <div className="flex gap-2">
          {/* Mobile Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Categories</option>
            {categorieList?.categories?.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          {/* Mobile Sort Dropdown */}
          <div className="relative flex-1">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none pr-8 bg-white"
            >
              <option value="latest">Latest</option>
              <option value="price-low">Low Price</option>
              <option value="price-high">High Price</option>
            </select>
            <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 pointer-events-none text-gray-400" />
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {productList?.products?.length === 0 ? (
        <div className="text-center py-12">
          <FunnelIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
          <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {getSortedProducts(productList?.products)?.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductList;
