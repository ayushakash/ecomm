import React, { useState, useEffect } from 'react';
import { PageSpinner } from '../../components/ui/Spinner';
import { useQuery } from '@tanstack/react-query';
import {
  MagnifyingGlassIcon, FunnelIcon, ChevronDownIcon,
  MapPinIcon, ArrowPathIcon
} from '@heroicons/react/24/outline';
import ProductCard from '../../components/products/ProductCard';
import ProductCardSkeleton from '../../components/products/ProductCardSkeleton';
import { productAPI, merchantAPI } from '../../services/api';
import { useLocation } from '../../contexts/LocationContext';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import SEO from '../../components/SEO/SEO';
import analytics from '../../services/analytics';
import { useTranslation, Trans } from 'react-i18next';

// ─── Shown to logged-in users with no saved address ──────────────────────────

const NoAddressScreen = ({ requestLocationPermission }) => {
  const { t } = useTranslation('products');
  const [detecting, setDetecting] = useState(false);

  const handleDetect = async () => {
    setDetecting(true);
    try {
      await requestLocationPermission();
    } catch {
      // error already toasted
    } finally {
      setDetecting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="bg-primary-50 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-6">
        <MapPinIcon className="h-10 w-10 text-primary-700" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">{t('location.noAddress.title')}</h2>
      <p className="text-gray-500 text-sm mb-8">
        {t('location.noAddress.subtitle')}
      </p>

      <Link
        to="/profile/addresses"
        className="flex items-center justify-center gap-2 w-full bg-primary-700 hover:bg-primary-800 text-white px-4 py-3 rounded-lg font-medium text-sm transition-colors mb-3"
      >
        {t('location.noAddress.addAddress')}
      </Link>

      <button
        onClick={handleDetect}
        disabled={detecting}
        className="flex items-center justify-center gap-2 w-full border border-gray-300 hover:bg-gray-50 disabled:opacity-60 text-gray-700 px-4 py-3 rounded-lg font-medium text-sm transition-colors"
      >
        {detecting ? (
          <><ArrowPathIcon className="h-4 w-4 animate-spin" /> {t('location.detecting')}</>
        ) : (
          <><MapPinIcon className="h-4 w-4" /> {t('location.noAddress.useCurrent')}</>
        )}
      </button>
    </div>
  );
};

// ─── Inline city picker shown to guests with no city selected ────────────────

const CitySelectorScreen = ({ fetchMerchantsByCity, requestLocationPermission }) => {
  const [availableCities, setAvailableCities] = useState([]);
  const [citySearch, setCitySearch] = useState('');
  const [loadingCities, setLoadingCities] = useState(true);
  const { t } = useTranslation('products');
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    merchantAPI.getAvailableCities()
      .then(r => setAvailableCities(r.cities || []))
      .finally(() => setLoadingCities(false));
  }, []);

  const filtered = availableCities.filter(c =>
    c.city.toLowerCase().includes(citySearch.toLowerCase()) ||
    c.state.toLowerCase().includes(citySearch.toLowerCase())
  );

  const handleDetect = async () => {
    setDetecting(true);
    try {
      await requestLocationPermission();
    } catch {
      // error already toasted
    } finally {
      setDetecting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="bg-primary-50 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-6">
        <MapPinIcon className="h-10 w-10 text-primary-700" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('location.citySelector.title')}</h2>
      <p className="text-gray-500 text-sm mb-8">
        {t('location.citySelector.subtitle')}
      </p>

      {/* Detect location */}
      <button
        onClick={handleDetect}
        disabled={detecting}
        className="flex items-center justify-center gap-2 w-full bg-primary-700 hover:bg-primary-800 disabled:opacity-60 text-white px-4 py-3 rounded-lg font-medium text-sm transition-colors mb-6"
      >
        {detecting ? (
          <><ArrowPathIcon className="h-4 w-4 animate-spin" /> {t('location.detecting')}</>
        ) : (
          <><MapPinIcon className="h-4 w-4" /> {t('location.citySelector.useMyLocation')}</>
        )}
      </button>

      <div className="flex items-center gap-3 mb-4">
        <hr className="flex-1 border-gray-200" />
        <span className="text-xs text-gray-400">{t('location.citySelector.orPickCity')}</span>
        <hr className="flex-1 border-gray-200" />
      </div>

      {/* City search */}
      <div className="relative mb-3">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder={t('location.citySelector.searchPlaceholder')}
          value={citySearch}
          onChange={e => setCitySearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* City list */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden text-left">
        {loadingCities ? (
          <div className="py-8 text-center text-sm text-gray-400">{t('location.citySelector.loadingCities')}</div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">
            {citySearch ? t('location.citySelector.noMatch', { query: citySearch }) : t('location.citySelector.noCities')}
          </div>
        ) : (
          filtered.map((city, i) => (
            <button
              key={i}
              onClick={() => fetchMerchantsByCity(city.city, city.state)}
              className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-primary-50 transition-colors"
            >
              <div>
                <span className="text-sm font-medium text-gray-900">{city.city}</span>
                <span className="ml-2 text-xs text-gray-500">{city.state}</span>
              </div>
              <span className="text-xs text-green-600 font-medium">
                {t('location.citySelector.storeCount', { count: city.merchantCount })}
              </span>
            </button>
          ))
        )}
      </div>

      <p className="mt-8 text-xs text-gray-400">
        <Trans
          t={t}
          i18nKey="location.citySelector.registerPrompt"
          components={{
            reg: <Link to="/register" className="text-primary-700 font-medium" />,
            login: <Link to="/login" className="text-primary-700 font-medium" />,
          }}
        />
      </p>
    </div>
  );
};

// ─── Main ProductList ─────────────────────────────────────────────────────────

const ProductList = () => {
  const { t } = useTranslation('products');
  const { user, loading: authLoading } = useAuth();
  const {
    selectedAddress, merchantIds,
    selectedCity, cityMerchantIds,
    isLoadingMerchants, locationInfo,
    fetchMerchantsByCity, requestLocationPermission,
  } = useLocation();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [sortBy, setSortBy] = useState('latest');

  // Track search analytics with debounce
  useEffect(() => {
    if (searchTerm && searchTerm.trim().length > 2) {
      const timer = setTimeout(() => analytics.trackSearch(searchTerm.trim()), 1000);
      return () => clearTimeout(timer);
    }
  }, [searchTerm]);

  // Address-based takes priority; fall back to city-based (used when auth user has no address but used GPS)
  const effectiveMerchantIds = merchantIds.length > 0 ? merchantIds : cityMerchantIds;

  const { data: productList, isLoading, error } = useQuery({
    queryKey: ['products', searchTerm, selectedCategory, priceRange, effectiveMerchantIds],
    queryFn: () => productAPI.getProducts({
      search: searchTerm,
      category: selectedCategory,
      minPrice: priceRange.min,
      maxPrice: priceRange.max,
      merchantIds: effectiveMerchantIds.length > 0 ? effectiveMerchantIds : undefined,
    }),
    enabled: effectiveMerchantIds.length > 0,
  });

  const { data: categorieList } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productAPI.getCategories()
  });

  const getSortedProducts = (products) => {
    if (!products) return [];
    const sorted = [...products];
    switch (sortBy) {
      case 'price-low': return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
      case 'price-high': return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
      default: return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  };

  // Loading state — also covers the window while auth resolves and the guest
  // default city (Ranchi — see DEFAULT_GUEST_CITY in LocationContext.js) is
  // being applied. Guests must NEVER flash the city-picker wall on landing.
  if (isLoadingMerchants || authLoading) {
    return (
      <div className="flex flex-col justify-center items-center py-16">
        <PageSpinner />
        <p className="mt-2 text-sm text-gray-400">{t('location.findingMerchants')}</p>
      </div>
    );
  }

  // FALLBACK ONLY: guests normally have Ranchi auto-applied by LocationContext
  // (DEFAULT_GUEST_CITY), so this picker appears only if that fetch failed or
  // the user explicitly cleared their city. It must never be the landing UX.
  if (!user && !selectedCity) {
    return (
      <CitySelectorScreen
        fetchMerchantsByCity={fetchMerchantsByCity}
        requestLocationPermission={requestLocationPermission}
      />
    );
  }

  // Auth user with no address — prompt to add address (with GPS browse option)
  if (user && !selectedAddress && cityMerchantIds.length === 0) {
    return <NoAddressScreen requestLocationPermission={requestLocationPermission} />;
  }

  // Auth user has address but no merchants in area
  if (user && selectedAddress && merchantIds.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-amber-50 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-6">
          <MapPinIcon className="h-10 w-10 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t('location.noMerchants.title')}</h2>
        <p className="text-gray-500 text-sm mb-2">
          <Trans
            t={t}
            i18nKey="location.noMerchants.body"
            values={{ area: selectedAddress.area, city: selectedAddress.city }}
            components={{ b: <strong /> }}
          />
        </p>
        <p className="text-gray-400 text-xs mb-6">{t('location.noMerchants.hint')}</p>
        <Link
          to="/profile/addresses"
          className="inline-block bg-primary-700 text-white px-6 py-3 rounded-lg hover:bg-primary-800 transition-colors font-medium"
        >
          {t('location.noMerchants.changeAddress')}
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-3 sm:gap-6 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{t('list.error', { message: error.message })}</p>
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

      {/* Nudge logged-in user with no saved address to add one */}
      {user && !selectedAddress && selectedCity && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between gap-3">
          <p className="text-sm text-amber-800">
            <Trans
              t={t}
              i18nKey="list.browsingIn"
              values={{ city: selectedCity.city }}
              components={{ b: <strong /> }}
            />
          </p>
          <Link
            to="/profile/addresses"
            className="text-xs font-medium text-amber-700 hover:text-amber-900 underline whitespace-nowrap"
          >
            {t('list.addAddress')}
          </Link>
        </div>
      )}

      {/* Location info banner */}
      {locationInfo && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPinIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
              <div>
                {user && selectedAddress ? (
                  <>
                    <p className="text-sm font-medium text-green-900">
                      {t('list.deliveringTo', { area: selectedAddress.area, city: selectedAddress.city })}
                    </p>
                    <p className="text-xs text-green-700">
                      {t('list.merchantsWithin', { count: locationInfo.merchantCount, radius: locationInfo.searchRadius })}
                      {locationInfo.fallbackApplied && ` ${t('list.expandedSearch')}`}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-green-900">
                      {t('list.showingIn', { city: selectedCity?.city })}
                    </p>
                    <p className="text-xs text-green-700">
                      <Trans
                        t={t}
                        i18nKey="list.merchantsAvailable"
                        count={locationInfo.merchantCount}
                        values={{ count: locationInfo.merchantCount }}
                        components={{ reg: <Link to="/register" className="underline" /> }}
                      />
                    </p>
                  </>
                )}
              </div>
            </div>
            {user ? (
              <Link to="/profile/addresses" className="text-xs text-green-600 hover:text-green-800 underline">
                {t('list.change')}
              </Link>
            ) : (
              <button
                onClick={() => {/* header handles this */}}
                className="text-xs text-green-600 hover:text-green-800 underline"
              >
                {t('list.changeCity')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('list.title')}</h1>
        <p className="mt-2 text-gray-600">{t('list.subtitle')}</p>
      </div>

      {/* Filters - Desktop */}
      <div className="hidden md:flex md:justify-between md:items-end gap-3 mb-8">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('list.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2 items-end">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">{t('list.allCategories')}</option>
            {categorieList?.categories?.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <input
            type="number"
            placeholder={t('list.min')}
            value={priceRange.min}
            onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
            className="px-3 py-2 text-sm w-20 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <input
            type="number"
            placeholder={t('list.max')}
            value={priceRange.max}
            onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
            className="px-3 py-2 text-sm w-20 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none pr-8 bg-white"
            >
              <option value="latest">{t('list.sort.latest')}</option>
              <option value="price-low">{t('list.sort.priceLowHigh')}</option>
              <option value="price-high">{t('list.sort.priceHighLow')}</option>
            </select>
            <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 pointer-events-none text-gray-400" />
          </div>
        </div>
      </div>

      {/* Filters - Mobile */}
      <div className="md:hidden bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-6">
        <div className="relative mb-3">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('list.searchShort')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">{t('list.categories')}</option>
            {categorieList?.categories?.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <div className="relative flex-1">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none pr-8 bg-white"
            >
              <option value="latest">{t('list.sort.latest')}</option>
              <option value="price-low">{t('list.sort.lowPrice')}</option>
              <option value="price-high">{t('list.sort.highPrice')}</option>
            </select>
            <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 pointer-events-none text-gray-400" />
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {productList?.products?.length === 0 ? (
        <div className="text-center py-12">
          <FunnelIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">{t('list.empty.title')}</h3>
          <p className="mt-1 text-sm text-gray-500">{t('list.empty.subtitle')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {getSortedProducts(productList?.products)?.map((product, index) => (
            <ProductCard key={product._id} product={product} priority={index === 0} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductList;
