const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const { createTestUser, generateToken } = require('./helpers/testHelpers');

describe('User API Tests', () => {
  describe('GET /api/users', () => {
    it('should get all users (admin only)', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin._id, 'admin');

      // Create test users
      await createTestUser({ email: 'user1@example.com' });
      await createTestUser({ email: 'user2@example.com' });

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('users');
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.users.length).toBeGreaterThanOrEqual(3); // admin + 2 users
    });

    it('should return 403 for non-admin users', async () => {
      const customer = await createTestUser({ role: 'customer' });
      const token = generateToken(customer._id, 'customer');

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Access denied. Admin only.');
    });

    it('should filter users by role', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin._id, 'admin');

      await createTestUser({ role: 'customer', email: 'customer@example.com' });
      await createTestUser({ role: 'merchant', email: 'merchant@example.com' });

      const response = await request(app)
        .get('/api/users?role=customer')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.users.every(u => u.role === 'customer')).toBe(true);
    });

    it('should search users by name or email', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin._id, 'admin');

      await createTestUser({ name: 'John Doe', email: 'john@example.com' });
      await createTestUser({ name: 'Jane Smith', email: 'jane@example.com' });

      const response = await request(app)
        .get('/api/users?search=john')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.users.length).toBe(1);
      expect(response.body.users[0].name).toBe('John Doe');
    });
  });

  describe('GET /api/users/profile', () => {
    it('should get current user profile', async () => {
      const user = await createTestUser();
      const token = generateToken(user._id, user.role);

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('_id', user._id.toString());
      expect(response.body.user).toHaveProperty('name', user.name);
      expect(response.body.user).toHaveProperty('email', user.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should update current user profile', async () => {
      const user = await createTestUser();
      const token = generateToken(user._id, user.role);

      const updateData = {
        name: 'Updated Name',
        phone: '9876543210',
        address: 'Updated Address',
        area: 'Updated Area'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Profile updated successfully');
      expect(response.body.user).toHaveProperty('name', updateData.name);
      expect(response.body.user).toHaveProperty('phone', updateData.phone);
      expect(response.body.user).toHaveProperty('address', updateData.address);
      expect(response.body.user).toHaveProperty('area', updateData.area);
    });

    it('should return 400 for invalid email format', async () => {
      const user = await createTestUser();
      const token = generateToken(user._id, user.role);

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });

    it('should return 400 for duplicate email', async () => {
      const user1 = await createTestUser({ email: 'user1@example.com' });
      const user2 = await createTestUser({ email: 'user2@example.com' });
      const token = generateToken(user2._id, user2.role);

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'user1@example.com' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Email already exists');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .send({ name: 'Updated Name' })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/users/:id/status', () => {
    it('should update user status (admin only)', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin._id, 'admin');
      const user = await createTestUser({ isActive: true });

      const response = await request(app)
        .put(`/api/users/${user._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: false })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'User status updated successfully');
      expect(response.body.user).toHaveProperty('isActive', false);
    });

    it('should return 403 for non-admin users', async () => {
      const customer = await createTestUser({ role: 'customer' });
      const token = generateToken(customer._id, 'customer');
      const user = await createTestUser();

      const response = await request(app)
        .put(`/api/users/${user._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: false })
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 for non-existent user', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin._id, 'admin');

      const response = await request(app)
        .put('/api/users/507f1f77bcf86cd799439011/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: false })
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'User not found');
    });

    it('should return 400 for invalid status value', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin._id, 'admin');
      const user = await createTestUser();

      const response = await request(app)
        .put(`/api/users/${user._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: 'invalid' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/users/:id/role', () => {
    it('should update user role (admin only)', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin._id, 'admin');
      const user = await createTestUser({ role: 'customer' });

      const response = await request(app)
        .put(`/api/users/${user._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'merchant' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'User role updated successfully');
      expect(response.body.user).toHaveProperty('role', 'merchant');
    });

    it('should return 403 for non-admin users', async () => {
      const customer = await createTestUser({ role: 'customer' });
      const token = generateToken(customer._id, 'customer');
      const user = await createTestUser();

      const response = await request(app)
        .put(`/api/users/${user._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'merchant' })
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 for invalid role', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin._id, 'admin');
      const user = await createTestUser();

      const response = await request(app)
        .put(`/api/users/${user._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'invalid-role' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 for changing admin role', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin._id, 'admin');
      const anotherAdmin = await createTestUser({ role: 'admin' });

      const response = await request(app)
        .put(`/api/users/${anotherAdmin._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'customer' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Cannot change admin role');
    });
  });

  describe('GET /api/users/areas', () => {
    it('should get all unique areas', async () => {
      await createTestUser({ area: 'Downtown' });
      await createTestUser({ area: 'Uptown' });
      await createTestUser({ area: 'Downtown' }); // duplicate
      await createTestUser({ area: 'Suburbs' });

      const response = await request(app)
        .get('/api/users/areas')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('areas');
      expect(Array.isArray(response.body.areas)).toBe(true);
      expect(response.body.areas).toContain('Downtown');
      expect(response.body.areas).toContain('Uptown');
      expect(response.body.areas).toContain('Suburbs');
      expect(response.body.areas.length).toBe(3); // unique areas only
    });

    it('should return empty array when no users exist', async () => {
      const response = await request(app)
        .get('/api/users/areas')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.areas).toEqual([]);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user (admin only)', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin._id, 'admin');
      const user = await createTestUser();

      const response = await request(app)
        .delete(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'User deleted successfully');

      // Verify user is deleted
      const deletedUser = await User.findById(user._id);
      expect(deletedUser).toBeNull();
    });

    it('should return 403 for non-admin users', async () => {
      const customer = await createTestUser({ role: 'customer' });
      const token = generateToken(customer._id, 'customer');
      const user = await createTestUser();

      const response = await request(app)
        .delete(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 for non-existent user', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin._id, 'admin');

      const response = await request(app)
        .delete('/api/users/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'User not found');
    });

    it('should return 400 for deleting admin user', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin._id, 'admin');
      const anotherAdmin = await createTestUser({ role: 'admin' });

      const response = await request(app)
        .delete(`/api/users/${anotherAdmin._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Cannot delete admin user');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by ID (admin only)', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin._id, 'admin');
      const user = await createTestUser();

      const response = await request(app)
        .get(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('_id', user._id.toString());
      expect(response.body.user).toHaveProperty('name', user.name);
      expect(response.body.user).toHaveProperty('email', user.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 403 for non-admin users', async () => {
      const customer = await createTestUser({ role: 'customer' });
      const token = generateToken(customer._id, 'customer');
      const user = await createTestUser();

      const response = await request(app)
        .get(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 for non-existent user', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin._id, 'admin');

      const response = await request(app)
        .get('/api/users/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'User not found');
    });
  });
});
