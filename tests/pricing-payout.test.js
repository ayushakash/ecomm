/**
 * Order Pricing & Payout Tests
 *
 * Covers the full flow: cart totals → order creation → merchant assignment → payout.
 * Tests all 3 GST modes × both product types (non-variant and variant).
 *
 * What these tests protect against:
 *  - Fields stripped by Mongoose (gstRate, variantLabel not in schema)
 *  - Wrong merchant price lookup (root price vs variant price)
 *  - Inverted payout (merchantCost > customerPrice)
 *  - COD amount not matching order totalAmount
 *  - GST = 0 due to missing gstRate on order item
 */

const request = require('supertest');
const app = require('../server');
const Order = require('../models/Order');
const { setGSTMode, createCustomer, createMerchant, createNonVariantProduct, createVariantProduct } = require('./helpers/fixtures');

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getCartTotals(token, items, addressId) {
  const res = await request(app)
    .post('/api/orders/calculate-cart-totals')
    .set('Authorization', `Bearer ${token}`)
    .send({ items, addressId })
    .expect(200);
  return res.body;
}

async function placeOrder(token, { items, addressId, customerPhone, customerAddress, customerArea }) {
  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      items,
      addressId,
      customerPhone,
      customerAddress: customerAddress || 'Test Street, Beguru',
      customerArea: customerArea || 'Beguru',
      paymentMethod: 'cod',
      deliveryInstructions: '',
      deliveryLocation: null,
    })
    .expect(201);
  return res.body.order;
}

async function assignMerchant(adminToken, orderId, itemId, merchantId) {
  const res = await request(app)
    .put(`/api/orders/${orderId}/assign-merchant`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ merchantId, itemId })
    .expect(200);
  return res.body.order;
}

function getAdminToken() {
  const { generateToken } = require('./helpers/fixtures');
  // Use a fake admin ObjectId — routes only check role from JWT
  const mongoose = require('mongoose');
  return generateToken(new mongoose.Types.ObjectId(), 'admin');
}

// ─── Shared assertions ─────────────────────────────────────────────────────────

function assertPayoutSane(payout, orderTotalAmount) {
  // Basic sanity: all values should be numbers
  expect(typeof payout.codCollectionAmount).toBe('number');
  expect(typeof payout.amountOwePlatform).toBe('number');
  expect(typeof payout.netPayout).toBe('number');

  // COD must equal order total (single merchant, single customer)
  expect(payout.codCollectionAmount).toBeCloseTo(orderTotalAmount, 1);

  // Net payout = COD - owe platform
  expect(payout.netPayout).toBeCloseTo(
    payout.codCollectionAmount - payout.amountOwePlatform, 1
  );

  // Platform should never owe merchant (amountOwePlatform >= 0)
  expect(payout.amountOwePlatform).toBeGreaterThanOrEqual(0);

  // Merchant should never collect more than total order amount
  expect(payout.codCollectionAmount).toBeLessThanOrEqual(orderTotalAmount + 1);
}

function assertGSTSplit(payout, expectedTotalGST, gstMode) {
  if (gstMode === 'no-gst') {
    expect(payout.merchantGSTShare).toBe(0);
    expect(payout.platformGSTShare).toBe(0);
    return;
  }
  // merchant GST + platform GST should equal order GST
  const derivedTotalGST = payout.merchantGSTShare + payout.platformGSTShare;
  expect(derivedTotalGST).toBeCloseTo(expectedTotalGST, 1);
  // merchant GST always >= 0
  expect(payout.merchantGSTShare).toBeGreaterThanOrEqual(0);
}

// ─── NON-VARIANT PRODUCT TESTS ─────────────────────────────────────────────────

describe('Non-variant product — GST exclusive', () => {
  let customer, merchant, product, adminPrice, merchantPrice;

  beforeEach(async () => {
    await setGSTMode('exclusive');
    adminPrice = 600; merchantPrice = 500;
    const c = await createCustomer();
    customer = c;
    const m = await createMerchant();
    merchant = m;
    ({ product } = await createNonVariantProduct({
      merchantId: merchant.merchant._id,
      adminPrice, merchantPrice, gstRate: 18,
    }));
  });

  it('calculate-cart-totals returns correct subtotal, GST, total', async () => {
    const items = [{ productId: product._id, quantity: 2, variantLabel: null }];
    const totals = await getCartTotals(customer.token, items, customer.address._id);

    expect(totals.subtotal).toBeCloseTo(1200, 1);           // 600×2
    expect(totals.tax).toBeCloseTo(216, 1);                 // 18% of 1200
    expect(totals.totalAmount).toBeCloseTo(1200 + 216 + (totals.platformFee || 0), 0);  // subtotal + GST + platform fee
  });

  it('order items have gstRate and gstType saved in DB', async () => {
    const items = [{ productId: product._id, quantity: 2, variantLabel: null }];
    const order = await placeOrder(customer.token, {
      items, addressId: customer.address._id, customerPhone: customer.user.phone,
    });

    const dbOrder = await Order.findById(order._id);
    const item = dbOrder.items[0];

    expect(item.gstRate).toBe(18);        // must be saved — was stripped before fix
    expect(item.gstType).toBe('exclusive');
  });

  it('payout is correct after merchant assignment', async () => {
    const items = [{ productId: product._id, quantity: 2, variantLabel: null }];
    const order = await placeOrder(customer.token, {
      items, addressId: customer.address._id, customerPhone: customer.user.phone,
    });

    const dbOrder = await Order.findById(order._id);
    const itemId = dbOrder.items[0]._id;
    const assigned = await assignMerchant(getAdminToken(), order._id, itemId, merchant.merchant._id);

    const payout = assigned.merchantPayouts?.[0];
    expect(payout).toBeDefined();

    // COD = 1200 + merchantGST(180) + platformGST(36) + platformFee
    assertPayoutSane(payout, assigned.totalAmount);
    // merchantGST = 500×18%×2 = 180, platformGST = 100×18%×2 = 36
    assertGSTSplit(payout, 216, 'exclusive');
    // platform commission = (600-500)×2 = 200
    expect(payout.platformCommission).toBeCloseTo(200, 1);
    // merchant base = 500×2 = 1000
    expect(payout.itemsBaseValue).toBeCloseTo(1000, 1);
  });

  it('merchantUnitPrice is locked to claiming merchant price at assignment', async () => {
    const items = [{ productId: product._id, quantity: 2, variantLabel: null }];
    const order = await placeOrder(customer.token, {
      items, addressId: customer.address._id, customerPhone: customer.user.phone,
    });

    const dbOrder = await Order.findById(order._id);
    const itemId = dbOrder.items[0]._id;
    await assignMerchant(getAdminToken(), order._id, itemId, merchant.merchant._id);

    const updated = await Order.findById(order._id);
    expect(updated.items[0].merchantUnitPrice).toBe(merchantPrice); // locked to 500
  });
});

describe('Non-variant product — GST inclusive', () => {
  let customer, merchant, product;

  beforeEach(async () => {
    await setGSTMode('inclusive');
    const c = await createCustomer();
    customer = c;
    const m = await createMerchant();
    merchant = m;
    ({ product } = await createNonVariantProduct({
      merchantId: merchant.merchant._id,
      adminPrice: 708, merchantPrice: 590, gstRate: 18, gstType: 'inclusive',
    }));
  });

  it('totalAmount does NOT double-add GST in inclusive mode', async () => {
    const items = [{ productId: product._id, quantity: 2, variantLabel: null }];
    const totals = await getCartTotals(customer.token, items, customer.address._id);

    // In inclusive mode: subtotal already contains GST, totalAmount = subtotal + delivery + fee
    expect(totals.totalAmount).toBeCloseTo(totals.subtotal + totals.deliveryCharges + totals.platformFee, 1);
    // totalAmount must NOT be subtotal + GST + ... (double-counted)
    expect(totals.totalAmount).toBeLessThan(totals.subtotal + totals.tax + 100);
  });

  it('payout GST split sums to order GST', async () => {
    const items = [{ productId: product._id, quantity: 2, variantLabel: null }];
    const order = await placeOrder(customer.token, {
      items, addressId: customer.address._id, customerPhone: customer.user.phone,
    });

    const dbOrder = await Order.findById(order._id);
    await assignMerchant(getAdminToken(), order._id, dbOrder.items[0]._id, merchant.merchant._id);
    const updated = await Order.findById(order._id);
    const payout = updated.merchantPayouts?.[0];

    assertPayoutSane(payout, updated.totalAmount);
    assertGSTSplit(payout, updated.tax, 'inclusive');
  });
});

describe('Non-variant product — no-GST mode', () => {
  let customer, merchant, product;

  beforeEach(async () => {
    await setGSTMode('no-gst');
    const c = await createCustomer();
    customer = c;
    const m = await createMerchant();
    merchant = m;
    ({ product } = await createNonVariantProduct({
      merchantId: merchant.merchant._id,
      adminPrice: 600, merchantPrice: 500, gstRate: 0,
    }));
  });

  it('no GST charged — totalAmount = subtotal + delivery + platformFee', async () => {
    const items = [{ productId: product._id, quantity: 2, variantLabel: null }];
    const totals = await getCartTotals(customer.token, items, customer.address._id);

    expect(totals.tax).toBe(0);
    expect(totals.totalAmount).toBeCloseTo(
      totals.subtotal + totals.deliveryCharges + totals.platformFee, 1
    );
  });

  it('payout GST shares are 0 in no-gst mode', async () => {
    const items = [{ productId: product._id, quantity: 2, variantLabel: null }];
    const order = await placeOrder(customer.token, {
      items, addressId: customer.address._id, customerPhone: customer.user.phone,
    });

    const dbOrder = await Order.findById(order._id);
    await assignMerchant(getAdminToken(), order._id, dbOrder.items[0]._id, merchant.merchant._id);
    const updated = await Order.findById(order._id);
    const payout = updated.merchantPayouts?.[0];

    assertPayoutSane(payout, updated.totalAmount);
    assertGSTSplit(payout, 0, 'no-gst');
  });
});

// ─── VARIANT PRODUCT TESTS ─────────────────────────────────────────────────────

describe('Variant product — GST exclusive', () => {
  let customer, merchant, product, variants, merchantProduct;

  beforeEach(async () => {
    await setGSTMode('exclusive');
    const c = await createCustomer();
    customer = c;
    const m = await createMerchant();
    merchant = m;
    ({ product, variants, merchantProduct } = await createVariantProduct({
      merchantId: merchant.merchant._id,
      variants: [
        { label: '8mm',  adminPrice: 250, merchantPrice: 200, stock: 500 },
        { label: '10mm', adminPrice: 350, merchantPrice: 300, stock: 500 },
      ],
      gstRate: 18, gstType: 'exclusive',
    }));
  });

  it('variantLabel is saved on order item in DB', async () => {
    const items = [
      { productId: product._id, quantity: 2, variantLabel: '8mm' },
      { productId: product._id, quantity: 2, variantLabel: '10mm' },
    ];
    const order = await placeOrder(customer.token, {
      items, addressId: customer.address._id, customerPhone: customer.user.phone,
    });

    const dbOrder = await Order.findById(order._id);
    const labels = dbOrder.items.map(i => i.variantLabel).sort();
    expect(labels).toEqual(['10mm', '8mm']); // both saved — was stripped before fix
  });

  it('gstRate is saved on variant order items', async () => {
    const items = [{ productId: product._id, quantity: 2, variantLabel: '8mm' }];
    const order = await placeOrder(customer.token, {
      items, addressId: customer.address._id, customerPhone: customer.user.phone,
    });

    const dbOrder = await Order.findById(order._id);
    expect(dbOrder.items[0].gstRate).toBe(18); // was stripped before fix
  });

  it('calculate-cart-totals uses correct variant prices', async () => {
    const items = [
      { productId: product._id, quantity: 2, variantLabel: '8mm' },
      { productId: product._id, quantity: 2, variantLabel: '10mm' },
    ];
    const totals = await getCartTotals(customer.token, items, customer.address._id);

    // subtotal = 250×2 + 350×2 = 1200
    expect(totals.subtotal).toBeCloseTo(1200, 1);
    // GST = 18% of 1200 = 216
    expect(totals.tax).toBeCloseTo(216, 1);
    // total = 1200 + 216 + platformFee (platform fee + its GST)
    expect(totals.totalAmount).toBeCloseTo(totals.subtotal + totals.tax + (totals.platformFee || 0), 1);
  });

  it('payout COD = order totalAmount after merchant claims', async () => {
    const items = [
      { productId: product._id, quantity: 2, variantLabel: '8mm' },
      { productId: product._id, quantity: 2, variantLabel: '10mm' },
    ];
    const order = await placeOrder(customer.token, {
      items, addressId: customer.address._id, customerPhone: customer.user.phone,
    });

    const dbOrder = await Order.findById(order._id);
    // Assign both items to the same merchant
    for (const item of dbOrder.items) {
      await assignMerchant(getAdminToken(), order._id, item._id, merchant.merchant._id);
    }

    const updated = await Order.findById(order._id);
    // After multi-item assignment, payout may accumulate — take the last entry
    const payout = updated.merchantPayouts?.[updated.merchantPayouts.length - 1];
    expect(payout).toBeDefined();
    assertPayoutSane(payout, updated.totalAmount);
  });

  it('payout uses variant-specific merchant price (not root price)', async () => {
    const items = [{ productId: product._id, quantity: 2, variantLabel: '8mm' }];
    const order = await placeOrder(customer.token, {
      items, addressId: customer.address._id, customerPhone: customer.user.phone,
    });

    const dbOrder = await Order.findById(order._id);
    await assignMerchant(getAdminToken(), order._id, dbOrder.items[0]._id, merchant.merchant._id);

    const updated = await Order.findById(order._id);
    const payout = updated.merchantPayouts?.[0];

    // merchant base = 200×2 = 400 (8mm merchant price)
    expect(payout.itemsBaseValue).toBeCloseTo(400, 1);
    // platform commission = (250-200)×2 = 100
    expect(payout.platformCommission).toBeCloseTo(100, 1);
    // merchantGST = 200×18%×2 = 72, platformGST = 50×18%×2 = 18, total = 90
    assertGSTSplit(payout, 90, 'exclusive');
  });

  it('merchant cost never exceeds customer price (no negative commission)', async () => {
    const items = [{ productId: product._id, quantity: 2, variantLabel: '8mm' }];
    const order = await placeOrder(customer.token, {
      items, addressId: customer.address._id, customerPhone: customer.user.phone,
    });

    const dbOrder = await Order.findById(order._id);
    await assignMerchant(getAdminToken(), order._id, dbOrder.items[0]._id, merchant.merchant._id);

    const updated = await Order.findById(order._id);
    const payout = updated.merchantPayouts?.[0];

    expect(payout.platformCommission).toBeGreaterThanOrEqual(0);
    expect(payout.amountOwePlatform).toBeGreaterThanOrEqual(0);
  });

  it('merchantUnitPrice locked to variant price at assignment', async () => {
    const items = [{ productId: product._id, quantity: 2, variantLabel: '8mm' }];
    const order = await placeOrder(customer.token, {
      items, addressId: customer.address._id, customerPhone: customer.user.phone,
    });

    const dbOrder = await Order.findById(order._id);
    await assignMerchant(getAdminToken(), order._id, dbOrder.items[0]._id, merchant.merchant._id);

    const updated = await Order.findById(order._id);
    // Locked to 8mm merchant price = 200
    expect(updated.items[0].merchantUnitPrice).toBe(200);
  });
});

// ─── REGRESSION: inverted pricing ──────────────────────────────────────────────

describe('Regression: merchant price higher than admin price', () => {
  it('system caps merchant cost at customer price — no negative payout', async () => {
    await setGSTMode('exclusive');
    const c = await createCustomer();
    const m = await createMerchant();

    // Merchant mistakenly sets price HIGHER than admin price
    const { product } = await createNonVariantProduct({
      merchantId: m.merchant._id,
      adminPrice: 300,
      merchantPrice: 800, // higher than admin price — should be capped
      gstRate: 18,
    });

    const items = [{ productId: product._id, quantity: 1, variantLabel: null }];
    const order = await placeOrder(c.token, {
      items, addressId: c.address._id, customerPhone: c.user.phone,
    });

    const dbOrder = await Order.findById(order._id);
    await assignMerchant(getAdminToken(), order._id, dbOrder.items[0]._id, m.merchant._id);

    const updated = await Order.findById(order._id);
    const payout = updated.merchantPayouts?.[0];

    // Platform commission should not be negative
    expect(payout.platformCommission).toBeGreaterThanOrEqual(0);
    expect(payout.amountOwePlatform).toBeGreaterThanOrEqual(0);
    // Net payout should not exceed COD
    expect(payout.netPayout).toBeLessThanOrEqual(payout.codCollectionAmount + 0.01);
  });
});
