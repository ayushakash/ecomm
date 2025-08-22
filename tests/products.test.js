const request = require('supertest');
const app = require('../server');
const Product = require('../models/Product');
const { createTestUser, createTestProduct, generateToken } = require('./helpers/testHelpers');

describe('Product API Tests', () => {
  describe('POST /api/products', () => {
    it('should add a new product (merchant/admin only)', async () => {
      const { user, merchant } = await createTestProduct();
      const token = generateToken(user._id, 'merchant');

      const productData = {
        name: 'Premium Cement',
        description: 'High quality premium cement',
        category: 'Cement',
        price: 450,
        unit: 'bag',
        stock: 50,
        merchantId: merchant._id,
        enabled: true,
        images: ['premium-cement.jpg'],
        specifications: { weight: '50kg', brand: 'Premium Brand' },
        tags: ['cement', 'premium', 'construction'],
        rating: 4.8,
        minOrderQuantity: 1,
        deliveryTime: '1-2 days'
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send(productData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Product added successfully');
      expect(response.body).toHaveProperty('product');
      expect(response.body.product).toHaveProperty('name', productData.name);
      expect(response.body.product).toHaveProperty('price', productData.price);
      expect(response.body.product).toHaveProperty('merchantId', merchant._id.toString());
    });

    it('should return 403 for non-merchant/admin users', async () => {
      const customer = await createTestUser({ role: 'customer' });
      const token = generateToken(customer._id, 'customer');

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Product',
          category: 'Cement',
          price: 350,
          stock: 100
        })
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 for missing required fields', async () => {
      const { user } = await createTestProduct();
      const token = generateToken(user._id, 'merchant');

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Product'
          // missing required fields
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });

    it('should return 400 for invalid price', async () => {
      const { user, merchant } = await createTestProduct();
      const token = generateToken(user._id, 'merchant');

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Product',
          category: 'Cement',
          price: -100, // invalid negative price
          stock: 100,
          merchantId: merchant._id
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/products', () => {
    it('should get all products with pagination', async () => {
      // Create test products
      await createTestProduct({ name: 'Product 1' });
      await createTestProduct({ name: 'Product 2' });
      await createTestProduct({ name: 'Product 3' });

      const response = await request(app)
        .get('/api/products?page=1&limit=2')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.products)).toBe(true);
      expect(response.body.products.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination).toHaveProperty('currentPage', 1);
      expect(response.body.pagination).toHaveProperty('totalPages');
      expect(response.body.pagination).toHaveProperty('totalProducts');
    });

    it('should filter products by category', async () => {
      await createTestProduct({ category: 'Cement' });
      await createTestProduct({ category: 'Sand' });
      await createTestProduct({ category: 'Cement' });

      const response = await request(app)
        .get('/api/products?category=Cement')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.products.every(p => p.category === 'Cement')).toBe(true);
    });

    it('should search products by name', async () => {
      await createTestProduct({ name: 'Premium Cement' });
      await createTestProduct({ name: 'Regular Cement' });
      await createTestProduct({ name: 'Sand' });

      const response = await request(app)
        .get('/api/products?search=cement')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.products.length).toBe(2);
      expect(response.body.products.every(p => 
        p.name.toLowerCase().includes('cement')
      )).toBe(true);
    });

    it('should filter by price range', async () => {
      await createTestProduct({ price: 300 });
      await createTestProduct({ price: 500 });
      await createTestProduct({ price: 700 });

      const response = await request(app)
        .get('/api/products?minPrice=400&maxPrice=600')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.products.every(p => 
        p.price >= 400 && p.price <= 600
      )).toBe(true);
    });

    it('should only return enabled products by default', async () => {
      await createTestProduct({ enabled: true });
      await createTestProduct({ enabled: false });
      await createTestProduct({ enabled: true });

      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.products.every(p => p.enabled === true)).toBe(true);
    });
  });

  describe('GET /api/products/categories', () => {
    it('should get all unique categories', async () => {
      await createTestProduct({ category: 'Cement' });
      await createTestProduct({ category: 'Sand' });
      await createTestProduct({ category: 'TMT Bars' });
      await createTestProduct({ category: 'Cement' }); // duplicate

      const response = await request(app)
        .get('/api/products/categories')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('categories');
      expect(Array.isArray(response.body.categories)).toBe(true);
      expect(response.body.categories).toContain('Cement');
      expect(response.body.categories).toContain('Sand');
      expect(response.body.categories).toContain('TMT Bars');
      expect(response.body.categories.length).toBe(3); // unique categories only
    });
  });

  describe('GET /api/products/:id', () => {
    it('should get product by ID', async () => {
      const { product } = await createTestProduct();

      const response = await request(app)
        .get(`/api/products/${product._id}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('product');
      expect(response.body.product).toHaveProperty('_id', product._id.toString());
      expect(response.body.product).toHaveProperty('name', product.name);
      expect(response.body.product).toHaveProperty('merchant');
    });

    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .get('/api/products/507f1f77bcf86cd799439011')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Product not found');
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update product (merchant/admin only)', async () => {
      const { user, product } = await createTestProduct();
      const token = generateToken(user._id, 'merchant');

      const updateData = {
        name: 'Updated Product Name',
        price: 400,
        stock: 75,
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/products/${product._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Product updated successfully');
      expect(response.body.product).toHaveProperty('name', updateData.name);
      expect(response.body.product).toHaveProperty('price', updateData.price);
      expect(response.body.product).toHaveProperty('stock', updateData.stock);
    });

    it('should return 403 for non-merchant/admin users', async () => {
      const customer = await createTestUser({ role: 'customer' });
      const token = generateToken(customer._id, 'customer');
      const { product } = await createTestProduct();

      const response = await request(app)
        .put(`/api/products/${product._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name' })
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 for non-existent product', async () => {
      const { user } = await createTestProduct();
      const token = generateToken(user._id, 'merchant');

      const response = await request(app)
        .put('/api/products/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/products/:id/stock', () => {
    it('should update product stock (merchant/admin only)', async () => {
      const { user, product } = await createTestProduct();
      const token = generateToken(user._id, 'merchant');

      const response = await request(app)
        .put(`/api/products/${product._id}/stock`)
        .set('Authorization', `Bearer ${token}`)
        .send({ stock: 150 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Stock updated successfully');
      expect(response.body.product).toHaveProperty('stock', 150);
    });

    it('should return 400 for negative stock', async () => {
      const { user, product } = await createTestProduct();
      const token = generateToken(user._id, 'merchant');

      const response = await request(app)
        .put(`/api/products/${product._id}/stock`)
        .set('Authorization', `Bearer ${token}`)
        .send({ stock: -10 })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/products/:id/toggle', () => {
    it('should toggle product enabled status (merchant/admin only)', async () => {
      const { user, product } = await createTestProduct();
      const token = generateToken(user._id, 'merchant');

      // Initially enabled
      expect(product.enabled).toBe(true);

      const response = await request(app)
        .put(`/api/products/${product._id}/toggle`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Product status updated successfully');
      expect(response.body.product).toHaveProperty('enabled', false);
    });

    it('should return 403 for non-merchant/admin users', async () => {
      const customer = await createTestUser({ role: 'customer' });
      const token = generateToken(customer._id, 'customer');
      const { product } = await createTestProduct();

      const response = await request(app)
        .put(`/api/products/${product._id}/toggle`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should delete product (merchant/admin only)', async () => {
      const { user, product } = await createTestProduct();
      const token = generateToken(user._id, 'merchant');

      const response = await request(app)
        .delete(`/api/products/${product._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Product deleted successfully');

      // Verify product is deleted
      const getResponse = await request(app)
        .get(`/api/products/${product._id}`)
        .expect(404);
    });

    it('should return 403 for non-merchant/admin users', async () => {
      const customer = await createTestUser({ role: 'customer' });
      const token = generateToken(customer._id, 'customer');
      const { product } = await createTestProduct();

      const response = await request(app)
        .delete(`/api/products/${product._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/products/merchant/me', () => {
    it('should get current merchant products (merchant only)', async () => {
      const { user, merchant } = await createTestProduct();
      const token = generateToken(user._id, 'merchant');

      // Create another product for the same merchant
      await createTestProduct({ merchantId: merchant._id });

      const response = await request(app)
        .get('/api/products/merchant/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('products');
      expect(Array.isArray(response.body.products)).toBe(true);
      expect(response.body.products.length).toBeGreaterThanOrEqual(2);
      expect(response.body.products.every(p => 
        p.merchantId === merchant._id.toString()
      )).toBe(true);
    });

    it('should return 403 for non-merchant users', async () => {
      const customer = await createTestUser({ role: 'customer' });
      const token = generateToken(customer._id, 'customer');

      const response = await request(app)
        .get('/api/products/merchant/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});
