import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import { merchantAPI } from '../../services/api';
import {
  ShoppingCartIcon,
  UserIcon,
  ChevronDownIcon,
  MapPinIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const Header = ({ navigation, user, isAuthenticated, cartCount }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { selectedAddress, addresses, setSelectedAddress, selectedCity, fetchMerchantsByCity, requestLocationPermission } = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [locationMenuOpen, setLocationMenuOpen] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [availableCities, setAvailableCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Fetch available cities on component mount
  useEffect(() => {
    const fetchCities = async () => {
      try {
        setLoadingCities(true);
        const response = await merchantAPI.getAvailableCities();
        setAvailableCities(response.cities || []);
      } catch (error) {
        console.error('Error fetching cities:', error);
      } finally {
        setLoadingCities(false);
      }
    };
    fetchCities();
  }, []);

  // Close location dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (locationMenuOpen && !event.target.closest('.location-dropdown-container')) {
        setLocationMenuOpen(false);
        setCitySearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [locationMenuOpen]);

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
  };

  const handleUseCurrentLocation = async () => {
    setDetectingLocation(true);
    try {
      await requestLocationPermission();
      setLocationMenuOpen(false);
    } catch {
      // error already toasted inside requestLocationPermission
    } finally {
      setDetectingLocation(false);
    }
  };

  // Label shown on the location button
  const locationLabel = (() => {
    if (isAuthenticated && selectedAddress) {
      return { top: 'Delivering to', bottom: `${selectedAddress.area}, ${selectedAddress.city}` };
    }
    if (selectedCity) {
      return { top: 'Shopping in', bottom: selectedCity.city };
    }
    return { top: 'Select', bottom: 'Location' };
  })();

  // Show city-picker UI (guest or auth with no addresses)
  const showCityPicker = !isAuthenticated || addresses.length === 0;
  const filteredCities = availableCities.filter(c =>
    c.city.toLowerCase().includes(citySearchQuery.toLowerCase()) ||
    c.state.toLowerCase().includes(citySearchQuery.toLowerCase())
  );

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 min-w-0">
            <Link to="/" className="flex items-center space-x-2 min-w-0">
              <img
                src="/logo.png"
                alt="Logo"
                fetchpriority="high"
                width="40"
                height="40"
                className="h-10 w-auto object-contain flex-shrink-0"
              />
              <span className="text-lg font-bold text-gray-900 hidden sm:inline-block">Chardeevari</span>
            </Link>
          </div>

          {/* Unified Location Dropdown */}
          <div className="flex-1 mx-2 sm:mx-4 max-w-xs min-w-0">
            <div className="relative location-dropdown-container">
              <button
                onClick={() => setLocationMenuOpen(!locationMenuOpen)}
                className="flex items-center space-x-1.5 sm:space-x-2 w-full px-2 sm:px-3 py-2 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200 border border-blue-200"
              >
                <MapPinIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-blue-600 truncate">{locationLabel.top}</div>
                  <div className="text-xs sm:text-sm font-medium text-blue-900 truncate">{locationLabel.bottom}</div>
                </div>
                <ChevronDownIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
              </button>

              {locationMenuOpen && (
                <div className="absolute left-0 right-0 sm:right-auto mt-2 w-full sm:w-80 bg-white rounded-xl shadow-xl ring-1 ring-black ring-opacity-5 z-50 overflow-hidden">

                  {/* Authenticated with saved addresses */}
                  {isAuthenticated && addresses.length > 0 ? (
                    <>
                      <div className="p-3 border-b border-gray-100 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your Addresses</p>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {addresses.map((address) => (
                          <button
                            key={address._id}
                            onClick={() => {
                              setSelectedAddress(address);
                              setLocationMenuOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 transition-colors ${
                              selectedAddress?._id === address._id ? 'bg-blue-50' : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-medium text-gray-900">{address.title}</span>
                                  {address.isDefault && (
                                    <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs font-medium">Default</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5 truncate">
                                  {address.area}, {address.city}
                                </p>
                              </div>
                              {selectedAddress?._id === address._id && (
                                <span className="text-blue-600 text-sm ml-2 flex-shrink-0">✓</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="border-t border-gray-200 p-2">
                        <Link
                          to="/profile/addresses"
                          className="block px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors"
                          onClick={() => setLocationMenuOpen(false)}
                        >
                          + Manage Addresses
                        </Link>
                      </div>
                    </>
                  ) : (
                    /* Guest or auth with no addresses — city picker with current location */
                    <>
                      {/* Use current location */}
                      <div className="p-3 border-b border-gray-100">
                        <button
                          onClick={handleUseCurrentLocation}
                          disabled={detectingLocation}
                          className="flex items-center w-full px-3 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg transition-colors text-sm font-medium gap-2"
                        >
                          {detectingLocation ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
                              Detecting location...
                            </>
                          ) : (
                            <>
                              <MapPinIcon className="h-4 w-4 flex-shrink-0" />
                              Use my current location
                            </>
                          )}
                        </button>
                      </div>

                      {/* City search */}
                      <div className="p-3 border-b border-gray-100 bg-gray-50 sticky top-0">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Or select your city</p>
                        <div className="relative">
                          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search city..."
                            value={citySearchQuery}
                            onChange={(e) => setCitySearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            autoFocus
                          />
                        </div>
                      </div>

                      <div className="max-h-52 overflow-y-auto">
                        {loadingCities ? (
                          <div className="px-4 py-4 text-center text-sm text-gray-500">Loading cities...</div>
                        ) : filteredCities.length === 0 ? (
                          <div className="px-4 py-6 text-center">
                            <MapPinIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">
                              {citySearchQuery ? `No cities match "${citySearchQuery}"` : 'No cities available yet'}
                            </p>
                          </div>
                        ) : (
                          filteredCities.map((city, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                fetchMerchantsByCity(city.city, city.state);
                                setLocationMenuOpen(false);
                                setCitySearchQuery('');
                              }}
                              className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 transition-colors ${
                                selectedCity?.city === city.city ? 'bg-blue-50' : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-sm font-medium text-gray-900">{city.city}</span>
                                  <span className="ml-2 text-xs text-gray-500">{city.state}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-green-600 font-medium">
                                    {city.merchantCount} {city.merchantCount === 1 ? 'store' : 'stores'}
                                  </span>
                                  {selectedCity?.city === city.city && (
                                    <span className="text-blue-600 text-sm">✓</span>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>

                      {!isAuthenticated && (
                        <div className="border-t border-gray-200 p-3">
                          <button
                            onClick={() => { setLocationMenuOpen(false); navigate('/register'); }}
                            className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                          >
                            Register to Start Shopping
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors duration-200"
              >
                {item.name}
              </Link>
            ))}
          </nav>


          {/* Right side - Cart and User */}
          <div className="flex items-center space-x-1 sm:space-x-4">
            {/* Cart - Hidden on mobile */}
            <Link
              to="/cart"
              className="hidden md:flex relative p-2 text-gray-700 hover:text-primary-600 transition-colors duration-200"
            >
              <ShoppingCartIcon className="h-6 w-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>

            {/* User Menu */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-1 sm:space-x-2 p-1.5 sm:p-2 text-gray-700 hover:text-primary-600 transition-colors duration-200"
                >
                  <UserIcon className="h-6 w-6" />
                  <span className="hidden sm:block text-sm font-medium">
                    {user?.name}
                  </span>
                  <ChevronDownIcon className="h-4 w-4" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Profile
                      </Link>
                      <Link
                        to="/profile/addresses"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        My Addresses
                      </Link>
                      <Link
                        to="/profile/orders"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Orders
                      </Link>
                      <Link
                        to="/contact"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Contact Us
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-t border-gray-200"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Mobile: Icon only */}
                <Link
                  to="/login"
                  className="md:hidden p-2 text-gray-700 hover:text-primary-600 transition-colors duration-200"
                  title="Login"
                >
                  <UserIcon className="h-6 w-6" />
                </Link>

                {/* Desktop: Text buttons */}
                <div className="hidden md:flex items-center space-x-2">
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors duration-200"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors duration-200"
                  >
                    Register
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

    </header>
  );
};

export default Header;
