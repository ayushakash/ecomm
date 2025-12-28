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
  const { selectedAddress, addresses, setSelectedAddress, locationInfo, selectedCity, fetchMerchantsByCity, clearSelectedCity } = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [locationMenuOpen, setLocationMenuOpen] = useState(false);
  const [citySearchOpen, setCitySearchOpen] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [availableCities, setAvailableCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);

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

  // Close city search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (citySearchOpen && !event.target.closest('.city-search-container')) {
        setCitySearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [citySearchOpen]);

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
  };

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
                className="h-10 w-auto object-contain flex-shrink-0"
              />
              <span className="text-lg font-bold text-gray-900 hidden sm:inline-block">Chardeevari</span>
            </Link>
          </div>

          {/* City Availability Checker - Show for guest users (non-authenticated) */}
          {!isAuthenticated && (
            <div className="flex-1 mx-2 sm:mx-4 max-w-xs">
              <div className="relative city-search-container">
                <button
                  onClick={() => setCitySearchOpen(!citySearchOpen)}
                  className="flex items-center space-x-1.5 sm:space-x-2 w-full px-2 sm:px-3 py-2 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200 border border-blue-200"
                >
                  <MapPinIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    {selectedCity ? (
                      <>
                        <div className="text-xs text-blue-600 truncate">Shopping in</div>
                        <div className="text-xs sm:text-sm font-medium text-blue-900 truncate">
                          {selectedCity.city}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-xs text-blue-600 truncate hidden sm:block">Check if we deliver to</div>
                        <div className="text-xs sm:text-sm font-medium text-blue-900 truncate">
                          <span className="hidden sm:inline">Your City</span>
                          <span className="sm:hidden">Select City</span>
                        </div>
                      </>
                    )}
                  </div>
                  <ChevronDownIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
                </button>

                {citySearchOpen && (
                  <div className="absolute left-0 right-0 sm:right-auto mt-2 w-full sm:w-80 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50 max-h-96 overflow-y-auto">
                    <div className="p-3 border-b border-gray-200 sticky top-0 bg-white z-10">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">We Deliver To These Cities</h3>
                      <p className="text-xs text-gray-500 mb-2">Check if your city is available</p>
                      <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
                    <div className="py-1">
                      {loadingCities ? (
                        <div className="px-4 py-3 text-center text-sm text-gray-500">
                          Loading cities...
                        </div>
                      ) : availableCities.length === 0 ? (
                        <div className="px-4 py-3 text-center text-sm text-gray-500">
                          No cities available yet
                        </div>
                      ) : (
                        <>
                          {availableCities
                            .filter(city =>
                              city.city.toLowerCase().includes(citySearchQuery.toLowerCase()) ||
                              city.state.toLowerCase().includes(citySearchQuery.toLowerCase())
                            )
                            .map((city, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  fetchMerchantsByCity(city.city, city.state);
                                  setCitySearchOpen(false);
                                  setCitySearchQuery('');
                                }}
                                className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 transition-colors ${
                                  selectedCity?.city === city.city ? 'bg-blue-50' : 'hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center">
                                      <span className="text-sm font-medium text-gray-900">{city.city}</span>
                                      <span className="ml-2 text-xs text-gray-500">{city.state}</span>
                                      {selectedCity?.city === city.city && (
                                        <span className="ml-2 text-blue-600 text-xs">✓</span>
                                      )}
                                    </div>
                                    <p className="text-xs text-green-600 mt-1 flex items-center">
                                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
                                      {city.merchantCount} {city.merchantCount === 1 ? 'merchant' : 'merchants'} serving
                                    </p>
                                  </div>
                                </div>
                              </button>
                            ))}
                          <div className="border-t border-gray-200 p-3 bg-gray-50">
                            <button
                              onClick={() => {
                                setCitySearchOpen(false);
                                navigate('/register');
                              }}
                              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                              Register to Start Shopping
                            </button>
                          </div>
                        </>
                      )}
                      {citySearchQuery && availableCities.filter(city =>
                        city.city.toLowerCase().includes(citySearchQuery.toLowerCase()) ||
                        city.state.toLowerCase().includes(citySearchQuery.toLowerCase())
                      ).length === 0 && !loadingCities && (
                        <div className="px-4 py-8 text-center">
                          <MapPinIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-600 mb-1">
                            No cities found matching "{citySearchQuery}"
                          </p>
                          <p className="text-xs text-gray-500">
                            We're expanding to new cities soon!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Location Switcher - Desktop & Mobile (Only for authenticated users) */}
          {isAuthenticated && addresses.length > 0 && (
            <div className="flex-1 mx-4 max-w-xs">
              <div className="relative">
                <button
                  onClick={() => setLocationMenuOpen(!locationMenuOpen)}
                  className="flex items-center space-x-2 w-full px-3 py-2 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200 border border-gray-200"
                >
                  <MapPinIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 truncate">Delivering to</div>
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {selectedAddress ? selectedAddress.area + ', ' + selectedAddress.city : 'Select Address'}
                    </div>
                  </div>
                  <ChevronDownIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </button>

                {locationMenuOpen && (
                  <div className="absolute left-0 mt-2 w-80 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50 max-h-96 overflow-y-auto">
                    <div className="p-3 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900">Select Delivery Location</h3>
                      {locationInfo && (
                        <p className="text-xs text-gray-500 mt-1">
                          {locationInfo.merchantCount} merchants available
                        </p>
                      )}
                    </div>
                    <div className="py-1">
                      {addresses.map((address) => (
                        <button
                          key={address._id}
                          onClick={() => {
                            setSelectedAddress(address);
                            setLocationMenuOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                            selectedAddress?._id === address._id ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex items-start">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center">
                                <span className="text-sm font-medium text-gray-900">{address.title}</span>
                                {address.isDefault && (
                                  <span className="ml-2 bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">
                                    Default
                                  </span>
                                )}
                                {selectedAddress?._id === address._id && (
                                  <span className="ml-2 text-blue-600">✓</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mt-1 truncate">
                                {address.addressLine1}, {address.area}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {address.city}, {address.state} - {address.pincode}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                      <div className="border-t border-gray-200 mt-1">
                        <Link
                          to="/profile/addresses"
                          className="block px-4 py-2 text-sm text-blue-600 hover:bg-gray-50"
                          onClick={() => setLocationMenuOpen(false)}
                        >
                          + Add New Address
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

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
          <div className="flex items-center space-x-4">
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
                  className="flex items-center space-x-2 p-2 text-gray-700 hover:text-primary-600 transition-colors duration-200"
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
