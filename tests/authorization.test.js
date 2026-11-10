const request = require('supertest');
const app = require('../server');
const { createTestUser, generateToken } = require('./helpers/testHelpers');

// Routes that were reachable by anonymous users or customers on production.
const FAKE_ID = '000000000000000000000000';

describe('Role enforcement on admin/merchant routes', () => {
  let customerToken;

  beforeEach(async () => {
    const customer = await createTestUser({ role: 'customer', phone: '9876500001' });
    customerToken = generateToken(customer._id);
  });

  it('rejects anonymous item rejection instead of crashing the server', async () => {
    await request(app).post(`/api/orders/${FAKE_ID}/items/${FAKE_ID}/reject`).expect(401);
    // The server must still answer afterwards.
    await request(app).get('/api/products/categories').expect(200);
  });

  it.each([
    ['post', '/api/products/categories', { name: 'Hacked' }],
    ['put', `/api/orders/${FAKE_ID}/assign-merchant`, {}],
    ['post', `/api/orders/${FAKE_ID}/items/${FAKE_ID}/reject`, {}],
    ['post', '/api/notifications/sms/send', { phone: '9876543210', message: 'spam' }],
    ['post', '/api/notifications/whatsapp/send', { phone: '9876543210', templateId: 't' }],
    ['get', '/api/merchants', null],
    ['get', `/api/order-logs/order/${FAKE_ID}`, null],
    ['post', '/api/smart-notifications/smart-merchant-selection', {}],
  ])('forbids a customer from %s %s', async (method, path, body) => {
    const req = request(app)[method](path).set('Authorization', `Bearer ${customerToken}`);
    await (body ? req.send(body) : req).expect(403);
  });

  it('blocks anonymous access to order lifecycle (customer contact details)', async () => {
    await request(app).get(`/api/orders/${FAKE_ID}/lifecycle`).expect(401);
  });

  it('still lists approved merchants for a city without login', async () => {
    await request(app).get('/api/merchants?city=Ranchi&activeStatus=approved').expect(200);
  });

  it('lets an admin create a category', async () => {
    const admin = await createTestUser({ role: 'admin', email: 'admin@example.com', phone: '9999999990' });
    await request(app)
      .post('/api/products/categories')
      .set('Authorization', `Bearer ${generateToken(admin._id)}`)
      .send({ name: 'Cement' })
      .expect(201);
  });
});
