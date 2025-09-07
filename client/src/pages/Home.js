import { useQuery } from '@tanstack/react-query';
import React, { useState, useEffect } from 'react';
import { productAPI } from '../services/api';
import { 
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import ProductCard from '../components/products/ProductCard';

const Home = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [showPriceFilter, setShowPriceFilter] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 150); // Reduced debounce time for more responsive search

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

  // Fetch all products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products', selectedCategory, sortBy, debouncedSearchQuery, priceRange],
    queryFn: () => productAPI.getProducts({ 
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      search: debouncedSearchQuery || undefined,
      sortBy: sortBy,
      minPrice: priceRange.min || undefined,
      maxPrice: priceRange.max || undefined
    }),
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
    // Search is handled by the query key change
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar with Categories */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-8">
              <h2 className="text-xl font-bold text-gray-900">Shop Construction Materials</h2>
              <nav className="hidden md:flex space-x-6">
                <button
                  onClick={() => handleCategoryChange('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  All Products
                </button>
                {categoriesData?.map((category) => (
                  <button
                    key={category._id}
                    onClick={() => handleCategoryChange(category._id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategory === category._id
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Search Bar */}
            <div className="flex-1 max-w-xl">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for construction materials..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </form>
            </div>

            {/* Filters and View Options */}
            <div className="flex items-center gap-4">
              {/* Sort Filter */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="name">Sort by Name</option>
                  <option value="price">Sort by Price</option>
                  <option value="createdAt">Sort by Latest</option>
                </select>
                <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>

              {/* Price Filter */}
              <div className="relative price-filter-container">
                <button
                  onClick={() => setShowPriceFilter(!showPriceFilter)}
                  className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium transition-colors ${
                    (priceRange.min || priceRange.max) 
                      ? 'bg-primary-50 border-primary-300 text-primary-700' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <FunnelIcon className="h-4 w-4" />
                  Price Filter
                  {(priceRange.min || priceRange.max) && (
                    <span className="bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full text-xs">
                      ₹{priceRange.min || '0'} - ₹{priceRange.max || '∞'}
                    </span>
                  )}
                </button>
                
                {showPriceFilter && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-10 min-w-[320px]">
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
                        <label className="block text-xs text-gray-600 mb-1">Min Price</label>
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
                        <label className="block text-xs text-gray-600 mb-1">Max Price</label>
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

              {/* View Mode Toggle */}
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <Squares2X2Icon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <ListBulletIcon className="h-5 w-5" />
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {selectedCategory === 'all' ? 'All Products' : categoriesData?.find(cat => cat._id === selectedCategory)?.name || 'Products'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {productsData?.totalProducts || 0} products found
            </p>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {productsLoading ? (
          <div className={`grid gap-6 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
              : 'grid-cols-1'
          }`}>
            {[...Array(12)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className={`bg-gray-200 rounded-xl mb-4 ${
                  viewMode === 'grid' ? 'aspect-square' : 'h-48'
                }`}></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : productsData?.products?.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-gray-400 text-3xl">🔍</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-6">
              No products available in this category
            </p>
          </div>
        ) : (
          <div className={`grid gap-6 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
              : 'grid-cols-1'
          }`}>
            {productsData?.products?.map((product) => (
              <ProductCard 
                key={product._id} 
                product={product} 
                viewMode={viewMode}
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
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
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
    </div>
  );
};

export default Home;
