const request = require('supertest');
const app = require('../server');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { createTestUser, createTestOrder, generateToken } = require('./helpers/testHelpers');

describe('Order API Tests', () => {
  describe('POST /api/orders', () => {
    it('should place an order successfully (customer only)', async () => {
      const { user, merchant, product } = await createTestProduct();
      const customer = await createTestUser({ role: 'customer' });
      const token = generateToken(customer._id, 'customer');

      const orderData = {
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        customerArea: customer.area,
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
        paymentMethod: 'cod',
        deliveryInstructions: 'Handle with care'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send(orderData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Order placed successfully');
      expect(response.body).toHaveProperty('order');
      expect(response.body.order).toHaveProperty('orderNumber');
      expect(response.body.order).toHaveProperty('customerId', customer._id.toString());
      expect(response.body.order).toHaveProperty('status', 'pending');
      expect(response.body.order).toHaveProperty('totalAmount', 820);
      expect(response.body.order).toHaveProperty('items');
      expect(response.body.order.items).toHaveLength(1);
    });

    it('should return 403 for non-customer users', async () => {
      const merchant = await createTestUser({ role: 'merchant' });
      const token = generateToken(merchant._id, 'merchant');

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          customerName: 'Test Customer',
          items: []
        })
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 for missing required fields', async () => {
      const customer = await createTestUser({ role: 'customer' });
      const token = generateToken(customer._id, 'customer');

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          customerName: 'Test Customer'
          // missing required fields
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });

    it('should return 400 for empty items array', async () => {
      const customer = await createTestUser({ role: 'customer' });
      const token = generateToken(customer._id, 'customer');

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          customerName: 'Test Customer',
          customerPhone: '1234567890',
          customerAddress: 'Test Address',
          customerArea: 'Test Area',
          items: [],
          subtotal: 0,
          tax: 0,
          deliveryCharge: 0,
          totalAmount: 0,
          paymentMethod: 'cod'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Order must contain at least one item');
    });

    it('should return 400 for insufficient stock', async () => {
      const { user, merchant, product } = await createTestProduct();
      const customer = await createTestUser({ role: 'customer' });
      const token = generateToken(customer._id, 'customer');

      // Set low stock
      product.stock = 1;
      await product.save();

      const orderData = {
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        customerArea: customer.area,
        items: [{
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: 5, // more than available stock
          unit: product.unit
        }],
        subtotal: 1750,
        tax: 175,
        deliveryCharge: 50,
        totalAmount: 1975,
        paymentMethod: 'cod'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send(orderData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Insufficient stock for some products');
    });

    it('should update product stock after successful order', async () => {
      const { user, merchant, product } = await createTestProduct();
      const customer = await createTestUser({ role: 'customer' });
      const token = generateToken(customer._id, 'customer');

      const initialStock = product.stock;
      const orderQuantity = 2;

      const orderData = {
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        customerArea: customer.area,
        items: [{
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: orderQuantity,
          unit: product.unit
        }],
        subtotal: 700,
        tax: 70,
        deliveryCharge: 50,
        totalAmount: 820,
        paymentMethod: 'cod'
      };

      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send(orderData)
        .expect(201);

      // Check if stock was updated
      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.stock).toBe(initialStock - orderQuantity);
    });
  });

  describe('GET /api/orders', () => {
    it('should get customer orders (customer only)', async () => {
      const { user, merchant, product, order } = await createTestOrder();
      const token = generateToken(user._id, 'customer');

      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('orders');
      expect(Array.isArray(response.body.orders)).toBe(true);
      expect(response.body.orders.length).toBeGreaterThan(0);
      expect(response.body.orders[0]).toHaveProperty('customerId', user._id.toString());
    });

    it('should get merchant orders (merchant only)', async () => {
      const { user, merchant, product, order } = await createTestOrder();
      const token = generateToken(user._id, 'merchant');

      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('orders');
      expect(Array.isArray(response.body.orders)).toBe(true);
      expect(response.body.orders.length).toBeGreaterThan(0);
      expect(response.body.orders[0]).toHaveProperty('assignedMerchantId', merchant._id.toString());
    });

    it('should get all orders (admin only)', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin._id, 'admin');
      await createTestOrder();
      await createTestOrder();

      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('orders');
      expect(Array.isArray(response.body.orders)).toBe(true);
      expect(response.body.orders.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter orders by status', async () => {
      const { user, merchant, product, order } = await createTestOrder();
      const token = generateToken(user._id, 'customer');

      const response = await request(app)
        .get('/api/orders?status=pending')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.orders.every(o => o.status === 'pending')).toBe(true);
    });

    it('should return 403 for unauthorized access', async () => {
      const response = await request(app)
        .get('/api/orders')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should get order by ID (authorized users)', async () => {
      const { user, merchant, product, order } = await createTestOrder();
      const token = generateToken(user._id, 'customer');

      const response = await request(app)
        .get(`/api/orders/${order._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('order');
      expect(response.body.order).toHaveProperty('_id', order._id.toString());
      expect(response.body.order).toHaveProperty('orderNumber');
      expect(response.body.order).toHaveProperty('items');
    });

    it('should return 404 for non-existent order', async () => {
      const user = await createTestUser({ role: 'customer' });
      const token = generateToken(user._id, 'customer');

      const response = await request(app)
        .get('/api/orders/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Order not found');
    });

    it('should return 403 for unauthorized access to order', async () => {
      const { order } = await createTestOrder();
      const otherUser = await createTestUser({ role: 'customer' });
      const token = generateToken(otherUser._id, 'customer');

      const response = await request(app)
        .get(`/api/orders/${order._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/orders/:id/assign', () => {
    it('should assign order to merchant (admin only)', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin._id, 'admin');
      const { order } = await createTestOrder();
      const { merchant: newMerchant } = await createTestProduct();

      const response = await request(app)
        .put(`/api/orders/${order._id}/assign`)
        .set('Authorization', `Bearer ${token}`)
        .send({ merchantId: newMerchant._id })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Order assigned successfully');
      expect(response.body.order).toHaveProperty('assignedMerchantId', newMerchant._id.toString());
    });

    it('should return 403 for non-admin users', async () => {
      const customer = await createTestUser({ role: 'customer' });
      const token = generateToken(customer._id, 'customer');
      const { order } = await createTestOrder();
      const { merchant } = await createTestProduct();

      const response = await request(app)
        .put(`/api/orders/${order._id}/assign`)
        .set('Authorization', `Bearer ${token}`)
        .send({ merchantId: merchant._id })
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 for non-existent merchant', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin._id, 'admin');
      const { order } = await createTestOrder();

      const response = await request(app)
        .put(`/api/orders/${order._id}/assign`)
        .set('Authorization', `Bearer ${token}`)
        .send({ merchantId: '507f1f77bcf86cd799439011' })
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Merchant not found');
    });
  });

  describe('PUT /api/orders/:id/status', () => {
    it('should update order status (merchant/admin only)', async () => {
      const { user, merchant, order } = await createTestOrder();
      const token = generateToken(user._id, 'merchant');

      const response = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'processing' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Order status updated successfully');
      expect(response.body.order).toHaveProperty('status', 'processing');
      expect(response.body.order).toHaveProperty('statusHistory');
      expect(response.body.order.statusHistory).toHaveLength(2); // initial + update
    });

    it('should return 403 for non-merchant/admin users', async () => {
      const customer = await createTestUser({ role: 'customer' });
      const token = generateToken(customer._id, 'customer');
      const { order } = await createTestOrder();

      const response = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'processing' })
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 for invalid status', async () => {
      const { user, merchant, order } = await createTestOrder();
      const token = generateToken(user._id, 'merchant');

      const response = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'invalid-status' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/orders/:id/cancel', () => {
    it('should cancel order (customer only)', async () => {
      const { user, merchant, product, order } = await createTestOrder();
      const token = generateToken(user._id, 'customer');

      const response = await request(app)
        .put(`/api/orders/${order._id}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Order cancelled successfully');
      expect(response.body.order).toHaveProperty('status', 'cancelled');
    });

    it('should return 403 for non-customer users', async () => {
      const merchant = await createTestUser({ role: 'merchant' });
      const token = generateToken(merchant._id, 'merchant');
      const { order } = await createTestOrder();

      const response = await request(app)
        .put(`/api/orders/${order._id}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 for non-cancellable order status', async () => {
      const { user, merchant, product, order } = await createTestOrder();
      const token = generateToken(user._id, 'customer');

      // Update order to delivered status
      order.status = 'delivered';
      await order.save();

      const response = await request(app)
        .put(`/api/orders/${order._id}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Order cannot be cancelled in current status');
    });

    it('should restore product stock when order is cancelled', async () => {
      const { user, merchant, product, order } = await createTestOrder();
      const token = generateToken(user._id, 'customer');

      const stockBeforeCancel = product.stock;
      const orderQuantity = order.items[0].quantity;

      const response = await request(app)
        .put(`/api/orders/${order._id}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Check if stock was restored
      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.stock).toBe(stockBeforeCancel + orderQuantity);
    });
  });

  describe('GET /api/orders/analytics/summary', () => {
    it('should get order analytics summary (admin only)', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin._id, 'admin');

      // Create orders with different statuses
      await createTestOrder({ status: 'pending' });
      await createTestOrder({ status: 'processing' });
      await createTestOrder({ status: 'delivered' });

      const response = await request(app)
        .get('/api/orders/analytics/summary')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('analytics');
      expect(response.body.analytics).toHaveProperty('totalOrders');
      expect(response.body.analytics).toHaveProperty('totalSales');
      expect(response.body.analytics).toHaveProperty('pendingOrders');
      expect(response.body.analytics).toHaveProperty('completedOrders');
      expect(response.body.analytics).toHaveProperty('averageOrderValue');
    });

    it('should return 403 for non-admin users', async () => {
      const customer = await createTestUser({ role: 'customer' });
      const token = generateToken(customer._id, 'customer');

      const response = await request(app)
        .get('/api/orders/analytics/summary')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/orders/merchant/dashboard', () => {
    it('should get merchant dashboard data (merchant only)', async () => {
      const { user, merchant, product, order } = await createTestOrder();
      const token = generateToken(user._id, 'merchant');

      const response = await request(app)
        .get('/api/orders/merchant/dashboard')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('dashboard');
      expect(response.body.dashboard).toHaveProperty('totalOrders');
      expect(response.body.dashboard).toHaveProperty('pendingOrders');
      expect(response.body.dashboard).toHaveProperty('completedOrders');
      expect(response.body.dashboard).toHaveProperty('totalRevenue');
      expect(response.body.dashboard).toHaveProperty('recentOrders');
    });

    it('should return 403 for non-merchant users', async () => {
      const customer = await createTestUser({ role: 'customer' });
      const token = generateToken(customer._id, 'customer');

      const response = await request(app)
        .get('/api/orders/merchant/dashboard')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});
