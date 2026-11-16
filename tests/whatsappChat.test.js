const request = require('supertest');
const app = require('../server');
const AppSettings = require('../models/AppSettings');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const WhatsAppOptOut = require('../models/WhatsAppOptOut');
const WhatsAppChatService = require('../services/WhatsAppChatService');
const { createTestUser, generateToken } = require('./helpers/testHelpers');

/** Shape of a real MSG91 inbound callback (captured 16 Nov 2026), with test values. */
const inbound = (text, extra = {}) => ({
  crqid: '', companyId: '471309', customerNumber: '918553545862', customerName: 'ayush', requestId: '', reason: '',
  uuid: `wamid.${Math.random().toString(36).slice(2)}`, integratedNumber: '916201176610', contentType: 'text',
  text, messageType: 'text', webhookType: '', ts: new Date().toISOString(), ...extra,
});
const hook = (payload) => request(app).post('/api/webhooks/msg91-whatsapp').send(payload);

describe('WhatsApp chat', () => {
  let token;
  let sendSpy;

  beforeEach(async () => {
    const admin = await createTestUser({ role: 'admin', email: 'admin@example.com', phone: '9999999990' });
    token = generateToken(admin._id);
    sendSpy = jest.spyOn(WhatsAppChatService, 'sendText').mockResolvedValue({ success: true, providerId: 'uuid-1' });
  });
  afterEach(() => jest.restoreAllMocks());

  const api = (method, path) => request(app)[method](`/api/whatsapp-chat${path}`).set('Authorization', `Bearer ${token}`);

  it('saves customer replies into a chat with an unread count, ignoring duplicate deliveries', async () => {
    const first = inbound('Bill mein 2 bag kam hai');
    await hook(first).expect(200);
    await hook(first).expect(200); // MSG91 retry of the same message
    await hook(inbound('please check')).expect(200);

    const { body } = await api('get', '/chats').expect(200);
    expect(body.chats).toHaveLength(1);
    expect(body.chats[0]).toMatchObject({ phone: '8553545862', name: 'ayush', unread: 2, lastText: 'please check', windowOpen: true });
    expect((await api('get', '/unread').expect(200)).body.unread).toBe(2);
  });

  it('opening a chat returns messages oldest first and marks it read', async () => {
    await hook(inbound('one')).expect(200);
    await hook(inbound('two')).expect(200);
    const { body } = await api('get', '/chats/8553545862/messages').expect(200);
    expect(body.messages.map((m) => m.text)).toEqual(['one', 'two']);
    expect((await api('get', '/unread').expect(200)).body.unread).toBe(0);
  });

  it('replies within 24 hours and records the outgoing message', async () => {
    await hook(inbound('hello')).expect(200);
    const res = await api('post', '/chats/8553545862/messages').send({ text: 'Ji, check karke batate hain' }).expect(201);
    expect(sendSpy).toHaveBeenCalledWith('8553545862', 'Ji, check karke batate hain');
    expect(res.body.message).toMatchObject({ direction: 'out', status: 'sent', providerId: 'uuid-1' });
    const chats = (await api('get', '/chats').expect(200)).body.chats;
    expect(chats[0]).toMatchObject({ lastDirection: 'out', lastText: 'Ji, check karke batate hain' });
  });

  it('refuses free-text replies after the 24-hour window', async () => {
    await hook(inbound('old', { ts: new Date(Date.now() - 25 * 3600 * 1000).toISOString() })).expect(200);
    const res = await api('post', '/chats/8553545862/messages').send({ text: 'hi' }).expect(400);
    expect(res.body.message).toMatch(/24 hours/);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('marks a failed send as failed instead of sent', async () => {
    sendSpy.mockResolvedValue({ success: false, error: 'Re-engagement message' });
    await hook(inbound('hello')).expect(200);
    await api('post', '/chats/8553545862/messages').send({ text: 'hi' }).expect(502);
    expect(await WhatsAppMessage.findOne({ direction: 'out' }).lean()).toMatchObject({ status: 'failed', error: 'Re-engagement message' });
  });

  it('auto-replies once per customer per 24 hours when enabled, never to STOP', async () => {
    await AppSettings.create({ whatsappChat: { autoReplyEnabled: true, autoReplyText: 'Thanks! Call 92415 14013' } });
    await hook(inbound('hi')).expect(200);
    await hook(inbound('are you there?')).expect(200);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy).toHaveBeenCalledWith('8553545862', 'Thanks! Call 92415 14013');

    sendSpy.mockClear();
    await hook(inbound('STOP', { customerNumber: '919876500001' })).expect(200);
    expect(sendSpy).not.toHaveBeenCalled();
    expect(await WhatsAppOptOut.exists({ phone: '9876500001' })).toBeTruthy();
  });

  it('updates outgoing messages from MSG91 delivery reports', async () => {
    await hook(inbound('hello')).expect(200);
    await api('post', '/chats/8553545862/messages').send({ text: 'hi' }).expect(201);
    await hook({ webhookType: 'outbound', requestId: 'uuid-1', status: 'delivered', customerNumber: '918553545862' }).expect(200);
    expect((await WhatsAppMessage.findOne({ direction: 'out' }).lean()).status).toBe('delivered');
  });

  it('ignores MSG91 test (dryRun) callbacks', async () => {
    await hook(inbound('Hello, this is a sample', { dryRun: true })).expect(200);
    expect((await api('get', '/chats').expect(200)).body.chats).toHaveLength(0);
  });

  it('rejects webhook calls without the token once a token is configured', async () => {
    process.env.MSG91_WEBHOOK_TOKEN = 'secret123';
    try {
      await hook(inbound('fake')).expect(401);
      await request(app).post('/api/webhooks/msg91-whatsapp?token=secret123').send(inbound('real')).expect(200);
      expect((await api('get', '/chats').expect(200)).body.chats[0].lastText).toBe('real');
    } finally {
      delete process.env.MSG91_WEBHOOK_TOKEN;
    }
  });

  it('is admin-only', async () => {
    const customer = await createTestUser({ role: 'customer', email: 'c@example.com', phone: '9876500001' });
    await request(app).get('/api/whatsapp-chat/chats').set('Authorization', `Bearer ${generateToken(customer._id)}`).expect(403);
    await request(app).get('/api/whatsapp-chat/chats').expect(401);
  });
});
