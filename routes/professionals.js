const express = require('express');
const router = express.Router();
const Professional = require('../models/Professional');
const { TRADES } = require('../models/Professional');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const EDITABLE = [
  'kind', 'name', 'phone', 'whatsapp', 'trades', 'areas', 'city', 'experienceYears', 'team',
  'rateNote', 'photoUrl', 'sitePhotos', 'notes', 'verified', 'consentGiven', 'isActive',
];

const pickEditable = (src) => {
  const out = {};
  for (const key of EDITABLE) {
    if (src[key] === undefined) continue;
    // Empty optional text inputs clear the field instead of failing format validation.
    out[key] = (key === 'whatsapp' || key === 'rateNote' || key === 'photoUrl') && src[key] === '' ? undefined : src[key];
  }
  // A team only makes sense for contractors; drop it when switching to individual.
  if (out.kind === 'individual') out.team = [];
  return out;
};

const sendError = (res, err, fallback) => {
  if (err.code === 11000) {
    return res.status(409).json({ success: false, message: 'A professional with this phone number is already registered' });
  }
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    const message = err.errors ? Object.values(err.errors).map((e) => e.message).join(', ') : err.message;
    return res.status(400).json({ success: false, message });
  }
  console.error(fallback, err);
  res.status(500).json({ success: false, message: fallback });
};

router.use(verifyToken, requireAdmin);

/**
 * @route  GET /api/professionals/meta
 * @desc   Trade list (value + label) for the admin form and filters
 * @access Admin
 */
router.get('/meta', (req, res) => {
  res.json({ success: true, trades: TRADES });
});

/**
 * @route  GET /api/professionals
 * @access Admin
 */
router.get('/', async (req, res) => {
  try {
    const professionals = await Professional.find().sort({ createdAt: -1 }).populate('addedBy', 'name');
    res.json({ success: true, professionals });
  } catch (err) {
    sendError(res, err, 'Failed to load professionals');
  }
});

/**
 * @route  POST /api/professionals
 * @access Admin
 */
router.post('/', async (req, res) => {
  try {
    const professional = await Professional.create({ ...pickEditable(req.body), addedBy: req.user._id });
    res.status(201).json({ success: true, professional });
  } catch (err) {
    sendError(res, err, 'Failed to register professional');
  }
});

/**
 * @route  PUT /api/professionals/:id
 * @desc   Load + save (not findByIdAndUpdate) so document validators such as "only contractors have a team" run
 * @access Admin
 */
router.put('/:id', async (req, res) => {
  try {
    const professional = await Professional.findById(req.params.id);
    if (!professional) return res.status(404).json({ success: false, message: 'Professional not found' });
    professional.set(pickEditable(req.body));
    await professional.save();
    res.json({ success: true, professional });
  } catch (err) {
    sendError(res, err, 'Failed to update professional');
  }
});

/**
 * @route  DELETE /api/professionals/:id
 * @access Admin
 */
router.delete('/:id', async (req, res) => {
  try {
    const professional = await Professional.findByIdAndDelete(req.params.id);
    if (!professional) return res.status(404).json({ success: false, message: 'Professional not found' });
    res.json({ success: true });
  } catch (err) {
    sendError(res, err, 'Failed to delete professional');
  }
});

module.exports = router;
