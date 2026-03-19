/**
 * Test fixtures for order pricing and payout tests.
 * Creates the minimum DB state needed for each scenario.
 */

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const Merchant = require('../../models/Merchant');
const Product = require('../../models/Product');
const MerchantProduct = require('../../models/MerchantProduct');
const Address = require('../../models/Address');
const AppSettings = require('../../models/AppSettings');
const Category = require('../../models/Category');

const generateToken = (userId, role) =>
  jwt.sign({ userId, role }, process.env.JWT_SECRET || 'test-secret-key', { expiresIn: '1h' });

// ─── App Settings ──────────────────────────────────────────────────────────────

async function setGSTMode(gstMode) {
  await AppSettings.findOneAndUpdate(
    {},
    {
      $set: {
        gstMode,
        splitGSTEnabled: true,
        priceDisplayMode: 'admin',
        platformFeeRate: 0.0236, // 2.36%
        'deliveryConfig.type': 'fixed',
        'deliveryConfig.fixedCharge': 0,
        minimumOrderValue: 100,
      }
    },
    { upsert: true, new: true }
  );
}

// ─── Customer ──────────────────────────────────────────────────────────────────

async function createCustomer(overrides = {}) {
  const phone = overrides.phone || `9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;
  const user = await User.create({
    name: 'Test Customer',
    phone,
    role: 'customer',
    isVerified: true,
    ...overrides,
  });
  const address = await Address.create({
    user: user._id,
    title: 'Home',
    fullName: user.name,
    phoneNumber: phone,
    addressLine1: '123 Test Street',
    area: 'Beguru',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560076',
    addressType: 'home',
    isDefault: true,
    coordinates: { latitude: 12.8640762, longitude: 77.6143265 },
  });
  return { user, address, token: generateToken(user._id, 'customer') };
}

// ─── Merchant ──────────────────────────────────────────────────────────────────

async function createMerchant(overrides = {}) {
  const phone = overrides.phone || `8${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;
  const merchantDoc = await Merchant.create({
    name: 'Test Merchant',
    phone,
    businessName: 'Test Merchant Store',
    contactPersonName: 'Test Owner',
    businessType: 'Building Materials',
    address: '10 Merchant Lane, Beguru',
    area: 'Beguru',
    city: overrides.city || 'Bengaluru',
    state: 'Karnataka',
    pincode: '560076',
    activeStatus: 'approved',
    'availability.isActive': true,
    location: {
      type: 'Point',
      coordinates: [77.6142969, 12.864069],
    },
    ...overrides,
  });
  return { merchant: merchantDoc, token: generateToken(merchantDoc._id, 'merchant') };
}

// ─── Non-variant product ───────────────────────────────────────────────────────

async function createNonVariantProduct({ merchantId, adminPrice = 600, merchantPrice = 500, gstRate = 18, gstType = 'exclusive' } = {}) {
  let category = await Category.findOne({ name: 'Test Category' });
  if (!category) category = await Category.create({ name: 'Test Category', slug: 'test-category' });

  const product = await Product.create({
    name: 'Test Cement',
    description: 'Test product for automated tests',
    sku: `SKU-${Date.now()}`,
    price: adminPrice,
    unit: 'bag',
    gstRate,
    gstType,
    category: category._id,
    enabled: true,
    stock: 100,
  });

  const mp = await MerchantProduct.create({
    merchantId,
    productId: product._id,
    price: merchantPrice,
    stock: 100,
    enabled: true,
    variantPricing: [],
  });

  return { product, merchantProduct: mp };
}

// ─── Variant product ───────────────────────────────────────────────────────────

async function createVariantProduct({
  merchantId,
  variants = [
    { label: '8mm',  adminPrice: 250, merchantPrice: 200, stock: 500 },
    { label: '10mm', adminPrice: 350, merchantPrice: 300, stock: 500 },
  ],
  gstRate = 18,
  gstType = 'exclusive',
} = {}) {
  let category = await Category.findOne({ name: 'Test Category' });
  if (!category) category = await Category.create({ name: 'Test Category', slug: 'test-category' });

  const product = await Product.create({
    name: 'Tata Steel TMT',
    description: 'Test variant product for automated tests',
    sku: `SKU-VAR-${Date.now()}`,
    price: 0,
    unit: 'piece',
    gstRate,
    gstType,
    category: category._id,
    enabled: true,
    stock: 0,
    variants: variants.map(v => ({ label: v.label, price: v.adminPrice, stock: 0 })),
  });

  const mp = await MerchantProduct.create({
    merchantId,
    productId: product._id,
    price: 0,
    stock: 0,
    enabled: true,
    variantPricing: variants.map(v => ({ label: v.label, price: v.merchantPrice, stock: v.stock })),
  });

  return { product, merchantProduct: mp, variants };
}

module.exports = {
  setGSTMode,
  createCustomer,
  createMerchant,
  createNonVariantProduct,
  createVariantProduct,
  generateToken,
};
