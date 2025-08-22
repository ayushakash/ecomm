const request = require('supertest');
const app = require('../server');
const { createTestUser, createTestProduct, generateToken } = require('./helpers/testHelpers');

describe('E-commerce Platform Integration Tests', () => {
  describe('Complete Customer Journey', () => {
    it('should complete full customer journey: register → browse products → place order → track order', async () => {
      // 1. Register a new customer
      const customerData = {
        name: 'John Customer',
        email: 'john.customer@example.com',
        password: 'password123',
        phone: '1234567890',
        area: 'Downtown',
        address: '123 Customer St'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(customerData)
        .expect(201);

      expect(registerResponse.body).toHaveProperty('success', true);
      expect(registerResponse.body).toHaveProperty('accessToken');
      const customerToken = registerResponse.body.accessToken;

      // 2. Browse products (public endpoint)
      const productsResponse = await request(app)
        .get('/api/products')
        .expect(200);

      expect(productsResponse.body).toHaveProperty('success', true);
      expect(productsResponse.body).toHaveProperty('products');

      // 3. Get product categories
      const categoriesResponse = await request(app)
        .get('/api/products/categories')
        .expect(200);

      expect(categoriesResponse.body).toHaveProperty('success', true);
      expect(categoriesResponse.body).toHaveProperty('categories');

      // 4. Place an order
      const { product } = await createTestProduct();
      
      const orderData = {
        customerName: customerData.name,
        customerPhone: customerData.phone,
        customerAddress: customerData.address,
        customerArea: customerData.area,
        items: [{
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: 2,
          unit: product.unit
        }],
        subtotal: product.price * 2,
        tax: (product.price * 2) * 0.1,
        deliveryCharge: 50,
        totalAmount: (product.price * 2) + ((product.price * 2) * 0.1) + 50,
        paymentMethod: 'cod',
        deliveryInstructions: 'Handle with care'
      };

      const orderResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData)
        .expect(201);

      expect(orderResponse.body).toHaveProperty('success', true);
      expect(orderResponse.body).toHaveProperty('order');
      expect(orderResponse.body.order).toHaveProperty('orderNumber');
      expect(orderResponse.body.order).toHaveProperty('status', 'pending');

      const orderId = orderResponse.body.order._id;

      // 5. View order history
      const ordersResponse = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(ordersResponse.body).toHaveProperty('success', true);
      expect(ordersResponse.body).toHaveProperty('orders');
      expect(ordersResponse.body.orders.length).toBeGreaterThan(0);

      // 6. View specific order details
      const orderDetailsResponse = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(orderDetailsResponse.body).toHaveProperty('success', true);
      expect(orderDetailsResponse.body).toHaveProperty('order');
      expect(orderDetailsResponse.body.order).toHaveProperty('_id', orderId);

      // 7. Cancel order
      const cancelResponse = await request(app)
        .put(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(cancelResponse.body).toHaveProperty('success', true);
      expect(cancelResponse.body.order).toHaveProperty('status', 'cancelled');
    });
  });

  describe('Complete Merchant Journey', () => {
    it('should complete full merchant journey: register → onboard → add products → manage orders', async () => {
      // 1. Register a new merchant
      const merchantData = {
        name: 'Merchant Store',
        email: 'merchant@example.com',
        password: 'password123',
        role: 'merchant',
        phone: '9876543210',
        area: 'Downtown',
        address: '456 Merchant Ave'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(merchantData)
        .expect(201);

      expect(registerResponse.body).toHaveProperty('success', true);
      const merchantToken = registerResponse.body.accessToken;

      // 2. Admin onboards the merchant
      const admin = await createTestUser({ role: 'admin' });
      const adminToken = generateToken(admin._id, 'admin');

      const onboardData = {
        userId: registerResponse.body.user._id,
        name: 'Merchant Store',
        contact: '9876543210',
        area: 'Downtown',
        address: '456 Merchant Ave',
        businessType: 'Hardware Store',
        activeStatus: 'active'
      };

      const onboardResponse = await request(app)
        .post('/api/merchants/onboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(onboardData)
        .expect(201);

      expect(onboardResponse.body).toHaveProperty('success', true);
      const merchantId = onboardResponse.body.merchant._id;

      // 3. Merchant adds products
      const productData = {
        name: 'Premium Cement',
        description: 'High quality premium cement for construction',
        category: 'Cement',
        price: 450,
        unit: 'bag',
        stock: 100,
        merchantId: merchantId,
        enabled: true,
        images: ['premium-cement.jpg'],
        specifications: { weight: '50kg', brand: 'Premium Brand' },
        tags: ['cement', 'premium', 'construction'],
        rating: 4.8,
        minOrderQuantity: 1,
        deliveryTime: '1-2 days'
      };

      const productResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${merchantToken}`)
        .send(productData)
        .expect(201);

      expect(productResponse.body).toHaveProperty('success', true);
      const productId = productResponse.body.product._id;

      // 4. Merchant views their products
      const merchantProductsResponse = await request(app)
        .get('/api/products/merchant/me')
        .set('Authorization', `Bearer ${merchantToken}`)
        .expect(200);

      expect(merchantProductsResponse.body).toHaveProperty('success', true);
      expect(merchantProductsResponse.body).toHaveProperty('products');
      expect(merchantProductsResponse.body.products.length).toBeGreaterThan(0);

      // 5. Merchant updates product stock
      const stockUpdateResponse = await request(app)
        .put(`/api/products/${productId}/stock`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({ stock: 150 })
        .expect(200);

      expect(stockUpdateResponse.body).toHaveProperty('success', true);
      expect(stockUpdateResponse.body.product).toHaveProperty('stock', 150);

      // 6. Merchant toggles product status
      const toggleResponse = await request(app)
        .put(`/api/products/${productId}/toggle`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .expect(200);

      expect(toggleResponse.body).toHaveProperty('success', true);
      expect(toggleResponse.body.product).toHaveProperty('enabled', false);

      // 7. Merchant views dashboard
      const dashboardResponse = await request(app)
        .get('/api/orders/merchant/dashboard')
        .set('Authorization', `Bearer ${merchantToken}`)
        .expect(200);

      expect(dashboardResponse.body).toHaveProperty('success', true);
      expect(dashboardResponse.body).toHaveProperty('dashboard');
    });
  });

  describe('Complete Admin Journey', () => {
    it('should complete full admin journey: manage users → manage merchants → manage orders → view analytics', async () => {
      // 1. Admin login
      const admin = await createTestUser({ role: 'admin' });
      const adminToken = generateToken(admin._id, 'admin');

      // 2. Admin views all users
      const usersResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(usersResponse.body).toHaveProperty('success', true);
      expect(usersResponse.body).toHaveProperty('users');

      // 3. Admin views all merchants
      const merchantsResponse = await request(app)
        .get('/api/merchants')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(merchantsResponse.body).toHaveProperty('success', true);
      expect(merchantsResponse.body).toHaveProperty('merchants');

      // 4. Admin views all orders
      const ordersResponse = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(ordersResponse.body).toHaveProperty('success', true);
      expect(ordersResponse.body).toHaveProperty('orders');

      // 5. Admin views analytics
      const analyticsResponse = await request(app)
        .get('/api/orders/analytics/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(analyticsResponse.body).toHaveProperty('success', true);
      expect(analyticsResponse.body).toHaveProperty('analytics');

      // 6. Admin manages user status
      const user = await createTestUser();
      const userStatusResponse = await request(app)
        .put(`/api/users/${user._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(userStatusResponse.body).toHaveProperty('success', true);
      expect(userStatusResponse.body.user).toHaveProperty('isActive', false);

      // 7. Admin manages merchant status
      const { merchant } = await createTestProduct();
      const merchantStatusResponse = await request(app)
        .put(`/api/merchants/${merchant._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ activeStatus: 'inactive' })
        .expect(200);

      expect(merchantStatusResponse.body).toHaveProperty('success', true);
      expect(merchantStatusResponse.body.merchant).toHaveProperty('activeStatus', 'inactive');
    });
  });

  describe('Cross-Functional Integration', () => {
    it('should handle complete order workflow: customer order → admin assignment → merchant processing → delivery', async () => {
      // Setup: Create customer, merchant, and admin
      const customer = await createTestUser({ role: 'customer' });
      const customerToken = generateToken(customer._id, 'customer');
      
      const { user: merchantUser, merchant } = await createTestProduct();
      const merchantToken = generateToken(merchantUser._id, 'merchant');
      
      const admin = await createTestUser({ role: 'admin' });
      const adminToken = generateToken(admin._id, 'admin');

      // 1. Customer places order
      const { product } = await createTestProduct({ merchantId: merchant._id });
      
      const orderData = {
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        customerArea: customer.area,
        items: [{
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: 1,
          unit: product.unit
        }],
        subtotal: product.price,
        tax: product.price * 0.1,
        deliveryCharge: 50,
        totalAmount: product.price + (product.price * 0.1) + 50,
        paymentMethod: 'cod'
      };

      const orderResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData)
        .expect(201);

      const orderId = orderResponse.body.order._id;

      // 2. Admin assigns order to merchant
      const assignResponse = await request(app)
        .put(`/api/orders/${orderId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ merchantId: merchant._id })
        .expect(200);

      expect(assignResponse.body.order).toHaveProperty('assignedMerchantId', merchant._id.toString());

      // 3. Merchant updates order status to processing
      const processingResponse = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({ status: 'processing' })
        .expect(200);

      expect(processingResponse.body.order).toHaveProperty('status', 'processing');

      // 4. Merchant updates order status to shipped
      const shippedResponse = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({ status: 'shipped' })
        .expect(200);

      expect(shippedResponse.body.order).toHaveProperty('status', 'shipped');

      // 5. Merchant updates order status to delivered
      const deliveredResponse = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({ status: 'delivered' })
        .expect(200);

      expect(deliveredResponse.body.order).toHaveProperty('status', 'delivered');

      // 6. Customer views final order status
      const finalOrderResponse = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(finalOrderResponse.body.order).toHaveProperty('status', 'delivered');
      expect(finalOrderResponse.body.order).toHaveProperty('statusHistory');
      expect(finalOrderResponse.body.order.statusHistory.length).toBe(4); // pending, processing, shipped, delivered
    });

    it('should handle product availability and stock management', async () => {
      // Setup: Create merchant and product
      const { user: merchantUser, merchant, product } = await createTestProduct();
      const merchantToken = generateToken(merchantUser._id, 'merchant');
      
      const customer = await createTestUser({ role: 'customer' });
      const customerToken = generateToken(customer._id, 'customer');

      // 1. Set low stock
      await request(app)
        .put(`/api/products/${product._id}/stock`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({ stock: 2 })
        .expect(200);

      // 2. Customer places order with quantity 1 (should succeed)
      const orderData1 = {
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        customerArea: customer.area,
        items: [{
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: 1,
          unit: product.unit
        }],
        subtotal: product.price,
        tax: product.price * 0.1,
        deliveryCharge: 50,
        totalAmount: product.price + (product.price * 0.1) + 50,
        paymentMethod: 'cod'
      };

      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData1)
        .expect(201);

      // 3. Customer tries to place order with quantity 2 (should fail - insufficient stock)
      const orderData2 = {
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
        subtotal: product.price * 2,
        tax: (product.price * 2) * 0.1,
        deliveryCharge: 50,
        totalAmount: (product.price * 2) + ((product.price * 2) * 0.1) + 50,
        paymentMethod: 'cod'
      };

      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData2)
        .expect(400);

      // 4. Merchant restocks product
      await request(app)
        .put(`/api/products/${product._id}/stock`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({ stock: 10 })
        .expect(200);

      // 5. Customer can now place order with quantity 2
      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData2)
        .expect(201);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle authentication and authorization properly', async () => {
      const customer = await createTestUser({ role: 'customer' });
      const customerToken = generateToken(customer._id, 'customer');

      // Try to access admin-only endpoint
      await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      // Try to access merchant-only endpoint
      await request(app)
        .get('/api/products/merchant/me')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      // Try to access without token
      await request(app)
        .get('/api/orders')
        .expect(401);

      // Try to access with invalid token
      await request(app)
        .get('/api/orders')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should handle concurrent order placement and stock updates', async () => {
      const { user: merchantUser, merchant, product } = await createTestProduct();
      const merchantToken = generateToken(merchantUser._id, 'merchant');
      
      const customer1 = await createTestUser({ role: 'customer' });
      const customer2 = await createTestUser({ role: 'customer' });
      
      const customer1Token = generateToken(customer1._id, 'customer');
      const customer2Token = generateToken(customer2._id, 'customer');

      // Set low stock
      await request(app)
        .put(`/api/products/${product._id}/stock`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({ stock: 1 })
        .expect(200);

      // Create order data
      const orderData = {
        customerName: 'Test Customer',
        customerPhone: '1234567890',
        customerAddress: 'Test Address',
        customerArea: 'Test Area',
        items: [{
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: 1,
          unit: product.unit
        }],
        subtotal: product.price,
        tax: product.price * 0.1,
        deliveryCharge: 50,
        totalAmount: product.price + (product.price * 0.1) + 50,
        paymentMethod: 'cod'
      };

      // Place concurrent orders
      const [order1Response, order2Response] = await Promise.all([
        request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${customer1Token}`)
          .send(orderData),
        request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${customer2Token}`)
          .send(orderData)
      ]);

      // One should succeed, one should fail
      const successCount = [order1Response.status, order2Response.status].filter(status => status === 201).length;
      const failureCount = [order1Response.status, order2Response.status].filter(status => status === 400).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);
    });
  });
});
