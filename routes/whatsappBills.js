const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const BillMessage = require('../models/BillMessage');
const WhatsAppOptOut = require('../models/WhatsAppOptOut');
const AppSettings = require('../models/AppSettings');
const { parseBillReport, normalizePhone, billKey, dateLabel } = require('../utils/billReport');
const WhatsAppBillService = require('../services/WhatsAppBillService');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const MAX_PER_SEND = 300;
// A bill stuck in "sending" this long (e.g. server restarted mid-batch) may be retried.
const STALE_SENDING_MS = 10 * 60 * 1000;
const sendDelayMs = () => Number(process.env.BILL_SEND_DELAY_MS ?? 3000);

router.use(verifyToken, requireAdmin);

async function billSettings() {
  const s = await AppSettings.findOne().select('whatsappBills').lean();
  return {
    enabled: false, traderName: 'Chardeevari', paidTemplate: 'bill_paid', dueTemplate: 'bill_due', language: 'en',
    ...(s?.whatsappBills || {}),
  };
}

const isStale = (doc) => doc.status === 'sending' && Date.now() - new Date(doc.updatedAt).getTime() > STALE_SENDING_MS;

/**
 * @route  POST /api/whatsapp-bills/preview   (multipart field "file")
 * @desc   Read a sales report and say, per bill, whether it can be sent and why not
 */
router.post('/preview', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Choose the sales report file (.xls, .xlsx or .csv)' });
    let parsed;
    try {
      parsed = parseBillReport(req.file.buffer);
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    const { bills } = parsed;
    const phones = [...new Set(bills.map((b) => b.phone).filter(Boolean))];
    const [existing, optOuts, settings] = await Promise.all([
      BillMessage.find({ key: { $in: bills.map((b) => b.key) } }).select('key status updatedAt sentAt error').lean(),
      WhatsAppOptOut.find({ phone: { $in: phones } }).select('phone').lean(),
      billSettings(),
    ]);
    const byKey = new Map(existing.map((e) => [e.key, e]));
    const optedOut = new Set(optOuts.map((o) => o.phone));

    const rows = bills.map((b) => {
      const prev = byKey.get(b.key);
      let status = 'new';
      if (!b.phone) status = 'no_phone';
      else if (optedOut.has(b.phone)) status = 'opted_out';
      else if (prev?.status === 'sent') status = 'sent';
      else if (prev?.status === 'sending' && !isStale(prev)) status = 'sending';
      else if (prev) status = 'retry';
      return { ...b, status, sentAt: prev?.sentAt, lastError: prev?.status === 'failed' ? prev.error : undefined };
    });

    const count = (s) => rows.filter((r) => r.status === s).length;
    res.json({
      success: true,
      settings,
      summary: {
        bills: rows.length,
        sendable: count('new') + count('retry'),
        new: count('new'),
        retry: count('retry'),
        alreadySent: count('sent') + count('sending'),
        noPhone: count('no_phone'),
        optedOut: count('opted_out'),
      },
      rows,
    });
  } catch (err) {
    console.error('WhatsApp bills preview error:', err);
    res.status(500).json({ success: false, message: 'Could not read the report' });
  }
});

/** Atomically take ownership of a bill for this batch. Returns false if it was already sent or is being sent. */
async function claim(bill, batchId, userId) {
  const fields = {
    billNo: bill.billNo, billDate: bill.billDate, partyName: bill.partyName, phone: bill.phone,
    total: bill.total, received: bill.received, balance: bill.balance, template: bill.template,
    status: 'sending', batchId, sentBy: userId,
  };
  try {
    await BillMessage.create({ key: bill.key, ...fields, attempts: 1 });
    return true;
  } catch (err) {
    if (err.code !== 11000) throw err;
  }
  // Already known: only a failed (or stale "sending") record may be retried. The status filter makes this race-safe.
  const staleBefore = new Date(Date.now() - STALE_SENDING_MS);
  const retried = await BillMessage.findOneAndUpdate(
    { key: bill.key, $or: [{ status: 'failed' }, { status: 'sending', updatedAt: { $lt: staleBefore } }] },
    { $set: fields, $unset: { error: 1 }, $inc: { attempts: 1 } },
  );
  return !!retried;
}

async function runBatch(batchId, settings) {
  const queue = await BillMessage.find({ batchId, status: 'sending' }).sort({ createdAt: 1 }).lean();
  for (let i = 0; i < queue.length; i++) {
    const bill = queue[i];
    // Re-check opt-out right before sending (a STOP may have arrived mid-batch).
    const optedOut = await WhatsAppOptOut.exists({ phone: bill.phone });
    const result = optedOut
      ? { success: false, error: 'Customer opted out' }
      : await WhatsAppBillService.sendBill({ ...bill, dateLabel: dateLabel(bill.billDate) }, settings);
    await BillMessage.updateOne({ _id: bill._id }, result.success
      ? { $set: { status: 'sent', sentAt: new Date() }, $unset: { error: 1 } }
      : { $set: { status: 'failed', error: result.error } });
    if (i < queue.length - 1 && sendDelayMs() > 0) await new Promise((r) => setTimeout(r, sendDelayMs()));
  }
}

/**
 * @route  POST /api/whatsapp-bills/send   { bills: [...rows from preview] }
 * @desc   Queue the selected bills and send them in the background, one every few seconds
 */
router.post('/send', async (req, res) => {
  try {
    const settings = await billSettings();
    if (!settings.enabled) {
      return res.status(400).json({ success: false, message: 'Sending is off. Turn it on in WhatsApp Bills → Settings after MSG91 approves the templates.' });
    }
    const input = Array.isArray(req.body?.bills) ? req.body.bills : [];
    if (!input.length) return res.status(400).json({ success: false, message: 'Select at least one bill' });
    if (input.length > MAX_PER_SEND) return res.status(400).json({ success: false, message: `Send at most ${MAX_PER_SEND} bills at a time` });

    const optOuts = new Set((await WhatsAppOptOut.find().select('phone').lean()).map((o) => o.phone));
    const batchId = crypto.randomUUID();
    let queued = 0;
    const skipped = [];
    for (const raw of input) {
      const phone = normalizePhone(raw.phone);
      const billDate = typeof raw.billDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.billDate) ? raw.billDate : null;
      const billNo = String(raw.billNo ?? '').trim();
      const total = Number(raw.total);
      if (!phone || !billDate || !billNo || !Number.isFinite(total)) {
        skipped.push({ billNo, reason: 'invalid' });
        continue;
      }
      if (optOuts.has(phone)) {
        skipped.push({ billNo, reason: 'opted_out' });
        continue;
      }
      const received = Number(raw.received) || 0;
      const balance = Number(raw.balance) || 0;
      const bill = {
        key: billKey(billNo, billDate), billNo, billDate, phone, total, received, balance,
        partyName: String(raw.partyName ?? '').slice(0, 80),
        template: balance > 0 ? 'due' : 'paid',
      };
      if (await claim(bill, batchId, req.user._id)) queued++;
      else skipped.push({ billNo, reason: 'already_sent' });
    }

    if (queued) {
      runBatch(batchId, settings).catch((err) => console.error(`WhatsApp bill batch ${batchId} crashed:`, err));
    }
    res.json({ success: true, batchId, queued, skipped });
  } catch (err) {
    console.error('WhatsApp bills send error:', err);
    res.status(500).json({ success: false, message: 'Failed to start sending' });
  }
});

/**
 * @route  GET /api/whatsapp-bills/batch/:id
 * @desc   Progress of one send: per-bill status
 */
router.get('/batch/:id', async (req, res) => {
  try {
    const items = await BillMessage.find({ batchId: req.params.id }).select('key billNo status error sentAt').lean();
    const count = (s) => items.filter((i) => i.status === s).length;
    res.json({ success: true, total: items.length, sending: count('sending'), sent: count('sent'), failed: count('failed'), items });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load progress' });
  }
});

/**
 * @route  GET /api/whatsapp-bills/history?status=&q=&page=
 */
router.get('/history', async (req, res) => {
  try {
    const { status, q = '', page = 1 } = req.query;
    const filter = {};
    if (['sending', 'sent', 'failed'].includes(status)) filter.status = status;
    if (String(q).trim()) {
      const safe = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [{ billNo: new RegExp(`^${safe}`) }, { phone: new RegExp(safe) }, { partyName: new RegExp(safe, 'i') }];
    }
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 50));
    const [items, total] = await Promise.all([
      BillMessage.find(filter).sort({ updatedAt: -1 }).skip((Math.max(1, Number(page)) - 1) * limit).limit(limit).lean(),
      BillMessage.countDocuments(filter),
    ]);
    res.json({ success: true, items, total, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load history' });
  }
});

/**
 * @route  GET /api/whatsapp-bills/opt-outs | POST /opt-outs { phone, note } | DELETE /opt-outs/:phone
 */
router.get('/opt-outs', async (req, res) => {
  const items = await WhatsAppOptOut.find().sort({ createdAt: -1 }).lean();
  res.json({ success: true, items });
});

router.post('/opt-outs', async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  if (!phone) return res.status(400).json({ success: false, message: 'Enter a valid 10-digit mobile number' });
  const item = await WhatsAppOptOut.findOneAndUpdate(
    { phone },
    { $setOnInsert: { phone, source: 'admin', note: String(req.body?.note || '').slice(0, 200) } },
    { upsert: true, new: true },
  );
  res.status(201).json({ success: true, item });
});

router.delete('/opt-outs/:phone', async (req, res) => {
  const phone = normalizePhone(req.params.phone);
  await WhatsAppOptOut.deleteOne({ phone });
  res.json({ success: true });
});

module.exports = router;
