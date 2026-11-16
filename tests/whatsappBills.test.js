const request = require('supertest');
const XLSX = require('xlsx');
const app = require('../server');
const AppSettings = require('../models/AppSettings');
const BillMessage = require('../models/BillMessage');
const WhatsAppBillService = require('../services/WhatsAppBillService');
const { createTestUser, generateToken } = require('./helpers/testHelpers');

process.env.BILL_SEND_DELAY_MS = '0';

/** A sales report in the billing app's .xls layout (title-free, same headers). */
function report(rows) {
  const header = ['S.No', 'Date', 'Party name', 'Party Phone No.', 'Inv No.', 'Txn Type', 'Due Date', 'Status', 'Total', 'Received', 'Bal'];
  const sheet = XLSX.utils.aoa_to_sheet([header, [], ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Sales Report');
  return XLSX.write(wb, { type: 'buffer', bookType: 'biff8' }); // old .xls format, as exported
}

const ROWS = [
  ['1', '15 Nov 26', 'Walk In', '', '504', 'SALE_INVOICE', '-', 'CASH', '₹ 320', '₹ 320', '₹ 0'],
  ['2', '15 Nov 26', 'prakash Naya toli', '9334003859', '502', 'SALE_INVOICE', '-', 'UNPAID', '₹ 20,620', '₹ 0', '₹ 20,620'],
  ['3', '14 Nov 26', 'Abhisek Pandey', '+91 98355-43245', '494', 'SALE_INVOICE', '-', 'ONLINE', '₹ 1,320', '₹ 1,320', '₹ 0'],
  ['4', '14 Nov 26', 'Bad Number', '12345', '493', 'SALE_INVOICE', '-', 'CASH', '₹ 100', '₹ 100', '₹ 0'],
];

const waitForBatch = async (token, batchId) => {
  for (let i = 0; i < 50; i++) {
    const res = await request(app).get(`/api/whatsapp-bills/batch/${batchId}`).set('Authorization', `Bearer ${token}`);
    if (res.body.sending === 0) return res.body;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error('batch did not finish');
};

describe('WhatsApp bills', () => {
  let token;
  let sendSpy;
  let templateSpy;

  beforeEach(async () => {
    const admin = await createTestUser({ role: 'admin', email: 'admin@example.com', phone: '9999999990' });
    token = generateToken(admin._id);
    await AppSettings.create({ whatsappBills: { enabled: true, traderName: 'Mishra Traders' } });
    sendSpy = jest.spyOn(WhatsAppBillService, 'sendBill').mockResolvedValue({ success: true });
    templateSpy = jest.spyOn(WhatsAppBillService, 'getTemplateInfo').mockResolvedValue({ status: 'approved', variables: 4 });
  });
  afterEach(() => jest.restoreAllMocks());

  const preview = (rows = ROWS) => request(app).post('/api/whatsapp-bills/preview')
    .set('Authorization', `Bearer ${token}`).attach('file', report(rows), 'Sale_Report.xls');
  const send = (bills) => request(app).post('/api/whatsapp-bills/send').set('Authorization', `Bearer ${token}`).send({ bills });

  it('refuses to send when the contact number is set but the approved template has only 4 blanks (the 16 Nov failure)', async () => {
    await AppSettings.updateOne({}, { 'whatsappBills.contactPhone': '9241514013' });
    const { body } = await preview().expect(200);
    const res = await send(body.rows.filter((r) => r.status === 'new')).expect(400);
    expect(res.body.message).toMatch(/has 4 blanks but 5 values/);
    expect(sendSpy).not.toHaveBeenCalled();
    expect(await BillMessage.countDocuments()).toBe(0);
  });

  it('sends 5 values once the template is edited to use {{5}}', async () => {
    await AppSettings.updateOne({}, { 'whatsappBills.contactPhone': '9241514013' });
    templateSpy.mockResolvedValue({ status: 'approved', variables: 5 });
    const { body } = await preview(ROWS.slice(1, 2)).expect(200);
    const r = await send(body.rows).expect(200);
    await waitForBatch(token, r.body.batchId);
    expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({ billNo: '502' }), expect.objectContaining({ contactPhone: '9241514013' }));
  });

  it('refuses to send while the template is not approved (e.g. edit in review)', async () => {
    templateSpy.mockResolvedValue({ status: 'pending', variables: 5 });
    const { body } = await preview().expect(200);
    const res = await send(body.rows.filter((r) => r.status === 'new')).expect(400);
    expect(res.body.message).toMatch(/pending/);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('reads an .xls report and explains which bills can be sent', async () => {
    const res = await preview().expect(200);
    expect(res.body.summary).toMatchObject({ bills: 4, sendable: 2, noPhone: 2 });
    const b502 = res.body.rows.find((r) => r.billNo === '502');
    expect(b502).toMatchObject({ phone: '9334003859', total: 20620, balance: 20620, status: 'new', dateLabel: '15 Nov 2026' });
    expect(res.body.rows.find((r) => r.billNo === '494').phone).toBe('9835543245');
  });

  it('sends each bill once: an overlapping second upload sends only the new bill', async () => {
    const first = await preview(ROWS.slice(0, 2)).expect(200); // afternoon: bill 502 only
    const sent = await send(first.body.rows.filter((r) => r.status === 'new')).expect(200);
    expect(sent.body.queued).toBe(1);
    expect((await waitForBatch(token, sent.body.batchId)).sent).toBe(1);

    const night = await preview().expect(200); // night: full day
    expect(night.body.rows.find((r) => r.billNo === '502').status).toBe('sent');
    expect(night.body.summary.sendable).toBe(1);

    // Even if the client re-submits an already-sent bill, it is skipped.
    const again = await send(night.body.rows.filter((r) => r.phone)).expect(200);
    expect(again.body.queued).toBe(1);
    expect(again.body.skipped).toEqual(expect.arrayContaining([{ billNo: '502', reason: 'already_sent' }]));
    await waitForBatch(token, again.body.batchId);
    expect(sendSpy).toHaveBeenCalledTimes(2);
  });

  it('a double tap queues each bill only once', async () => {
    const { body } = await preview().expect(200);
    const sendable = body.rows.filter((r) => r.status === 'new');
    const [a, b] = await Promise.all([send(sendable), send(sendable)]);
    expect(a.body.queued + b.body.queued).toBe(2);
    await waitForBatch(token, a.body.batchId);
    await waitForBatch(token, b.body.batchId);
    expect(sendSpy).toHaveBeenCalledTimes(2);
    expect(await BillMessage.countDocuments({ status: 'sent' })).toBe(2);
  });

  it('marks failures and lets them be retried', async () => {
    sendSpy.mockResolvedValueOnce({ success: false, error: 'template not found' });
    const { body } = await preview(ROWS.slice(1, 2)).expect(200);
    const r1 = await send(body.rows).expect(200);
    expect((await waitForBatch(token, r1.body.batchId)).failed).toBe(1);

    const again = await preview(ROWS.slice(1, 2)).expect(200);
    expect(again.body.rows[0]).toMatchObject({ status: 'retry', lastError: 'template not found' });
    const r2 = await send(again.body.rows).expect(200);
    expect((await waitForBatch(token, r2.body.batchId)).sent).toBe(1);
  });

  it('never messages opted-out numbers', async () => {
    await request(app).post('/api/whatsapp-bills/opt-outs').set('Authorization', `Bearer ${token}`).send({ phone: '9334003859' }).expect(201);
    const { body } = await preview().expect(200);
    expect(body.rows.find((r) => r.billNo === '502').status).toBe('opted_out');
    const res = await send(body.rows.filter((r) => r.phone)).expect(200);
    expect(res.body.skipped).toEqual(expect.arrayContaining([{ billNo: '502', reason: 'opted_out' }]));
  });

  it('opts out automatically when a customer replies STOP on WhatsApp', async () => {
    await request(app).post('/api/webhooks/msg91-whatsapp').send({ from: '919334003859', text: 'STOP' }).expect(200);
    const { body } = await preview().expect(200);
    expect(body.rows.find((r) => r.billNo === '502').status).toBe('opted_out');
  });

  it('refuses to send while sending is switched off', async () => {
    await AppSettings.updateOne({}, { 'whatsappBills.enabled': false });
    const { body } = await preview().expect(200);
    await send(body.rows.filter((r) => r.status === 'new')).expect(400);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('is admin-only', async () => {
    const customer = await createTestUser({ role: 'customer', email: 'c@example.com', phone: '9876500001' });
    await request(app).post('/api/whatsapp-bills/preview').set('Authorization', `Bearer ${generateToken(customer._id)}`).expect(403);
    await request(app).get('/api/whatsapp-bills/history').expect(401);
  });
});

describe('WhatsApp bill template values', () => {
  it('sends trader, bill no, date and total only — never paid or balance due', () => {
    const bill = { billNo: '502', dateLabel: '15 Nov 2026', total: 20620, received: 5000, balance: 15620 };
    expect(WhatsAppBillService.templateValues(bill, 'Mishra Traders')).toEqual(['Mishra Traders', '502', '15 Nov 2026', '20,620']);
  });

  it('adds the admin-configured contact number as {{5}}, formatted, only when one is set', () => {
    const bill = { billNo: '502', dateLabel: '15 Nov 2026', total: 20620 };
    expect(WhatsAppBillService.templateValues(bill, 'Chardeevari', '9241514013'))
      .toEqual(['Chardeevari', '502', '15 Nov 2026', '20,620', '+91 92415 14013']);
    expect(WhatsAppBillService.templateValues(bill, 'Chardeevari', '+91 98765-43210')[4]).toBe('+91 98765 43210');
    expect(WhatsAppBillService.templateValues(bill, 'Chardeevari', '  ')).toHaveLength(4);
  });
});
