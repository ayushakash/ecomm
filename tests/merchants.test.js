const request = require('supertest');
const app = require('../server');
const Merchant = require('../models/Merchant');
const User = require('../models/User');
const { createTestUser, createTestMerchant, generateToken } = require('./helpers/testHelpers');

describe('Merchant API Tests', () => {
  describe('POST /api/merchants/onboard', () => {
    it('should onboard a merchant successfully (admin only)', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin._id, 'admin');

      const merchantData = {
        userId: admin._id,
        name: 'New Merchant Store',
        contact: '9876543210',
        area: 'Downtown',
        address: '789 Business St',
        businessType: 'Hardware Store',
        activeStatus: 'active'
      };

      const response = await request(app)
        .post('/api/merchants/onboard')
        .set('Authorization', `Bearer ${token}`)
        .send(merchantData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Merchant onboarded successfully');
      expect(response.body).toHaveProperty('merchant');
      expect(response.body.merchant).toHaveProperty('name', merchantData.name);
      expect(response.body.merchant).toHaveProperty('activeStatus', 'active');
    });

    it('should return 403 for non-admin users', async () => {
      const customer = await createTestUser({ role: 'customer' });
      const token = generateToken(customer._id, 'customer');

      const response = await request(app)
        .post('/api/merchants/onboard')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: customer._id,
          name: 'Test Merchant',
          contact: '1234567890',
          area: 'Test Area'
        })
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Access denied. Admin only.');
    });

    it('should return 400 for missing required fields', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin._id, 'admin');

      const response = await request(app)
        .post('/api/merchants/onboard')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Merchant'
          // missing required fields
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });

    it('should return 404 for non-existent user', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin._id, 'admin');

      const response = await request(app)
        .post('/api/merchants/onboard')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: '507f1f77bcf86cd799439011', // non-existent ObjectId
          name: 'Test Merchant',
          contact: '1234567890',
          area: 'Test Area'
        })
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'User not found');
    });
  });

  describe('GET /api/merchants', () => {
    it('should get all merchants (admin only)', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin._id, 'admin');

      // Create test merchants
      await createTestMerchant({ name: 'Merchant 1' });
      await createTestMerchant({ name: 'Merchant 2' });

      const response = await request(app)
        .get('/api/merchants')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('merchants');
      expect(Array.isArray(response.body.merchants)).toBe(true);
      expect(response.body.merchants.length).toBeGreaterThanOrEqual(2);
    });

    it('should return 403 for non-admin users', async () => {
      const customer = await createTestUser({ role: 'customer' });
      const token = generateToken(customer._id, 'customer');

      const response = await request(app)
        .get('/api/merchants')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should filter merchants by area', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin._id, 'admin');

      // Create merchants in different areas
      await createTestMerchant({ area: 'Downtown' });
      await createTestMerchant({ area: 'Uptown' });

      const response = await request(app)
        .get('/api/merchants?area=Downtown')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.merchants.every(m => m.area === 'Downtown')).toBe(true);
    });
  });

  describe('GET /api/merchants/area/:area', () => {
    it('should get merchants by area (public)', async () => {
      // Create merchants in specific area
      await createTestMerchant({ area: 'Downtown' });
      await createTestMerchant({ area: 'Downtown' });
      await createTestMerchant({ area: 'Uptown' });

      const response = await request(app)
        .get('/api/merchants/area/Downtown')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('merchants');
      expect(response.body.merchants.length).toBe(2);
      expect(response.body.merchants.every(m => m.area === 'Downtown')).toBe(true);
    });

    it('should return empty array for non-existent area', async () => {
      const response = await request(app)
        .get('/api/merchants/area/NonExistentArea')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.merchants).toEqual([]);
    });

    it('should only return active merchants', async () => {
      // Create active and inactive merchants
      await createTestMerchant({ area: 'Downtown', activeStatus: 'active' });
      await createTestMerchant({ area: 'Downtown', activeStatus: 'inactive' });

      const response = await request(app)
        .get('/api/merchants/area/Downtown')
        .expect(200);

      expect(response.body.merchants.length).toBe(1);
      expect(response.body.merchants[0].activeStatus).toBe('active');
    });
  });

  describe('GET /api/merchants/:id', () => {
    it('should get merchant by ID', async () => {
      const { merchant } = await createTestMerchant();

      const response = await request(app)
        .get(`/api/merchants/${merchant._id}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('merchant');
      expect(response.body.merchant).toHaveProperty('_id', merchant._id.toString());
      expect(response.body.merchant).toHaveProperty('name', merchant.name);
    });

    it('should return 404 for non-existent merchant', async () => {
      const response = await request(app)
        .get('/api/merchants/507f1f77bcf86cd799439011')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Merchant not found');
    });
  });

  describe('PUT /api/merchants/:id/status', () => {
    it('should update merchant status (admin only)', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin._id, 'admin');
      const { merchant } = await createTestMerchant();

      const response = await request(app)
        .put(`/api/merchants/${merchant._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ activeStatus: 'inactive' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Merchant status updated successfully');
      expect(response.body.merchant).toHaveProperty('activeStatus', 'inactive');
    });

    it('should return 403 for non-admin users', async () => {
      const customer = await createTestUser({ role: 'customer' });
      const token = generateToken(customer._id, 'customer');
      const { merchant } = await createTestMerchant();

      const response = await request(app)
        .put(`/api/merchants/${merchant._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ activeStatus: 'inactive' })
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 for non-existent merchant', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin._id, 'admin');

      const response = await request(app)
        .put('/api/merchants/507f1f77bcf86cd799439011/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ activeStatus: 'inactive' })
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/merchants/profile', () => {
    it('should update merchant profile (merchant only)', async () => {
      const { user, merchant } = await createTestMerchant();
      const token = generateToken(user._id, 'merchant');

      const updateData = {
        name: 'Updated Merchant Name',
        contact: '9876543210',
        address: 'Updated Address'
      };

      const response = await request(app)
        .put('/api/merchants/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Profile updated successfully');
      expect(response.body.merchant).toHaveProperty('name', updateData.name);
      expect(response.body.merchant).toHaveProperty('contact', updateData.contact);
    });

    it('should return 403 for non-merchant users', async () => {
      const customer = await createTestUser({ role: 'customer' });
      const token = generateToken(customer._id, 'customer');

      const response = await request(app)
        .put('/api/merchants/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name' })
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 if merchant profile not found', async () => {
      const user = await createTestUser({ role: 'merchant' });
      const token = generateToken(user._id, 'merchant');

      const response = await request(app)
        .put('/api/merchants/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Merchant profile not found');
    });
  });

  describe('GET /api/merchants/profile/me', () => {
    it('should get current merchant profile (merchant only)', async () => {
      const { user, merchant } = await createTestMerchant();
      const token = generateToken(user._id, 'merchant');

      const response = await request(app)
        .get('/api/merchants/profile/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('merchant');
      expect(response.body.merchant).toHaveProperty('_id', merchant._id.toString());
      expect(response.body.merchant).toHaveProperty('name', merchant.name);
    });

    it('should return 403 for non-merchant users', async () => {
      const customer = await createTestUser({ role: 'customer' });
      const token = generateToken(customer._id, 'customer');

      const response = await request(app)
        .get('/api/merchants/profile/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 if merchant profile not found', async () => {
      const user = await createTestUser({ role: 'merchant' });
      const token = generateToken(user._id, 'merchant');

      const response = await request(app)
        .get('/api/merchants/profile/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Merchant profile not found');
    });
  });
});
