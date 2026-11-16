const express = require('express');
const WhatsAppChat = require('../models/WhatsAppChat');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const WhatsAppChatService = require('../services/WhatsAppChatService');
const { normalizePhone } = require('../utils/billReport');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken, requireAdmin);

const withWindow = (chat) => {
  const open = WhatsAppChatService.windowOpen(chat);
  return {
    ...chat,
    windowOpen: open,
    windowClosesAt: open ? new Date(new Date(chat.lastInboundAt).getTime() + WhatsAppChatService.WINDOW_MS) : null,
  };
};

/**
 * @route  GET /api/whatsapp-chat/chats?q=
 * @desc   Conversations, newest first, with unread count and whether a free reply is still allowed
 */
router.get('/chats', async (req, res) => {
  try {
    const filter = {};
    const q = String(req.query.q || '').trim();
    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [{ phone: new RegExp(safe) }, { name: new RegExp(safe, 'i') }];
    }
    const chats = await WhatsAppChat.find(filter).sort({ lastMessageAt: -1 }).limit(300).lean();
    res.json({ success: true, chats: chats.map(withWindow) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load chats' });
  }
});

/** @route GET /api/whatsapp-chat/unread — total unread messages (for the sidebar badge). */
router.get('/unread', async (req, res) => {
  try {
    const [r] = await WhatsAppChat.aggregate([{ $group: { _id: null, n: { $sum: '$unread' } } }]);
    res.json({ success: true, unread: r?.n || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load unread count' });
  }
});

/**
 * @route  GET /api/whatsapp-chat/chats/:phone/messages
 * @desc   Messages of one conversation (oldest first, last 200); marks the conversation read
 */
router.get('/chats/:phone/messages', async (req, res) => {
  try {
    const phone = normalizePhone(req.params.phone);
    if (!phone) return res.status(400).json({ success: false, message: 'Invalid phone' });
    const [chat, latest] = await Promise.all([
      WhatsAppChat.findOneAndUpdate({ phone }, { $set: { unread: 0 } }, { new: true }).lean(),
      WhatsAppMessage.find({ phone }).sort({ at: -1, _id: -1 }).limit(200).lean(),
    ]);
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });
    res.json({ success: true, chat: withWindow(chat), messages: latest.reverse() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load messages' });
  }
});

/**
 * @route  POST /api/whatsapp-chat/chats/:phone/messages   { text }
 * @desc   Reply as free text — only allowed within 24 h of the customer's last message (WhatsApp rule)
 */
router.post('/chats/:phone/messages', async (req, res) => {
  try {
    const phone = normalizePhone(req.params.phone);
    const text = String(req.body?.text ?? '').trim();
    if (!phone) return res.status(400).json({ success: false, message: 'Invalid phone' });
    if (!text) return res.status(400).json({ success: false, message: 'Type a message' });
    if (text.length > 4000) return res.status(400).json({ success: false, message: 'Message is too long (max 4000 characters)' });

    const chat = await WhatsAppChat.findOne({ phone }).lean();
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });
    if (!WhatsAppChatService.windowOpen(chat)) {
      return res.status(400).json({
        success: false,
        message: 'More than 24 hours since the customer last wrote — WhatsApp only allows replies within 24 hours. Please call them.',
      });
    }

    const result = await WhatsAppChatService.sendText(phone, text);
    const message = await WhatsAppChatService.recordOutbound(phone, text, result, { sentBy: req.user._id });
    if (!result.success) {
      return res.status(502).json({ success: false, message: `Not sent: ${result.error}`, sentMessage: message });
    }
    res.status(201).json({ success: true, message });
  } catch (err) {
    console.error('WhatsApp chat reply error:', err);
    res.status(500).json({ success: false, message: 'Failed to send' });
  }
});

module.exports = router;
