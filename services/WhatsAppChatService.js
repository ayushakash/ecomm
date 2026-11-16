const axios = require('axios');
const WhatsAppChat = require('../models/WhatsAppChat');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const BillMessage = require('../models/BillMessage');
const AppSettings = require('../models/AppSettings');
const { normalizePhone } = require('../utils/billReport');

const SESSION_URL = 'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/';
const WINDOW_MS = 24 * 60 * 60 * 1000;

const integratedNumber = () => process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER || '916201176610';

/** Is the 24-hour customer-service window open (free-text replies allowed)? */
const windowOpen = (chat, now = Date.now()) => !!chat?.lastInboundAt && now - new Date(chat.lastInboundAt).getTime() < WINDOW_MS;

/** Readable one-line text for a non-text inbound message (photo, document, location…). */
function inboundText(payload) {
  const type = String(payload.contentType || payload.messageType || 'text').toLowerCase();
  if (type === 'text') return String(payload.text ?? '').trim();
  if (type === 'button') {
    try { return `[Button] ${JSON.parse(payload.button || '{}').text || ''}`.trim(); } catch { return '[Button]'; }
  }
  const caption = String(payload.caption || '').trim();
  const labels = { image: '📷 Photo', video: '🎥 Video', audio: '🎤 Voice message', voice: '🎤 Voice message', document: '📄 Document', location: '📍 Location', sticker: 'Sticker', contacts: '👤 Contact', reaction: `Reacted ${payload.reaction || ''}` };
  return [labels[type] || `[${type}]`, payload.filename, caption].filter(Boolean).join(' · ');
}

/**
 * Send a free-text WhatsApp message (only valid inside the 24 h window). Never throws.
 * @returns {Promise<{success: boolean, providerId?: string, error?: string}>}
 */
async function sendText(phone, text) {
  const authKey = process.env.MSG91_AUTH_KEY;
  if (!authKey) return { success: false, error: 'MSG91_AUTH_KEY is not configured' };
  try {
    const { data } = await axios.post(SESSION_URL, {
      integrated_number: integratedNumber(),
      recipient_number: `91${phone}`,
      content_type: 'text',
      text,
    }, { headers: { authkey: authKey, 'Content-Type': 'application/json', accept: 'application/json' }, timeout: 15000 });
    if (data?.hasError || data?.status === 'fail') {
      return { success: false, error: String(data.errors || data.message || 'MSG91 rejected the message').slice(0, 300) };
    }
    return { success: true, providerId: data?.data?.message_uuid };
  } catch (err) {
    const detail = err.response?.data;
    const msg = detail?.errors || detail?.message || err.message;
    return { success: false, error: String(typeof msg === 'string' ? msg : JSON.stringify(msg)).slice(0, 300) };
  }
}

/** Save an outbound message and update the chat summary. */
async function recordOutbound(phone, text, result, { sentBy, autoReply = false } = {}) {
  const msg = await WhatsAppMessage.create({
    phone, direction: 'out', contentType: 'text', text,
    providerId: result.providerId, status: result.success ? 'sent' : 'failed', error: result.error,
    sentBy, autoReply,
  });
  await WhatsAppChat.updateOne(
    { phone },
    { $set: { lastText: text.slice(0, 200), lastDirection: 'out', lastMessageAt: msg.at, ...(autoReply ? { lastAutoReplyAt: msg.at } : {}) } },
    { upsert: true },
  );
  return msg;
}

/** Fallback chat name: the party name on this customer's latest bill. */
async function nameFromBills(phone) {
  const bill = await BillMessage.findOne({ phone, partyName: { $nin: ['', null] } }).sort({ createdAt: -1 }).select('partyName').lean();
  return bill?.partyName;
}

/**
 * Store a customer's inbound message from the MSG91 webhook. Duplicate deliveries (same wamid) are ignored.
 * Sends the auto-reply (if enabled) at most once per customer per 24 h — never to STOP messages.
 * @returns {Promise<{message?: object, duplicate?: boolean}>}
 */
async function recordInbound(payload, { isStop = false } = {}) {
  const phone = normalizePhone(payload.customerNumber ?? payload.from ?? payload.sender);
  if (!phone) return {};
  const at = payload.ts ? new Date(payload.ts) : new Date();
  const when = Number.isNaN(at.getTime()) ? new Date() : at;

  let message;
  try {
    message = await WhatsAppMessage.create({
      phone, direction: 'in',
      contentType: String(payload.contentType || payload.messageType || 'text').toLowerCase(),
      text: inboundText(payload),
      mediaUrl: payload.url || undefined,
      filename: payload.filename || undefined,
      waId: payload.uuid || undefined,
      status: 'received',
      at: when,
    });
  } catch (err) {
    if (err.code === 11000) return { duplicate: true };
    throw err;
  }

  const existing = await WhatsAppChat.findOne({ phone }).select('name lastAutoReplyAt').lean();
  const name = String(payload.customerName || '').trim() || existing?.name || await nameFromBills(phone);
  const chat = await WhatsAppChat.findOneAndUpdate(
    { phone },
    {
      $set: { name, lastText: (message.text || '').slice(0, 200), lastDirection: 'in', lastMessageAt: when, lastInboundAt: when },
      $inc: { unread: 1 },
    },
    { upsert: true, new: true },
  );

  if (!isStop) {
    const s = (await AppSettings.findOne().select('whatsappChat').lean())?.whatsappChat;
    const recentlyAutoReplied = chat.lastAutoReplyAt && Date.now() - new Date(chat.lastAutoReplyAt).getTime() < WINDOW_MS;
    if (s?.autoReplyEnabled && s.autoReplyText && !recentlyAutoReplied) {
      const result = await module.exports.sendText(phone, s.autoReplyText);
      await recordOutbound(phone, s.autoReplyText, result, { autoReply: true });
    }
  }
  return { message };
}

/** Delivery report for an outbound message (matched by MSG91 id). Unknown ids are ignored. */
async function recordStatus(payload) {
  const ids = [payload.requestId, payload.uuid, payload.messageId].filter(Boolean);
  const raw = String(payload.status || payload.eventName || payload.event || '').toLowerCase();
  const status = ['delivered', 'read', 'failed', 'sent'].find((s) => raw.includes(s));
  if (!ids.length || !status) return false;
  const res = await WhatsAppMessage.updateOne(
    { direction: 'out', providerId: { $in: ids } },
    { $set: { status, ...(status === 'failed' ? { error: String(payload.reason || 'Delivery failed').slice(0, 300) } : {}) } },
  );
  return res.modifiedCount > 0;
}

module.exports = { sendText, recordInbound, recordOutbound, recordStatus, windowOpen, WINDOW_MS };
