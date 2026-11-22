/**
 * App first-order discount ("App पर पहले ऑर्डर पर ₹50 छूट").
 *
 * Protects:
 *  - Server-side eligibility: first app order with items subtotal ≥ ₹1,000 gets ₹50 off;
 *    a second app order and any web order get nothing; a cancelled app order doesn't count.
 *  - Cart preview total matches the placed order total.
 *  - GST is untouched and the merchant's netPayout is identical with/without the discount
 *    (the platform absorbs it via a lower amountOwePlatform).
 */

const request = require('supertest');
const app = require('../server');
const Order = require('../models/Order');
const { setGSTMode, createCustomer, createMerchant, createNonVariantProduct } = require('./helpers/fixtures');

const APP = { 'X-Client': 'app', 'X-App-Version': '1.0.0' };

async function getCartTotals(token, items, addressId, headers = {}) {
  const res = await request(app)
    .post('/api/orders/calculate-cart-totals')
    .set('Authorization', `Bearer ${token}`)
    .set(headers)
    .send({ items, addressId })
    .expect(200);
  return res.body;
}

async function placeOrder(customer, items, headers = {}) {
  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${customer.token}`)
    .set(headers)
    .send({
      items,
      addressId: customer.address._id,
      customerPhone: customer.user.phone,
      customerAddress: 'Test Street, Beguru',
      customerArea: 'Beguru',
      paymentMethod: 'cod',
      deliveryLocation: null,
    })
    .expect(201);
  return res.body.order;
}

async function getOffer(customer) {
  const res = await request(app)
    .get('/api/orders/app-offer')
    .set('Authorization', `Bearer ${customer.token}`)
    .expect(200);
  return res.body;
}

async function assignAndGetPayout(orderId, merchantId) {
  const dbOrder = await Order.findById(orderId);
  // verifyToken loads the user from the DB, so the admin must exist.
  const admin = await createCustomer({ role: 'admin' });
  const res = await request(app)
    .put(`/api/orders/${orderId}/assign-merchant`)
    .set('Authorization', `Bearer ${admin.token}`)
    .send({ merchantId, itemId: dbOrder.items[0]._id })
    .expect(200);
  return res.body.order.merchantPayouts[0];
}

describe('App first-order ₹50 discount', () => {
  let customer, merchant, items, smallItems;

  beforeEach(async () => {
    await setGSTMode('exclusive');
    customer = await createCustomer();
    merchant = await createMerchant();
    const { product } = await createNonVariantProduct({
      merchantId: merchant.merchant._id, adminPrice: 600, merchantPrice: 500, gstRate: 18,
    });
    items = [{ productId: product._id, quantity: 2, variantLabel: null }];      // subtotal 1200
    smallItems = [{ productId: product._id, quantity: 1, variantLabel: null }]; // subtotal 600
  });

  it('first app order ≥ ₹1,000 gets ₹50; preview matches; GST unchanged; second app order gets none', async () => {
    expect(await getOffer(customer)).toEqual({ eligible: true, amount: 50, minSubtotal: 1000 });

    const webTotals = await getCartTotals(customer.token, items, customer.address._id);
    const appTotals = await getCartTotals(customer.token, items, customer.address._id, APP);
    expect(webTotals.appFirstOrderDiscount).toBe(0);
    expect(appTotals.appFirstOrderDiscount).toBe(50);
    expect(appTotals.totalAmount).toBeCloseTo(webTotals.totalAmount - 50, 2);
    expect(appTotals.tax).toBe(webTotals.tax);

    const first = await placeOrder(customer, items, APP);
    expect(first.source).toBe('app');
    expect(first.appFirstOrderDiscount).toBe(50);
    expect(first.totalAmount).toBeCloseTo(appTotals.totalAmount, 2);
    expect(first.tax).toBe(webTotals.tax);

    expect((await getOffer(customer)).eligible).toBe(false);
    const second = await placeOrder(customer, items, APP);
    expect(second.appFirstOrderDiscount || 0).toBe(0);
    expect(second.totalAmount).toBeCloseTo(webTotals.totalAmount, 2);
  });

  it('web orders and sub-₹1,000 app orders get no discount; a cancelled app order does not count', async () => {
    const web = await placeOrder(customer, items);
    expect(web.source).toBe('web');
    expect(web.appFirstOrderDiscount || 0).toBe(0);
    expect((await getOffer(customer)).eligible).toBe(true); // web orders don't consume the app offer

    const small = await placeOrder(customer, smallItems, APP);
    expect(small.appFirstOrderDiscount || 0).toBe(0);

    await Order.updateOne({ _id: small._id }, { orderStatus: 'cancelled' });
    expect((await getOffer(customer)).eligible).toBe(true);
    const eligible = await placeOrder(customer, items, APP);
    expect(eligible.appFirstOrderDiscount).toBe(50);
  });

  it('merchant payout is identical with and without the discount (platform absorbs it)', async () => {
    const web = await placeOrder(customer, items);
    const appOrder = await placeOrder(customer, items, APP);
    expect(appOrder.appFirstOrderDiscount).toBe(50);

    const webPayout = await assignAndGetPayout(web._id, merchant.merchant._id);
    const appPayout = await assignAndGetPayout(appOrder._id, merchant.merchant._id);

    expect(appPayout.netPayout).toBeCloseTo(webPayout.netPayout, 2);
    expect(appPayout.itemsBaseValue).toBe(webPayout.itemsBaseValue);
    expect(appPayout.merchantGSTShare).toBe(webPayout.merchantGSTShare);
    expect(appPayout.platformGSTShare).toBe(webPayout.platformGSTShare);
    expect(appPayout.platformPromoShare).toBe(50);
    expect(webPayout.platformPromoShare || 0).toBe(0);
    // Customer pays ₹50 less, merchant collects ₹50 less and owes the platform ₹50 less
    expect(appPayout.codCollectionAmount).toBeCloseTo(appOrder.totalAmount, 2);
    expect(appPayout.codCollectionAmount).toBeCloseTo(webPayout.codCollectionAmount - 50, 2);
    expect(appPayout.amountOwePlatform).toBeCloseTo(webPayout.amountOwePlatform - 50, 2);
  });
});
