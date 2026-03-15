const express = require('express');
const router = express.Router();
const CalculatorLead = require('../models/CalculatorLead');
const { verifyToken, requireAdmin } = require('../middleware/auth');

/**
 * @route  POST /api/calculator-leads
 * @desc   Save a calculator lead (called when user downloads PDF)
 * @access Public
 */
router.post('/', async (req, res) => {
  try {
    const { name, phone, city, area, floors, totalCost, priceMode, materials } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone are required' });
    }

    const lead = await CalculatorLead.create({
      name, phone, city, area, floors, totalCost, priceMode, materials
    });

    res.status(201).json({ success: true, id: lead._id });
  } catch (err) {
    console.error('Calculator lead save error:', err);
    res.status(500).json({ success: false, message: 'Failed to save lead' });
  }
});

/**
 * @route  GET /api/calculator-leads
 * @desc   List all leads with pagination + search
 * @access Admin
 */
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', city = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') }
      ];
    }
    if (city) filter.city = new RegExp(city, 'i');

    const [leads, total] = await Promise.all([
      CalculatorLead.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      CalculatorLead.countDocuments(filter)
    ]);

    res.json({ success: true, leads, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error('Calculator leads fetch error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch leads' });
  }
});

/**
 * @route  GET /api/calculator-leads/download
 * @desc   Download all leads as CSV (for bulk SMS import)
 * @access Admin
 */
router.get('/download', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { city = '', from = '', to = '' } = req.query;

    const filter = {};
    if (city) filter.city = new RegExp(city, 'i');
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(to + 'T23:59:59.999Z');
    }

    const leads = await CalculatorLead.find(filter).sort({ createdAt: -1 }).lean();

    const header = 'Name,Phone,City,Area (sqft),Floors,Estimated Cost (₹),Price Mode,Date\n';
    const rows = leads.map(l => [
      `"${(l.name || '').replace(/"/g, '""')}"`,
      l.phone,
      l.city || '',
      l.area || '',
      l.floors || '',
      l.totalCost ? Math.round(l.totalCost) : '',
      l.priceMode || '',
      new Date(l.createdAt).toLocaleDateString('en-IN')
    ].join(',')).join('\n');

    const filename = `calculator_leads_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(header + rows);
  } catch (err) {
    console.error('Calculator leads download error:', err);
    res.status(500).json({ success: false, message: 'Failed to download leads' });
  }
});

/**
 * @route  DELETE /api/calculator-leads/:id
 * @desc   Delete a single lead
 * @access Admin
 */
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    await CalculatorLead.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete lead' });
  }
});

module.exports = router;
