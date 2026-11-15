const request = require('supertest');
const app = require('../server');
const { createTestUser, generateToken } = require('./helpers/testHelpers');

const PLAY = 'https://play.google.com/store/apps/details?id=in.chardeevari.app';

describe('GET /app short link', () => {
  let adminToken;
  let customerToken;

  beforeEach(async () => {
    const admin = await createTestUser({ role: 'admin', email: 'admin@example.com', phone: '9999999990' });
    const customer = await createTestUser({ role: 'customer', email: 'c@example.com', phone: '9876500001' });
    adminToken = generateToken(admin._id);
    customerToken = generateToken(customer._id);
  });

  it('redirects to the website when no app link is set', async () => {
    const res = await request(app).get('/app').expect(302);
    expect(res.headers.location).toBe('https://chardeevari.in');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('follows the app link saved in admin settings, and changes take effect immediately', async () => {
    await request(app).put('/api/settings').set('Authorization', `Bearer ${adminToken}`).send({ appLinkUrl: PLAY }).expect(200);
    expect((await request(app).get('/app').expect(302)).headers.location).toBe(PLAY);

    await request(app).put('/api/settings').set('Authorization', `Bearer ${adminToken}`).send({ appLinkUrl: '' }).expect(200);
    expect((await request(app).get('/app').expect(302)).headers.location).toBe('https://chardeevari.in');
  });

  it('rejects a link that is not a full http(s) URL', async () => {
    await request(app).put('/api/settings').set('Authorization', `Bearer ${adminToken}`).send({ appLinkUrl: 'play.google.com/store' }).expect(400);
    await request(app).put('/api/settings').set('Authorization', `Bearer ${adminToken}`).send({ appLinkUrl: 'javascript:alert(1)' }).expect(400);
  });

  it('only admins can change it', async () => {
    await request(app).put('/api/settings').set('Authorization', `Bearer ${customerToken}`).send({ appLinkUrl: 'https://evil.example' }).expect(403);
    expect((await request(app).get('/app').expect(302)).headers.location).toBe('https://chardeevari.in');
  });
});
