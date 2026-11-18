const express = require('express');
const mongoose = require('mongoose');
const WhatsAppTemplate = require('../models/WhatsAppTemplate');
const WhatsAppTemplateService = require('../services/WhatsAppTemplateService');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken, requireAdmin);

/** Copy MSG91's view of the template onto the registry entry; keeps the variable mapping, resized to the new count. */
function applyInfo(doc, info) {
  const variables = Array.from({ length: info.variables }, (_, i) => {
    const v = doc.variables?.[i];
    return v ? { source: v.source, value: v.value } : { source: 'static', value: '' };
  });
  doc.set({
    status: info.status,
    statusCheckedAt: new Date(),
    category: info.category,
    body: info.body,
    buttons: info.buttons,
    variableCount: info.variables,
    variables,
  });
}

/**
 * @route  GET /api/whatsapp-templates
 * @desc   Registered templates, newest first
 */
router.get('/', async (req, res) => {
  try {
    const templates = await WhatsAppTemplate.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, templates });
  } catch (err) {
    console.error('WhatsApp templates list error:', err);
    res.status(500).json({ success: false, message: 'Failed to load templates' });
  }
});

/**
 * @route  POST /api/whatsapp-templates  { name, language, label }
 * @desc   Register an MSG91 template; its body, buttons, category and status are read from MSG91
 */
router.post('/', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const language = String(req.body?.language || 'en').trim();
    const label = String(req.body?.label || '').trim() || name;
    if (!/^[a-z0-9_]+$/.test(name)) {
      return res.status(400).json({ success: false, message: 'Template name is lowercase letters, digits and _ exactly as in MSG91' });
    }
    if (await WhatsAppTemplate.exists({ name, language })) {
      return res.status(409).json({ success: false, message: `"${name}" (${language}) is already in the list` });
    }

    const info = await WhatsAppTemplateService.getTemplateInfo({ name, language }, { fresh: true });
    if (info.error) return res.status(400).json({ success: false, message: info.error });

    const template = new WhatsAppTemplate({ name, language, label: label.slice(0, 80) });
    applyInfo(template, info);
    await template.save();
    res.status(201).json({ success: true, template });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'This template is already in the list' });
    console.error('WhatsApp template add error:', err);
    res.status(500).json({ success: false, message: 'Failed to add template' });
  }
});

/**
 * @route  PUT /api/whatsapp-templates/:id  { label?, enabled?, variables? }
 * @desc   Rename, switch on/off, or map each {{n}} to the customer name (with fallback) or fixed text
 */
router.put('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Template not found' });
    const template = await WhatsAppTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    const { label, enabled, variables } = req.body || {};
    if (label !== undefined) {
      if (!String(label).trim()) return res.status(400).json({ success: false, message: 'Label is required' });
      template.label = String(label).trim().slice(0, 80);
    }
    if (enabled !== undefined) template.enabled = !!enabled;
    if (variables !== undefined) {
      if (!Array.isArray(variables) || variables.length !== template.variableCount) {
        return res.status(400).json({ success: false, message: `This template has ${template.variableCount} blanks; set each one` });
      }
      const mapped = variables.map((v) => ({
        source: v?.source === 'name' ? 'name' : 'static',
        value: String(v?.value ?? '').replace(/\s+/g, ' ').trim().slice(0, 1000),
      }));
      const empty = mapped.findIndex((v) => !v.value);
      if (empty >= 0) {
        return res.status(400).json({
          success: false,
          message: mapped[empty].source === 'name'
            ? `{{${empty + 1}}}: enter the text to use when a customer has no name`
            : `{{${empty + 1}}}: enter the fixed text`,
        });
      }
      template.variables = mapped;
    }
    await template.save();
    res.json({ success: true, template });
  } catch (err) {
    console.error('WhatsApp template update error:', err);
    res.status(500).json({ success: false, message: 'Failed to update template' });
  }
});

/**
 * @route  POST /api/whatsapp-templates/:id/refresh
 * @desc   Re-read status, category, body and buttons from MSG91
 */
router.post('/:id/refresh', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Template not found' });
    const template = await WhatsAppTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    const info = await WhatsAppTemplateService.getTemplateInfo(template, { fresh: true });
    if (info.error) return res.status(400).json({ success: false, message: info.error });
    applyInfo(template, info);
    await template.save();
    res.json({ success: true, template });
  } catch (err) {
    console.error('WhatsApp template refresh error:', err);
    res.status(500).json({ success: false, message: 'Failed to refresh template' });
  }
});

/**
 * @route  DELETE /api/whatsapp-templates/:id
 * @desc   Remove from this list only; the template stays in MSG91
 */
router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Template not found' });
    const removed = await WhatsAppTemplate.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('WhatsApp template delete error:', err);
    res.status(500).json({ success: false, message: 'Failed to remove template' });
  }
});

module.exports = router;
