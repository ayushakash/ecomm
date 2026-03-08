// Test data for e-commerce platform

const TEST_OTP = '1234'; // Demo OTP hardcoded in backend

// Customer test data
const CUSTOMER_DATA = {
  name: 'Test Customer',
  phone: '9876543210',
  email: 'customer@test.com',
  otp: TEST_OTP
};

// Merchant test data
const MERCHANT_DATA = {
  contactName: 'Test Merchant',
  contactPhone: '9876543211',
  contactEmail: 'merchant@test.com',
  businessName: 'Test Construction Supplies',
  businessType: 'Wholesale',
  address: '123 Test Street',
  area: 'Test Area',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400001',
  latitude: '19.0760',
  longitude: '72.8777',
  gstNumber: '27AABCT1234A1Z5',
  panNumber: 'AABCT1234A',
  otp: TEST_OTP
};

// Admin test data
const ADMIN_DATA = {
  phone: '9999999999',
  email: 'admin@example.com',
  password: 'admin123456',
  otp: TEST_OTP
};

// Address test data
const ADDRESS_DATA = {
  fullName: 'Test User',
  phoneNumber: '9876543210',
  addressLine1: '123 Test Building',
  addressLine2: 'Near Test Market',
  landmark: 'Opposite Test Park',
  area: 'Andheri',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400053',
  addressType: 'home',
  latitude: '19.1136',
  longitude: '72.8697',
  deliveryInstructions: 'Please call before delivery'
};

// Product test data
const PRODUCT_DATA = {
  name: 'Test Cement Bag',
  description: 'High quality cement for construction',
  category: 'Cement',
  price: 350,
  unit: 'bag',
  gstRate: 18,
  gstType: 'exclusive',
  stock: 100
};

// Search and filter data
const SEARCH_QUERIES = {
  valid: 'cement',
  invalid: 'xyz123nonexistent',
  partial: 'cem'
};

// GPS coordinates for different cities
const GPS_LOCATIONS = {
  mumbai: { latitude: '19.0760', longitude: '72.8777', city: 'Mumbai' },
  delhi: { latitude: '28.7041', longitude: '77.1025', city: 'Delhi' },
  bangalore: { latitude: '12.9716', longitude: '77.5946', city: 'Bangalore' }
};

module.exports = {
  TEST_OTP,
  CUSTOMER_DATA,
  MERCHANT_DATA,
  ADMIN_DATA,
  ADDRESS_DATA,
  PRODUCT_DATA,
  SEARCH_QUERIES,
  GPS_LOCATIONS
};
