const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Campaign = require('../models/Campaign');
const WhatsAppTemplate = require('../models/WhatsAppTemplate');
const WhatsAppOptOut = require('../models/WhatsAppOptOut');
const ShopContact = require('../models/ShopContact');
const User = require('../models/User');
const WhatsAppTemplateService = require('../services/WhatsAppTemplateService');
const EmailService = require('../services/EmailService');
const { normalizePhone } = require('../utils/billReport');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const AUDIENCES = { whatsapp: ['test', 'shop_welcome', 'shop_all', 'customers'], email: ['test', 'customers'] };
const SEND_LIMIT = 500; // per batch; the admin continues the campaign for the rest
const SEND_GAP_MS = 250;
const STALE_SENDING_MS = 10 * 60 * 1000; // a batch this quiet was cut off (e.g. server restart)
const STOP_AFTER_FAILURES = 10; // nothing delivered after this many tries → transport/template is broken
const ERROR_SAMPLE = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const signUser = (userId) =>
  crypto.createHmac('sha256', process.env.JWT_SECRET || 'your-super-secret-jwt-key').update(String(userId)).digest('hex');
const baseUrl = (req) => `${req.protocol}://${req.get('host')}`;
const unsubscribeUrl = (base, userId) =>
  (userId ? `${base}/api/campaigns/unsubscribe?u=${userId}&t=${signUser(userId)}` : `${base}/api/campaigns/unsubscribe`);

const unsubscribePage = (title, text) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} · Chardeevari</title></head>
<body style="font-family: Inter, sans-serif; background: #f1f5f9; margin: 0; padding: 48px 16px;">
<div style="max-width: 420px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; text-align: center;">
<h1 style="font-size: 20px; color: #1e293b; margin: 0 0 12px;">${title}</h1>
<p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0;">${text}</p></div></body></html>`;

/**
 * @route  GET /api/campaigns/unsubscribe?u=<userId>&t=<hmac>
 * @desc   Link in every campaign email footer; stops campaign emails to this customer
 * @access Public (signed link)
 */
router.get('/unsubscribe', async (req, res) => {
  try {
    const u = String(req.query.u || '');
    const t = Buffer.from(String(req.query.t || ''));
    const expected = Buffer.from(mongoose.isValidObjectId(u) ? signUser(u) : '');
    const valid = expected.length > 0 && t.length === expected.length && crypto.timingSafeEqual(t, expected);
    if (!valid || !(await User.updateOne({ _id: u }, { $set: { emailOptOut: true } })).matchedCount) {
      return res.status(400).type('html').send(unsubscribePage('Link not valid', 'This unsubscribe link is broken or expired. Reply to our email or call 9241514013 and we will remove you.'));
    }
    res.type('html').send(unsubscribePage('You are unsubscribed', 'You will no longer get offer emails from Chardeevari. Order and account emails are still sent.'));
  } catch (err) {
    console.error('Email unsubscribe error:', err);
    res.status(500).type('html').send(unsubscribePage('Something went wrong', 'Please try the link again later.'));
  }
});

router.use(verifyToken, requireAdmin);

/** De-duplicate and drop opted-out addresses. */
function eligible(people, blocked) {
  const seen = new Set();
  let skipped = 0;
  const list = [];
  for (const p of people) {
    if (seen.has(p.to)) continue;
    seen.add(p.to);
    if (blocked.has(p.to)) skipped++;
    else list.push(p);
  }
  return { people: list, skipped };
}

/**
 * WhatsApp recipients `[{ to, name, contactId? }]` in send order, plus how many were skipped
 * (opted out / invalid). Numbers in WhatsAppOptOut are never included.
 */
async function whatsappAudience(audience, testPhone) {
  const blocked = new Set((await WhatsAppOptOut.find().select('phone').lean()).map((o) => o.phone));
  if (audience === 'test') {
    const phone = normalizePhone(testPhone);
    if (!phone) return { error: 'Enter a valid 10-digit mobile number' };
    return eligible([{ to: phone, name: '' }], blocked);
  }
  if (audience === 'customers') {
    const users = await User.find({ role: 'customer', isActive: true, deletedAt: null, phone: /^[6-9]\d{9}$/ })
      .select('phone name').sort({ createdAt: 1 }).lean();
    return eligible(users.map((u) => ({ to: u.phone, name: u.name })), blocked);
  }
  const filter = audience === 'shop_welcome'
    ? { welcomeStatus: { $in: ['pending', 'failed'] } }
    : { welcomeStatus: { $ne: 'opted_out' } };
  // Pending before failed, so retrying failed numbers never holds back new ones.
  const contacts = await ShopContact.find(filter).select('phone name').sort({ welcomeStatus: -1, createdAt: 1 }).lean();
  return eligible(contacts.map((c) => ({ to: c.phone, name: c.name, contactId: c._id })), blocked);
}

/** Email recipients `[{ to, name, userId }]`; customers who unsubscribed are skipped. */
async function emailAudience(audience, testEmail) {
  if (audience === 'test') {
    const email = String(testEmail || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return { error: 'Enter a valid email address' };
    const user = await User.findOne({ email }).select('name emailOptOut').lean();
    return eligible([{ to: email, name: user?.name || '', userId: user?._id }], new Set(user?.emailOptOut ? [email] : []));
  }
  const users = await User.find({ role: 'customer', isActive: true, deletedAt: null, email: { $nin: [null, ''] } })
    .select('email name emailOptOut').sort({ createdAt: 1 }).lean();
  const blocked = new Set(users.filter((u) => u.emailOptOut).map((u) => u.email));
  return eligible(users.map((u) => ({ to: u.email, name: u.name, userId: u._id })), blocked);
}

const audienceFor = (channel, audience, target) =>
  (channel === 'whatsapp' ? whatsappAudience(audience, target) : emailAudience(audience, target));

/**
 * The registry template if it can be sent right now: switched on, every blank filled, and
 * MSG91 says approved with the same number of blanks (cached status re-checked).
 */
async function sendableTemplate(templateId) {
  if (!mongoose.isValidObjectId(templateId)) return { error: 'Choose a template' };
  const template = await WhatsAppTemplate.findById(templateId);
  if (!template) return { error: 'Template not found — it may have been removed from the list' };
  if (!template.enabled) return { error: `"${template.label}" is switched off in Templates` };

  const info = await WhatsAppTemplateService.getTemplateInfo(template);
  if (info.error) return { error: info.error };
  template.set({ status: info.status, statusCheckedAt: new Date() });
  await template.save();
  if (info.status !== 'approved') {
    return { error: `"${template.label}" is ${info.status || 'not approved'} in MSG91 — wait for approval before sending.` };
  }
  if (info.variables !== template.variableCount) {
    return { error: `"${template.label}" changed in MSG91 (now ${info.variables} blanks). Refresh it in Templates and fill the blanks.` };
  }
  if (template.variables.length !== template.variableCount || template.variables.some((v) => !v.value)) {
    return { error: `Fill every blank of "${template.label}" in Templates first` };
  }
  return { template };
}

/** Validated email fields, or { error }. */
function emailContent(body) {
  const subject = String(body?.subject || '').trim();
  const text = String(body?.body || '').trim();
  const ctaText = String(body?.ctaText || '').trim();
  const ctaUrl = String(body?.ctaUrl || '').trim();
  if (!subject || subject.length > 150) return { error: 'Subject is required (max 150 characters)' };
  if (!text || text.length > 5000) return { error: 'Message is required (max 5000 characters)' };
  if (!!ctaText !== !!ctaUrl) return { error: 'Fill both button text and link, or leave both empty' };
  if (ctaText.length > 40) return { error: 'Button text is at most 40 characters' };
  if (ctaUrl && !/^https?:\/\/\S+$/i.test(ctaUrl)) return { error: 'Button link must start with https://' };
  return { subject, body: text, ctaText: ctaText || undefined, ctaUrl: ctaUrl || undefined };
}

const emailReady = () => (EmailService.transportInfo().transport === 'none'
  ? 'Email is not set up on the server. Add BREVO_API_KEY (or SMTP for local use).'
  : null);

/** Sends one message to one recipient for this campaign. */
function deliverer(campaign, template, base) {
  if (campaign.channel === 'whatsapp') {
    const tpl = template.toObject();
    return async (p) => {
      const result = await WhatsAppTemplateService.sendTemplate({
        name: tpl.name, language: tpl.language, phone: p.to, values: WhatsAppTemplateService.valuesFor(tpl, p.name),
      });
      // The welcome goes to each shop customer once: remember the outcome on the contact.
      if (campaign.audience === 'shop_welcome' && p.contactId) {
        await ShopContact.updateOne({ _id: p.contactId }, result.success
          ? { $set: { welcomeStatus: 'sent', welcomeSentAt: new Date() }, $unset: { welcomeError: 1 } }
          : { $set: { welcomeStatus: 'failed', welcomeError: String(result.error).slice(0, 300) } });
      }
      return result;
    };
  }
  const { subject, body, ctaText, ctaUrl } = campaign;
  return (p) => EmailService.send(
    p.to,
    subject,
    EmailService.campaignHtml({ body, ctaText, ctaUrl, unsubscribeUrl: unsubscribeUrl(base, p.userId) }),
    p.name || undefined,
  );
}

/** Send one batch in the background, recording progress on the campaign as it goes. */
async function runBatch(campaignId, batch, deliver) {
  let sent = 0;
  let failed = 0;
  for (const p of batch) {
    const result = await deliver(p);
    const update = { $inc: result.success ? { sent: 1 } : { failed: 1 }, $push: { sentTo: p.to } };
    if (!result.success) {
      update.$push.errorSample = { $each: [`${p.to}: ${String(result.error || 'failed').slice(0, 200)}`], $slice: ERROR_SAMPLE };
    }
    await Campaign.updateOne({ _id: campaignId }, update);
    if (result.success) sent++;
    else failed++;
    if (!sent && failed >= STOP_AFTER_FAILURES) break;
    await sleep(SEND_GAP_MS);
  }
  const untried = batch.length - sent - failed;
  await Campaign.updateOne({ _id: campaignId }, {
    $set: { status: untried ? 'stopped' : 'done' },
    $inc: { recipients: -untried, remaining: untried },
  });
}

/** Another non-test campaign for the same channel + audience is still sending. */
const busy = (channel, audience, exceptId) => audience !== 'test' && Campaign.exists({
  channel,
  audience,
  status: 'sending',
  updatedAt: { $gt: new Date(Date.now() - STALE_SENDING_MS) },
  ...(exceptId && { _id: { $ne: exceptId } }),
});

/** Eligible recipients not yet tried by this campaign, capped to one batch. */
function nextBatch(people, alreadyTried = []) {
  const tried = new Set(alreadyTried);
  const pool = people.filter((p) => !tried.has(p.to));
  const batch = pool.slice(0, SEND_LIMIT);
  return { batch, remaining: pool.length - batch.length };
}

/**
 * @route  GET /api/campaigns/audience?channel=whatsapp|email&audience=&target=
 * @desc   How many would get the message, and how many are skipped (opted out / invalid).
 *         `target` is the phone or email for the 'test' audience.
 */
router.get('/audience', async (req, res) => {
  try {
    const { channel, audience, target } = req.query;
    if (!AUDIENCES[channel]?.includes(audience)) return res.status(400).json({ success: false, message: 'Unknown audience' });
    const result = await audienceFor(channel, audience, target);
    if (result.error) return res.json({ success: true, recipients: 0, skipped: 0 });
    res.json({ success: true, recipients: result.people.length, skipped: result.skipped });
  } catch (err) {
    console.error('Campaign audience error:', err);
    res.status(500).json({ success: false, message: 'Failed to count audience' });
  }
});

/**
 * @route  GET /api/campaigns/email-status
 * @desc   Which email transport the server uses (Brevo HTTPS API, SMTP, or none) and the sender
 */
router.get('/email-status', (req, res) => {
  res.json({ success: true, ...EmailService.transportInfo() });
});

/**
 * @route  POST /api/campaigns/email-preview  { body, ctaText?, ctaUrl? }
 * @desc   The campaign email HTML exactly as customers will see it
 */
router.post('/email-preview', (req, res) => {
  const { body, ctaText, ctaUrl } = req.body || {};
  const html = EmailService.campaignHtml({
    body: String(body || '').slice(0, 5000),
    ctaText: String(ctaText || '').trim(),
    ctaUrl: String(ctaUrl || '').trim(),
    unsubscribeUrl: '#',
  });
  res.json({ success: true, html });
});

/** Create the campaign for the first batch and start sending. */
async function launch(req, res, fields, target, template) {
  if (await busy(fields.channel, fields.audience)) {
    return res.status(409).json({ success: false, message: 'A campaign to this audience is still sending. Wait for it to finish.' });
  }
  const audience = await audienceFor(fields.channel, fields.audience, target);
  if (audience.error) return res.status(400).json({ success: false, message: audience.error });
  const { batch, remaining } = nextBatch(audience.people);
  if (!batch.length) {
    return res.status(400).json({
      success: false,
      message: audience.skipped ? `Nobody to send to: all ${audience.skipped} opted out` : 'Nobody to send to in this audience',
    });
  }

  const campaign = await Campaign.create({
    ...fields,
    testTarget: fields.audience === 'test' ? batch[0].to : undefined,
    recipients: batch.length,
    skipped: audience.skipped,
    remaining,
    sentBy: req.user._id,
  });
  runBatch(campaign._id, batch, deliverer(campaign, template, baseUrl(req)))
    .catch((err) => console.error(`Campaign ${campaign._id} crashed:`, err));
  res.status(201).json({ success: true, campaign });
}

/**
 * @route  POST /api/campaigns/whatsapp  { templateId, audience, testPhone? }
 * @desc   Send a registered, approved template; first 500 recipients now, the rest via /:id/continue
 */
router.post('/whatsapp', async (req, res) => {
  try {
    const { templateId, audience, testPhone } = req.body || {};
    if (!AUDIENCES.whatsapp.includes(audience)) return res.status(400).json({ success: false, message: 'Choose who to send to' });
    const { template, error } = await sendableTemplate(templateId);
    if (error) return res.status(400).json({ success: false, message: error });
    await launch(req, res, {
      channel: 'whatsapp',
      audience,
      templateId: template._id,
      template: { name: template.name, language: template.language, label: template.label, category: template.category },
    }, testPhone, template);
  } catch (err) {
    console.error('WhatsApp campaign error:', err);
    res.status(500).json({ success: false, message: 'Failed to start sending' });
  }
});

/**
 * @route  POST /api/campaigns/email  { subject, body, ctaText?, ctaUrl?, audience, testEmail? }
 * @desc   One email per recipient (never shared To/CC); first 500 now, the rest via /:id/continue
 */
router.post('/email', async (req, res) => {
  try {
    const { audience, testEmail } = req.body || {};
    if (!AUDIENCES.email.includes(audience)) return res.status(400).json({ success: false, message: 'Choose who to send to' });
    const notReady = emailReady();
    if (notReady) return res.status(400).json({ success: false, message: notReady });
    const content = emailContent(req.body);
    if (content.error) return res.status(400).json({ success: false, message: content.error });
    await launch(req, res, { channel: 'email', audience, ...content }, testEmail, null);
  } catch (err) {
    console.error('Email campaign error:', err);
    res.status(500).json({ success: false, message: 'Failed to start sending' });
  }
});

/**
 * @route  GET /api/campaigns
 * @desc   Recent WhatsApp / email campaigns, newest first
 */
router.get('/', async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 }).limit(50).populate('sentBy', 'name').lean();
    res.json({ success: true, campaigns });
  } catch (err) {
    console.error('Campaign list error:', err);
    res.status(500).json({ success: false, message: 'Failed to load campaigns' });
  }
});

/**
 * @route  GET /api/campaigns/:id
 * @desc   Progress of one campaign (polled while status is 'sending')
 */
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Campaign not found' });
    const campaign = await Campaign.findById(req.params.id).populate('sentBy', 'name').lean();
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    res.json({ success: true, campaign });
  } catch (err) {
    console.error('Campaign progress error:', err);
    res.status(500).json({ success: false, message: 'Failed to load campaign' });
  }
});

/**
 * @route  POST /api/campaigns/:id/continue
 * @desc   Send the next batch of the same campaign to people it has not tried yet
 */
router.post('/:id/continue', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Campaign not found' });
    const campaign = await Campaign.findById(req.params.id).select('+sentTo');
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    if (campaign.audience === 'test') return res.status(400).json({ success: false, message: 'Test sends cannot be continued' });

    let template = null;
    if (campaign.channel === 'whatsapp') {
      const check = await sendableTemplate(campaign.templateId);
      if (check.error) return res.status(400).json({ success: false, message: check.error });
      template = check.template;
    } else {
      const notReady = emailReady();
      if (notReady) return res.status(400).json({ success: false, message: notReady });
    }
    if (await busy(campaign.channel, campaign.audience, campaign._id)) {
      return res.status(409).json({ success: false, message: 'A campaign to this audience is still sending. Wait for it to finish.' });
    }

    const audience = await audienceFor(campaign.channel, campaign.audience);
    const { batch, remaining } = nextBatch(audience.people, campaign.sentTo);
    if (!batch.length) {
      await Campaign.updateOne({ _id: campaign._id }, { $set: { remaining: 0 } });
      return res.status(400).json({ success: false, message: 'Everyone in this audience has already been sent this campaign' });
    }

    // Claim atomically so a double click cannot start two batches.
    const claimed = await Campaign.findOneAndUpdate(
      {
        _id: campaign._id,
        $or: [{ status: { $ne: 'sending' } }, { updatedAt: { $lt: new Date(Date.now() - STALE_SENDING_MS) } }],
      },
      { $set: { status: 'sending', skipped: audience.skipped, remaining }, $inc: { recipients: batch.length } },
      { new: true },
    ).populate('sentBy', 'name');
    if (!claimed) return res.status(409).json({ success: false, message: 'This campaign is already sending' });

    runBatch(claimed._id, batch, deliverer(claimed, template, baseUrl(req)))
      .catch((err) => console.error(`Campaign ${claimed._id} crashed:`, err));
    res.json({ success: true, campaign: claimed });
  } catch (err) {
    console.error('Campaign continue error:', err);
    res.status(500).json({ success: false, message: 'Failed to continue sending' });
  }
});

module.exports = router;
