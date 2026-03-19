/**
 * E2E API Flow Tests — Admin Panel → Merchant Onboarding → Customer Order → Payout
 *
 * Simulates the complete real-world flow through actual HTTP API endpoints:
 *   1. Admin configures GST settings
 *   2. Admin creates a category
 *   3. Admin creates products (non-variant + variant) in the master catalog
 *   4. Admin onboards a merchant
 *   5. Merchant adds products to their inventory with their own pricing
 *   6. Customer places an order
 *   7. Admin assigns the merchant to the order
 *   8. Payout is verified for all 3 GST modes
 *
 * Difference from pricing-payout.test.js:
 *   That file uses direct DB fixture helpers (createMerchant, createNonVariantProduct, etc.)
 *   This file exercises the actual API routes so that the full admin-panel flow is covered.
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Order = require('../models/Order');
const { generateToken } = require('./helpers/fixtures');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Creates an admin user in DB and returns { user, token }. */
async function createAdminUser() {
  const phone = `7${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;
  const user = await User.create({
    name: 'Test Admin',
    phone,
    role: 'admin',
    isActive: true,
    isPhoneVerified: true,
  });
  return { user, token: generateToken(user._id, 'admin') };
}

/** Creates a customer user in DB and returns { user, token, addressId }.
 *  Customer registration uses OTP flow which cannot be driven through API in tests,
 *  so we create the User and Address directly — the same approach used by the
 *  existing pricing-payout.test.js fixtures. */
async function createCustomerViaDB() {
  const { createCustomer } = require('./helpers/fixtures');
  return createCustomer();
}

// ─── API wrappers ──────────────────────────────────────────────────────────────

async function apiSetGSTMode(adminToken, gstMode) {
  const res = await request(app)
    .put('/api/settings')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      gstMode,
      splitGSTEnabled: true,
      priceDisplayMode: 'admin',
      platformFeeRate: 0.0236,
      deliveryConfig: { type: 'fixed', fixedCharge: 0 },
      minimumOrderValue: 100,
    })
    .expect(200);
  return res.body.settings;
}

async function apiCreateCategory(adminToken, name) {
  const res = await request(app)
    .post('/api/products/categories')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name, description: `Auto-created category: ${name}` })
    .expect(201);
  return res.body;
}

async function apiCreateNonVariantProduct(adminToken, { categoryId, adminPrice, gstRate, gstType }) {
  const res = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: `Test Cement ${Date.now()}`,
      description: 'Non-variant product for E2E test',
      category: categoryId,
      price: adminPrice,
      unit: 'bag',
      gstRate,
      gstType,
      stock: 0, // master catalog stock is irrelevant — merchant stock drives availability
    })
    .expect(201);
  return res.body.product;
}

async function apiCreateVariantProduct(adminToken, { categoryId, variants, gstRate, gstType }) {
  const res = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: `Test TMT Bar ${Date.now()}`,
      description: 'Variant product for E2E test',
      category: categoryId,
      price: 0,
      unit: 'piece',
      gstRate,
      gstType,
      variants: variants.map(v => ({ label: v.label, price: v.adminPrice, stock: 0 })),
    })
    .expect(201);
  return res.body.product;
}

async function apiOnboardMerchant(adminToken) {
  const phone = `8${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;
  const res = await request(app)
    .post('/api/merchants/onboard')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'E2E Test Merchant',
      businessName: 'E2E Merchant Store',
      phone,
      area: 'Beguru',
      address: '10 Merchant Lane, Beguru',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560076',
      businessType: 'Building Materials',
      latitude: 12.864069,
      longitude: 77.6142969,
    })
    .expect(201);
  const merchant = res.body.merchant;
  // Token signed with merchant._id — auth middleware finds it in Merchant collection
  const token = generateToken(merchant._id, 'merchant');
  return { merchant, token };
}

async function apiMerchantAddNonVariant(merchantToken, productId, merchantPrice) {
  const res = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${merchantToken}`)
    .send({
      productId,
      price: merchantPrice,
      stock: 100,
    })
    .expect(201);
  return res.body.merchantProduct;
}

async function apiMerchantAddVariant(merchantToken, productId, variantPricing) {
  const res = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${merchantToken}`)
    .send({
      productId,
      variantPricing,
    })
    .expect(201);
  return res.body.merchantProduct;
}

async function apiPlaceOrder(customerToken, { productId, quantity, variantLabel, addressId, customerPhone }) {
  const items = [{ productId, quantity, variantLabel: variantLabel || null }];
  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      items,
      addressId,
      customerPhone,
      customerAddress: 'Test Street, Beguru',
      customerArea: 'Beguru',
      paymentMethod: 'cod',
      deliveryInstructions: '',
      deliveryLocation: null,
    })
    .expect(201);
  return res.body.order;
}

async function apiAssignMerchant(orderId, itemId, merchantId) {
  // This route has no auth middleware (open admin utility route)
  const res = await request(app)
    .put(`/api/orders/${orderId}/assign-merchant`)
    .send({ merchantId, itemId })
    .expect(200);
  return res.body.order;
}

// ─── Shared payout assertions ──────────────────────────────────────────────────

function assertPayoutSane(payout, orderTotalAmount) {
  expect(typeof payout.codCollectionAmount).toBe('number');
  expect(typeof payout.amountOwePlatform).toBe('number');
  expect(typeof payout.netPayout).toBe('number');
  expect(payout.codCollectionAmount).toBeCloseTo(orderTotalAmount, 1);
  expect(payout.netPayout).toBeCloseTo(payout.codCollectionAmount - payout.amountOwePlatform, 1);
  expect(payout.amountOwePlatform).toBeGreaterThanOrEqual(0);
}

function assertGSTSplit(payout, expectedTotalGST, gstMode) {
  if (gstMode === 'no-gst') {
    expect(payout.merchantGSTShare).toBe(0);
    expect(payout.platformGSTShare).toBe(0);
    return;
  }
  const derivedTotalGST = payout.merchantGSTShare + payout.platformGSTShare;
  expect(derivedTotalGST).toBeCloseTo(expectedTotalGST, 1);
  expect(payout.merchantGSTShare).toBeGreaterThanOrEqual(0);
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('E2E: Admin creates non-variant product — GST exclusive', () => {
  let admin, customer, merchant, product;
  const ADMIN_PRICE = 600;
  const MERCHANT_PRICE = 500;
  const GST_RATE = 18;

  beforeEach(async () => {
    admin = await createAdminUser();
    await apiSetGSTMode(admin.token, 'exclusive');
    const category = await apiCreateCategory(admin.token, `Cat-${Date.now()}`);
    product = await apiCreateNonVariantProduct(admin.token, {
      categoryId: category._id,
      adminPrice: ADMIN_PRICE,
      gstRate: GST_RATE,
      gstType: 'exclusive',
    });
    const m = await apiOnboardMerchant(admin.token);
    merchant = m;
    await apiMerchantAddNonVariant(merchant.token, product._id, MERCHANT_PRICE);
    customer = await createCustomerViaDB();
  });

  it('admin product appears in catalog with correct price', async () => {
    const res = await request(app).get('/api/products').expect(200);
    const found = res.body.products?.find(p => p._id.toString() === product._id.toString());
    expect(found).toBeDefined();
    // In 'admin' display mode, price equals the admin price
    expect(found.price).toBe(ADMIN_PRICE);
  });

  it('merchant product appears in their own inventory', async () => {
    const res = await request(app)
      .get('/api/products/merchant/my')
      .set('Authorization', `Bearer ${merchant.token}`)
      .expect(200);
    const found = res.body.products?.find(p => p._id.toString() === product._id.toString());
    expect(found).toBeDefined();
    expect(found.price).toBe(MERCHANT_PRICE);
  });

  it('cart totals: subtotal = adminPrice × qty, GST = 18% of subtotal', async () => {
    const res = await request(app)
      .post('/api/orders/calculate-cart-totals')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({
        items: [{ productId: product._id, quantity: 2, variantLabel: null }],
        addressId: customer.address._id,
      })
      .expect(200);

    expect(res.body.subtotal).toBeCloseTo(ADMIN_PRICE * 2, 1);   // 1200
    expect(res.body.tax).toBeCloseTo((ADMIN_PRICE * 2) * (GST_RATE / 100), 1); // 216
  });

  it('order placement → merchant assignment → payout is correct', async () => {
    const order = await apiPlaceOrder(customer.token, {
      productId: product._id,
      quantity: 2,
      addressId: customer.address._id,
      customerPhone: customer.user.phone,
    });

    const dbOrder = await Order.findById(order._id);
    expect(dbOrder.items[0].gstRate).toBe(GST_RATE);
    expect(dbOrder.items[0].gstType).toBe('exclusive');

    const assigned = await apiAssignMerchant(
      order._id,
      dbOrder.items[0]._id,
      merchant.merchant._id
    );

    const payout = assigned.merchantPayouts?.[0];
    expect(payout).toBeDefined();
    assertPayoutSane(payout, assigned.totalAmount);
    // merchantGST = 500×18%×2 = 180, platformGST = 100×18%×2 = 36
    assertGSTSplit(payout, (ADMIN_PRICE - MERCHANT_PRICE) * 2 * (GST_RATE / 100) + MERCHANT_PRICE * 2 * (GST_RATE / 100), 'exclusive');
    // platform commission = (600 - 500) × 2 = 200
    expect(payout.platformCommission).toBeCloseTo((ADMIN_PRICE - MERCHANT_PRICE) * 2, 1);
    // merchant base = 500 × 2 = 1000
    expect(payout.itemsBaseValue).toBeCloseTo(MERCHANT_PRICE * 2, 1);
  });
});

describe('E2E: Admin creates non-variant product — GST inclusive', () => {
  let admin, customer, merchant, product;

  beforeEach(async () => {
    admin = await createAdminUser();
    await apiSetGSTMode(admin.token, 'inclusive');
    const category = await apiCreateCategory(admin.token, `Cat-${Date.now()}`);
    product = await apiCreateNonVariantProduct(admin.token, {
      categoryId: category._id,
      adminPrice: 708,   // GST-inclusive price (600 + 18% = 708)
      gstRate: 18,
      gstType: 'inclusive',
    });
    const m = await apiOnboardMerchant(admin.token);
    merchant = m;
    await apiMerchantAddNonVariant(merchant.token, product._id, 590); // 500 + 18% = 590
    customer = await createCustomerViaDB();
  });

  it('totalAmount does NOT double-add GST in inclusive mode', async () => {
    const res = await request(app)
      .post('/api/orders/calculate-cart-totals')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({
        items: [{ productId: product._id, quantity: 2, variantLabel: null }],
        addressId: customer.address._id,
      })
      .expect(200);

    const { subtotal, tax, totalAmount, deliveryCharges, platformFee } = res.body;
    // GST already baked in to subtotal; totalAmount = subtotal + delivery + fee only
    expect(totalAmount).toBeCloseTo(subtotal + (deliveryCharges || 0) + (platformFee || 0), 1);
    // totalAmount must NOT be subtotal + tax + ... (double-counted)
    expect(totalAmount).toBeLessThan(subtotal + tax + 100);
  });

  it('payout GST split sums to order-level GST', async () => {
    const order = await apiPlaceOrder(customer.token, {
      productId: product._id,
      quantity: 2,
      addressId: customer.address._id,
      customerPhone: customer.user.phone,
    });

    const dbOrder = await Order.findById(order._id);
    const assigned = await apiAssignMerchant(
      order._id,
      dbOrder.items[0]._id,
      merchant.merchant._id
    );

    const updatedOrder = await Order.findById(order._id);
    const payout = updatedOrder.merchantPayouts?.[0];
    expect(payout).toBeDefined();
    assertPayoutSane(payout, updatedOrder.totalAmount);
    assertGSTSplit(payout, updatedOrder.tax, 'inclusive');
  });
});

describe('E2E: Admin creates non-variant product — no-GST mode', () => {
  let admin, customer, merchant, product;

  beforeEach(async () => {
    admin = await createAdminUser();
    await apiSetGSTMode(admin.token, 'no-gst');
    const category = await apiCreateCategory(admin.token, `Cat-${Date.now()}`);
    product = await apiCreateNonVariantProduct(admin.token, {
      categoryId: category._id,
      adminPrice: 600,
      gstRate: 0,
      gstType: 'exclusive',
    });
    const m = await apiOnboardMerchant(admin.token);
    merchant = m;
    await apiMerchantAddNonVariant(merchant.token, product._id, 500);
    customer = await createCustomerViaDB();
  });

  it('no GST charged — tax = 0', async () => {
    const res = await request(app)
      .post('/api/orders/calculate-cart-totals')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({
        items: [{ productId: product._id, quantity: 2, variantLabel: null }],
        addressId: customer.address._id,
      })
      .expect(200);

    expect(res.body.tax).toBe(0);
    const { subtotal, totalAmount, deliveryCharges, platformFee } = res.body;
    expect(totalAmount).toBeCloseTo(subtotal + (deliveryCharges || 0) + (platformFee || 0), 1);
  });

  it('payout GST shares are 0', async () => {
    const order = await apiPlaceOrder(customer.token, {
      productId: product._id,
      quantity: 1,
      addressId: customer.address._id,
      customerPhone: customer.user.phone,
    });

    const dbOrder = await Order.findById(order._id);
    const assigned = await apiAssignMerchant(
      order._id,
      dbOrder.items[0]._id,
      merchant.merchant._id
    );

    const updatedOrder = await Order.findById(order._id);
    const payout = updatedOrder.merchantPayouts?.[0];
    expect(payout).toBeDefined();
    assertPayoutSane(payout, updatedOrder.totalAmount);
    assertGSTSplit(payout, 0, 'no-gst');
  });
});

describe('E2E: Admin creates variant product — GST exclusive', () => {
  let admin, customer, merchant, product;
  const VARIANTS = [
    { label: '8mm',  adminPrice: 250, merchantPrice: 200 },
    { label: '10mm', adminPrice: 350, merchantPrice: 300 },
  ];

  beforeEach(async () => {
    admin = await createAdminUser();
    await apiSetGSTMode(admin.token, 'exclusive');
    const category = await apiCreateCategory(admin.token, `Cat-${Date.now()}`);
    product = await apiCreateVariantProduct(admin.token, {
      categoryId: category._id,
      variants: VARIANTS,
      gstRate: 18,
      gstType: 'exclusive',
    });
    const m = await apiOnboardMerchant(admin.token);
    merchant = m;
    await apiMerchantAddVariant(merchant.token, product._id, VARIANTS.map(v => ({
      label: v.label,
      price: v.merchantPrice,
      stock: 500,
    })));
    customer = await createCustomerViaDB();
  });

  it('admin creates variant product — variants appear in catalog', async () => {
    const res = await request(app)
      .get(`/api/products/${product._id}`)
      .expect(200);

    expect(res.body.variants).toHaveLength(2);
    const labels = res.body.variants.map(v => v.label).sort();
    expect(labels).toEqual(['10mm', '8mm']);
  });

  it('cart totals use variant-specific admin prices', async () => {
    const res = await request(app)
      .post('/api/orders/calculate-cart-totals')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({
        items: [
          { productId: product._id, quantity: 2, variantLabel: '8mm' },
          { productId: product._id, quantity: 2, variantLabel: '10mm' },
        ],
        addressId: customer.address._id,
      })
      .expect(200);

    // subtotal = 250×2 + 350×2 = 1200
    expect(res.body.subtotal).toBeCloseTo(1200, 1);
    // GST = 18% of 1200 = 216
    expect(res.body.tax).toBeCloseTo(216, 1);
  });

  it('variantLabel is saved on order items in DB', async () => {
    const order = await apiPlaceOrder(customer.token, {
      productId: product._id,
      quantity: 2,
      variantLabel: '8mm',
      addressId: customer.address._id,
      customerPhone: customer.user.phone,
    });

    const dbOrder = await Order.findById(order._id);
    expect(dbOrder.items[0].variantLabel).toBe('8mm');
    expect(dbOrder.items[0].gstRate).toBe(18);
  });

  it('payout uses variant-specific merchant price (not root price)', async () => {
    const order = await apiPlaceOrder(customer.token, {
      productId: product._id,
      quantity: 2,
      variantLabel: '8mm',
      addressId: customer.address._id,
      customerPhone: customer.user.phone,
    });

    const dbOrder = await Order.findById(order._id);
    const assigned = await apiAssignMerchant(
      order._id,
      dbOrder.items[0]._id,
      merchant.merchant._id
    );

    const payout = assigned.merchantPayouts?.[0];
    expect(payout).toBeDefined();
    assertPayoutSane(payout, assigned.totalAmount);
    // 8mm: merchant base = 200×2 = 400
    expect(payout.itemsBaseValue).toBeCloseTo(400, 1);
    // platform commission = (250 - 200) × 2 = 100
    expect(payout.platformCommission).toBeCloseTo(100, 1);
  });

  it('multi-variant order: payout COD equals order totalAmount', async () => {
    // Place one order with both variants
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({
        items: [
          { productId: product._id, quantity: 2, variantLabel: '8mm' },
          { productId: product._id, quantity: 2, variantLabel: '10mm' },
        ],
        addressId: customer.address._id,
        customerPhone: customer.user.phone,
        customerAddress: 'Test Street, Beguru',
        customerArea: 'Beguru',
        paymentMethod: 'cod',
        deliveryInstructions: '',
        deliveryLocation: null,
      })
      .expect(201);

    const order = res.body.order;
    const dbOrder = await Order.findById(order._id);

    // Assign both items to the same merchant
    for (const item of dbOrder.items) {
      await apiAssignMerchant(order._id, item._id, merchant.merchant._id);
    }

    const updatedOrder = await Order.findById(order._id);
    const payout = updatedOrder.merchantPayouts?.[updatedOrder.merchantPayouts.length - 1];
    expect(payout).toBeDefined();
    assertPayoutSane(payout, updatedOrder.totalAmount);
  });

  it('platform commission is never negative (merchant price capped at admin price)', async () => {
    // Create a product where merchant mistakenly sets a higher price
    const category = await apiCreateCategory(admin.token, `Cat-${Date.now()}`);
    const overPricedProduct = await apiCreateNonVariantProduct(admin.token, {
      categoryId: category._id,
      adminPrice: 300,
      gstRate: 18,
      gstType: 'exclusive',
    });
    await apiMerchantAddNonVariant(merchant.token, overPricedProduct._id, 800); // higher than admin price

    const order = await apiPlaceOrder(customer.token, {
      productId: overPricedProduct._id,
      quantity: 1,
      addressId: customer.address._id,
      customerPhone: customer.user.phone,
    });

    const dbOrder = await Order.findById(order._id);
    const assigned = await apiAssignMerchant(
      order._id,
      dbOrder.items[0]._id,
      merchant.merchant._id
    );

    const payout = assigned.merchantPayouts?.[0];
    expect(payout.platformCommission).toBeGreaterThanOrEqual(0);
    expect(payout.amountOwePlatform).toBeGreaterThanOrEqual(0);
    expect(payout.netPayout).toBeLessThanOrEqual(payout.codCollectionAmount + 0.01);
  });
});

describe('E2E: Admin creates variant product — GST inclusive', () => {
  let admin, customer, merchant, product;
  const VARIANTS = [
    { label: '8mm',  adminPrice: 295, merchantPrice: 236 },  // ~250 + 18% = 295, ~200 + 18% = 236
    { label: '10mm', adminPrice: 413, merchantPrice: 354 },  // ~350 + 18% = 413, ~300 + 18% = 354
  ];

  beforeEach(async () => {
    admin = await createAdminUser();
    await apiSetGSTMode(admin.token, 'inclusive');
    const category = await apiCreateCategory(admin.token, `Cat-${Date.now()}`);
    product = await apiCreateVariantProduct(admin.token, {
      categoryId: category._id,
      variants: VARIANTS,
      gstRate: 18,
      gstType: 'inclusive',
    });
    const m = await apiOnboardMerchant(admin.token);
    merchant = m;
    await apiMerchantAddVariant(merchant.token, product._id, VARIANTS.map(v => ({
      label: v.label,
      price: v.merchantPrice,
      stock: 500,
    })));
    customer = await createCustomerViaDB();
  });

  it('payout GST split sums to order GST for variant inclusive product', async () => {
    const order = await apiPlaceOrder(customer.token, {
      productId: product._id,
      quantity: 2,
      variantLabel: '8mm',
      addressId: customer.address._id,
      customerPhone: customer.user.phone,
    });

    const dbOrder = await Order.findById(order._id);
    const assigned = await apiAssignMerchant(
      order._id,
      dbOrder.items[0]._id,
      merchant.merchant._id
    );

    const updatedOrder = await Order.findById(order._id);
    const payout = updatedOrder.merchantPayouts?.[0];
    expect(payout).toBeDefined();
    assertPayoutSane(payout, updatedOrder.totalAmount);
    assertGSTSplit(payout, updatedOrder.tax, 'inclusive');
  });
});

describe('E2E: Admin creates variant product — no-GST mode', () => {
  let admin, customer, merchant, product;

  beforeEach(async () => {
    admin = await createAdminUser();
    await apiSetGSTMode(admin.token, 'no-gst');
    const category = await apiCreateCategory(admin.token, `Cat-${Date.now()}`);
    product = await apiCreateVariantProduct(admin.token, {
      categoryId: category._id,
      variants: [
        { label: '8mm',  adminPrice: 250, merchantPrice: 200 },
        { label: '10mm', adminPrice: 350, merchantPrice: 300 },
      ],
      gstRate: 0,
      gstType: 'exclusive',
    });
    const m = await apiOnboardMerchant(admin.token);
    merchant = m;
    await apiMerchantAddVariant(merchant.token, product._id, [
      { label: '8mm',  price: 200, stock: 500 },
      { label: '10mm', price: 300, stock: 500 },
    ]);
    customer = await createCustomerViaDB();
  });

  it('no GST on variant order — tax = 0, payout GST shares = 0', async () => {
    const cartRes = await request(app)
      .post('/api/orders/calculate-cart-totals')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({
        items: [{ productId: product._id, quantity: 2, variantLabel: '8mm' }],
        addressId: customer.address._id,
      })
      .expect(200);
    expect(cartRes.body.tax).toBe(0);

    const order = await apiPlaceOrder(customer.token, {
      productId: product._id,
      quantity: 2,
      variantLabel: '8mm',
      addressId: customer.address._id,
      customerPhone: customer.user.phone,
    });

    const dbOrder = await Order.findById(order._id);
    const assigned = await apiAssignMerchant(
      order._id,
      dbOrder.items[0]._id,
      merchant.merchant._id
    );

    const updatedOrder = await Order.findById(order._id);
    const payout = updatedOrder.merchantPayouts?.[0];
    expect(payout).toBeDefined();
    assertPayoutSane(payout, updatedOrder.totalAmount);
    assertGSTSplit(payout, 0, 'no-gst');
  });
});
