const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const { Readable } = require('stream');
const ShopContact = require('../models/ShopContact');
const WhatsAppOptOut = require('../models/WhatsAppOptOut');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const NAME_HEADER = /name|customer|party|नाम/i;
const PHONE_HEADER = /phone|mobile|contact|number|whatsapp|मोबाइल|फ़ोन|फोन/i;

/** 10-digit Indian mobile from "+91 98765-43210", "09876543210", 9876543210 (number cell) …; else null. */
const normalizePhone = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '').replace(/^(91|0)(?=[6-9]\d{9}$)/, '');
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
};

const cellText = (cell) => {
  const v = cell?.value;
  if (v == null) return '';
  if (typeof v === 'object') return String(v.text ?? v.result ?? v.richText?.map((r) => r.text).join('') ?? '');
  return String(v);
};

/**
 * Rows as arrays of strings from an .xlsx or .csv upload. Exports often start with
 * title lines, so the header row is found by content, not assumed to be row 1.
 */
async function readRows(file) {
  const workbook = new ExcelJS.Workbook();
  if (/\.csv$/i.test(file.originalname) || file.mimetype === 'text/csv') {
    await workbook.csv.read(Readable.from(file.buffer));
  } else {
    await workbook.xlsx.load(file.buffer);
  }
  const rows = [];
  workbook.worksheets[0]?.eachRow({ includeEmpty: false }, (row) => {
    const values = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => { values[col - 1] = cellText(cell).trim(); });
    rows.push(values);
  });
  return rows;
}

/** [{name, phone}] using detected name/phone columns, falling back to any phone-looking cell. */
function extractContacts(rows) {
  const headerIndex = rows.slice(0, 15).findIndex((r) => r.some((c) => PHONE_HEADER.test(c || '')));
  const header = headerIndex >= 0 ? rows[headerIndex] : [];
  const phoneCol = header.findIndex((c) => PHONE_HEADER.test(c || ''));
  const nameCol = header.findIndex((c, i) => i !== phoneCol && NAME_HEADER.test(c || ''));

  const contacts = [];
  let invalid = 0;
  for (const row of rows.slice(headerIndex + 1)) {
    let phone = phoneCol >= 0 ? normalizePhone(row[phoneCol]) : null;
    let phoneAt = phoneCol;
    if (!phone) {
      phoneAt = row.findIndex((c) => normalizePhone(c));
      phone = phoneAt >= 0 ? normalizePhone(row[phoneAt]) : null;
    }
    if (!phone) {
      if (row.some(Boolean)) invalid++;
      continue;
    }
    const name = nameCol >= 0 ? row[nameCol] : row.find((c, i) => i !== phoneAt && c && /[a-zA-Z\u0900-\u097F]/.test(c));
    contacts.push({ phone, name: (name || '').slice(0, 80) });
  }
  return { contacts, invalid };
}

/**
 * @route  POST /api/shop-contacts/import   (multipart field "file": .xlsx or .csv)
 * @desc   Add shop customers from a Khatabook export; existing numbers are not re-added
 * @access Admin
 */
router.post('/import', verifyToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Choose an Excel (.xlsx) or CSV file' });
    let rows;
    try {
      rows = await readRows(req.file);
    } catch {
      return res.status(400).json({ success: false, message: 'Could not read the file. Export it from Khatabook as Excel (.xlsx) or CSV.' });
    }

    const { contacts, invalid } = extractContacts(rows);
    // First occurrence wins: reversed so earlier rows overwrite later ones in the Map.
    const unique = [...new Map([...contacts].reverse().map((c) => [c.phone, c])).values()];
    const batch = `${req.file.originalname} · ${new Date().toISOString().slice(0, 10)}`;
    const now = new Date();

    const result = unique.length
      ? await ShopContact.bulkWrite(unique.map((c) => ({
          updateOne: {
            filter: { phone: c.phone },
            update: {
              $setOnInsert: { phone: c.phone, name: c.name, importBatch: batch, welcomeStatus: 'pending' },
              $set: { lastSeenAt: now }
            },
            upsert: true
          }
        })))
      : { upsertedCount: 0 };

    res.json({
      success: true,
      added: result.upsertedCount,
      alreadyThere: unique.length - result.upsertedCount,
      invalid,
      rows: rows.length
    });
  } catch (err) {
    console.error('Shop contact import error:', err);
    res.status(500).json({ success: false, message: 'Import failed' });
  }
});

/**
 * @route  GET /api/shop-contacts?status=&search=&page=
 * @access Admin
 */
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status, search = '', page = 1 } = req.query;
    const filter = {};
    if (status) filter.welcomeStatus = status;
    if (search.trim()) {
      const q = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [{ name: new RegExp(q, 'i') }, { phone: new RegExp(q) }];
    }
    const limit = 50;
    const [contacts, total, counts] = await Promise.all([
      ShopContact.find(filter).sort({ createdAt: -1 }).skip((Number(page) - 1) * limit).limit(limit).lean(),
      ShopContact.countDocuments(filter),
      ShopContact.aggregate([{ $group: { _id: '$welcomeStatus', n: { $sum: 1 } } }])
    ]);
    res.json({
      success: true,
      contacts,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      counts: Object.fromEntries(counts.map((c) => [c._id, c.n]))
    });
  } catch (err) {
    console.error('Shop contact list error:', err);
    res.status(500).json({ success: false, message: 'Failed to load customers' });
  }
});

/**
 * @route  PUT /api/shop-contacts/:id/opt-out
 * @desc   Customer asked not to be messaged; never send WhatsApp to this number again
 * @access Admin
 */
router.put('/:id/opt-out', verifyToken, requireAdmin, async (req, res) => {
  try {
    const c = await ShopContact.findByIdAndUpdate(req.params.id, { welcomeStatus: 'opted_out' }, { new: true });
    if (!c) return res.status(404).json({ success: false, message: 'Not found' });
    await WhatsAppOptOut.updateOne(
      { phone: c.phone },
      { $setOnInsert: { phone: c.phone, source: 'admin', note: 'Shop customer opted out' } },
      { upsert: true }
    );
    res.json({ success: true, contact: c });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update' });
  }
});

module.exports = router;
