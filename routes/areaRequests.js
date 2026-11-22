const express = require('express');
const router = express.Router();
const AreaRequest = require('../models/AreaRequest');
const { verifyToken, requireAdmin, optionalAuth } = require('../middleware/auth');

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const DEDUPE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const hits = new Map();

const normalizePhone = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '').replace(/^(91|0)(?=[6-9]\d{9}$)/, '');
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
};

const clean = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const normKey = (value) => clean(value, 120).toLowerCase();
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const toNumber = (value) => {
  const n = Number(value);
  return value !== '' && value != null && Number.isFinite(n) ? n : undefined;
};

const rateLimited = (ip) => {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 10000) {
    for (const [key, times] of hits) {
      if (!times.some((t) => now - t < RATE_WINDOW_MS)) hits.delete(key);
    }
  }
  return false;
};

const buildFilter = ({ city = '', search = '' }) => {
  const filter = {};
  if (city) filter.city = new RegExp(escapeRegex(city.trim()), 'i');
  if (search) {
    const rx = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ name: rx }, { phone: rx }, { area: rx }, { city: rx }, { pincode: rx }, { note: rx }];
  }
  return filter;
};

/**
 * @route  POST /api/area-requests
 * @desc   Visitor requests Chardeevari service in their area
 * @access Public (optional auth)
 */
router.post('/', optionalAuth, async (req, res) => {
  try {
    if (rateLimited(req.ip)) {
      return res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' });
    }

    const body = req.body || {};
    const area = clean(body.area, 120);
    const city = clean(body.city, 80);
    const pincode = String(body.pincode ?? '').replace(/\D/g, '').slice(0, 6);

    if (!city || (!area && !pincode)) {
      return res.status(400).json({ success: false, message: 'City and area or pincode are required' });
    }

    const user = req.user;
    const isUser = user && user.constructor?.modelName === 'User';
    const phone = normalizePhone(body.phone) || (user ? normalizePhone(user.phone) : null);
    if (!phone && !isUser) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit mobile number is required' });
    }

    const name = clean(body.name, 80) || clean(user?.name, 80);
    const items = Array.isArray(body.items)
      ? [...new Set(body.items.map((i) => String(i).toLowerCase()).filter((i) => AreaRequest.ITEMS.includes(i)))]
      : [];
    const note = clean(body.note, 300);
    const source = body.source === 'app' ? 'app' : 'web';
    const lat = toNumber(body.lat);
    const lng = toNumber(body.lng);
    const areaKey = `${normKey(city)}|${normKey(area || pincode)}`;

    const identity = [];
    if (phone) identity.push({ phone });
    if (isUser) identity.push({ userId: user._id });

    const existing = await AreaRequest.findOne({
      areaKey,
      $or: identity,
      createdAt: { $gte: new Date(Date.now() - DEDUPE_WINDOW_MS) }
    });

    if (existing) {
      existing.count = (existing.count || 1) + 1;
      if (name) existing.name = name;
      if (phone) existing.phone = phone;
      if (isUser && !existing.userId) existing.userId = user._id;
      if (pincode) existing.pincode = pincode;
      if (lat !== undefined && lng !== undefined) existing.location = { lat, lng };
      if (items.length) existing.items = [...new Set([...(existing.items || []), ...items])];
      if (note) existing.note = note;
      existing.source = source;
      existing.ip = req.ip;
      await existing.save();
      return res.json({ success: true });
    }

    await AreaRequest.create({
      area,
      city,
      pincode: pincode || undefined,
      location: lat !== undefined && lng !== undefined ? { lat, lng } : undefined,
      name,
      phone: phone || undefined,
      userId: isUser ? user._id : undefined,
      items,
      note,
      source,
      areaKey,
      ip: req.ip
    });

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Area request save error:', err);
    res.status(500).json({ success: false, message: 'Failed to save request' });
  }
});

/**
 * @route  GET /api/area-requests
 * @desc   List area requests + demand grouped by area
 * @access Admin
 */
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const filter = buildFilter(req.query);

    const [requests, total, byArea] = await Promise.all([
      AreaRequest.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AreaRequest.countDocuments(filter),
      AreaRequest.aggregate([
        { $match: filter },
        { $sort: { updatedAt: -1 } },
        {
          $group: {
            _id: { $ifNull: ['$areaKey', { $concat: [{ $toLower: '$city' }, '|', { $toLower: { $ifNull: ['$area', ''] } }] }] },
            city: { $first: '$city' },
            area: { $first: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ['$area', ''] } }, 0] }, '$area', '$pincode'] } },
            count: { $sum: 1 },
            latest: { $max: '$updatedAt' }
          }
        },
        { $sort: { count: -1, latest: -1 } },
        { $limit: 100 },
        { $project: { _id: 0, city: 1, area: 1, count: 1, latest: 1 } }
      ])
    ]);

    res.json({ success: true, requests, total, page, pages: Math.max(1, Math.ceil(total / limit)), byArea });
  } catch (err) {
    console.error('Area requests fetch error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch area requests' });
  }
});

/**
 * @route  GET /api/area-requests/export
 * @desc   Download area requests as CSV
 * @access Admin
 */
router.get('/export', verifyToken, requireAdmin, async (req, res) => {
  try {
    const requests = await AreaRequest.find(buildFilter(req.query)).sort({ updatedAt: -1 }).lean();
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Date', 'Name', 'Phone', 'Area', 'City', 'Pincode', 'Items', 'Source', 'Times Requested', 'Note', 'Lat', 'Lng'];
    const rows = requests.map((r) => [
      new Date(r.updatedAt || r.createdAt).toLocaleDateString('en-IN'),
      r.name,
      r.phone,
      r.area,
      r.city,
      r.pincode,
      (r.items || []).join(' '),
      r.source,
      r.count || 1,
      r.note,
      r.location?.lat,
      r.location?.lng
    ].map(esc).join(','));

    const filename = `area_requests_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + [header.map(esc).join(','), ...rows].join('\n'));
  } catch (err) {
    console.error('Area requests export error:', err);
    res.status(500).json({ success: false, message: 'Failed to export area requests' });
  }
});

/**
 * @route  DELETE /api/area-requests/:id
 * @desc   Delete a single area request
 * @access Admin
 */
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    await AreaRequest.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete area request' });
  }
});

module.exports = router;
