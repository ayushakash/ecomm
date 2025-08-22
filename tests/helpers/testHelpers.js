const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const User = require('../../models/User');
const Merchant = require('../../models/Merchant');
const Product = require('../../models/Product');
const Order = require('../../models/Order');

// Generate JWT token for testing
const generateToken = (userId, role = 'customer') => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'test-secret-key',
    { expiresIn: '1h' }
  );
};

// Generate refresh token for testing
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-key',
    { expiresIn: '7d' }
  );
};

// Create test user
const createTestUser = async (userData = {}) => {
  const defaultUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    role: 'customer',
    area: 'Test Area',
    phone: '1234567890',
    address: 'Test Address'
  };

  const user = new User({ ...defaultUser, ...userData });
  await user.save();
  return user;
};

// Create test merchant
const createTestMerchant = async (merchantData = {}) => {
  const user = await createTestUser({ role: 'merchant', ...merchantData.userData });
  
  const defaultMerchant = {
    userId: user._id,
    name: 'Test Merchant',
    contact: '1234567890',
    area: 'Test Area',
    address: 'Test Address',
    businessType: 'Hardware Store',
    activeStatus: 'active'
  };

  const merchant = new Merchant({ ...defaultMerchant, ...merchantData });
  await merchant.save();
  return { user, merchant };
};

// Create test product
const createTestProduct = async (productData = {}) => {
  const { user, merchant } = await createTestMerchant();
  
  const defaultProduct = {
    name: 'Test Cement',
    description: 'High quality cement for construction',
    category: 'Cement',
    price: 350,
    unit: 'bag',
    stock: 100,
    merchantId: merchant._id,
    enabled: true,
    images: ['test-image.jpg'],
    specifications: { weight: '50kg', brand: 'Test Brand' },
    tags: ['cement', 'construction'],
    rating: 4.5,
    minOrderQuantity: 1,
    deliveryTime: '2-3 days'
  };

  const product = new Product({ ...defaultProduct, ...productData });
  await product.save();
  return { user, merchant, product };
};

// Create test order
const createTestOrder = async (orderData = {}) => {
  const { user, merchant, product } = await createTestProduct();
  
  const defaultOrder = {
    customerId: user._id,
    customerName: user.name,
    customerPhone: user.phone,
    customerAddress: user.address,
    customerArea: user.area,
    items: [{
      productId: product._id,
      name: product.name,
      price: product.price,
      quantity: 2,
      unit: product.unit
    }],
    subtotal: 700,
    tax: 70,
    deliveryCharge: 50,
    totalAmount: 820,
    status: 'pending',
    assignedMerchantId: merchant._id,
    paymentStatus: 'pending',
    paymentMethod: 'cod',
    deliveryInstructions: 'Handle with care'
  };

  const order = new Order({ ...defaultOrder, ...orderData });
  await order.save();
  return { user, merchant, product, order };
};

// Login helper
const loginUser = async (app, userData = {}) => {
  const user = await createTestUser(userData);
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      email: user.email,
      password: userData.password || 'password123'
    });
  
  return {
    user,
    token: response.body.accessToken,
    refreshToken: response.body.refreshToken
  };
};

// Admin login helper
const loginAdmin = async (app) => {
  const admin = await createTestUser({
    email: 'admin@example.com',
    role: 'admin'
  });
  
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      email: admin.email,
      password: 'password123'
    });
  
  return {
    user: admin,
    token: response.body.accessToken,
    refreshToken: response.body.refreshToken
  };
};

// Merchant login helper
const loginMerchant = async (app) => {
  const { user, merchant } = await createTestMerchant();
  
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      email: user.email,
      password: 'password123'
    });
  
  return {
    user,
    merchant,
    token: response.body.accessToken,
    refreshToken: response.body.refreshToken
  };
};

module.exports = {
  generateToken,
  generateRefreshToken,
  createTestUser,
  createTestMerchant,
  createTestProduct,
  createTestOrder,
  loginUser,
  loginAdmin,
  loginMerchant
};
