const request = require('supertest');
const app = require('../server');
const { createTestUser, generateToken } = require('./helpers/testHelpers');

const VALID = {
  kind: 'individual',
  name: 'Ramesh Kumar',
  phone: '9876501234',
  trades: ['mason'],
  areas: ['Kadru'],
  experienceYears: 12,
  consentGiven: true,
};

describe('Professionals (admin registration)', () => {
  let adminToken;
  let customerToken;

  beforeEach(async () => {
    const admin = await createTestUser({ role: 'admin', email: 'admin@example.com', phone: '9999999990' });
    const customer = await createTestUser({ role: 'customer', email: 'c@example.com', phone: '9876500001' });
    adminToken = generateToken(admin._id);
    customerToken = generateToken(customer._id);
  });

  const asAdmin = (method, path) => request(app)[method](path).set('Authorization', `Bearer ${adminToken}`);

  it('is admin-only', async () => {
    await request(app).get('/api/professionals').expect(401);
    await request(app).get('/api/professionals').set('Authorization', `Bearer ${customerToken}`).expect(403);
    await request(app).post('/api/professionals').set('Authorization', `Bearer ${customerToken}`).send(VALID).expect(403);
  });

  it('registers a contractor with team strength', async () => {
    const res = await asAdmin('post', '/api/professionals')
      .send({ ...VALID, kind: 'contractor', trades: ['mason', 'labour'], team: [{ trade: 'mason', count: 6 }, { trade: 'labour', count: 10 }] })
      .expect(201);
    expect(res.body.professional.teamTotal).toBe(16);

    const list = await asAdmin('get', '/api/professionals').expect(200);
    expect(list.body.professionals).toHaveLength(1);
    expect(list.body.professionals[0].teamTotal).toBe(16);
  });

  it.each([
    ['name', { name: '' }],
    ['phone', { phone: '12345' }],
    ['trades', { trades: [] }],
    ['areas', { areas: [] }],
    ['experience', { experienceYears: undefined }],
    ['consent', { consentGiven: false }],
  ])('rejects missing/invalid %s', async (_, override) => {
    const res = await asAdmin('post', '/api/professionals').send({ ...VALID, ...override }).expect(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects a team on an individual when editing', async () => {
    const created = await asAdmin('post', '/api/professionals').send(VALID).expect(201);
    // pickEditable drops the team only when kind=individual is sent; without kind the document validator must catch it.
    await asAdmin('put', `/api/professionals/${created.body.professional._id}`)
      .send({ team: [{ trade: 'mason', count: 3 }] })
      .expect(400);
  });

  it('clears the team when a contractor is changed to individual', async () => {
    const created = await asAdmin('post', '/api/professionals')
      .send({ ...VALID, kind: 'contractor', team: [{ trade: 'mason', count: 4 }] })
      .expect(201);
    const res = await asAdmin('put', `/api/professionals/${created.body.professional._id}`)
      .send({ kind: 'individual', team: [{ trade: 'mason', count: 4 }] })
      .expect(200);
    expect(res.body.professional.team).toHaveLength(0);
    expect(res.body.professional.teamTotal).toBe(0);
  });

  it('rejects a duplicate phone with 409', async () => {
    await asAdmin('post', '/api/professionals').send(VALID).expect(201);
    const res = await asAdmin('post', '/api/professionals').send({ ...VALID, name: 'Someone Else' }).expect(409);
    expect(res.body.message).toMatch(/already registered/);
  });
});
