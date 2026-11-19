const BillMessage = require('../models/BillMessage');
const Campaign = require('../models/Campaign');

/**
 * Applies MSG91 delivery reports ("On Outbound Report Received" webhook) to WhatsApp bills and
 * campaigns, matched by the request id MSG91 returned when the template was sent.
 */

const RANK = { sent: 1, delivered: 2, read: 3 };
const ERROR_SAMPLE = 5;

// Meta error codes that need a plain explanation in the admin.
const REASONS = {
  131026: 'Not delivered: number not on WhatsApp, old WhatsApp version, or they blocked us',
  130472: 'Held back by Meta (marketing message limit experiment)',
  131049: 'Held back by Meta (too many marketing messages to this person)',
  131047: 'Not delivered: 24-hour window closed',
  131050: 'Customer stopped marketing messages from us',
};

const eventOf = (payload) => {
  const raw = String(payload.eventName || payload.status || payload.event || '').toLowerCase();
  return ['failed', 'read', 'delivered', 'sent'].find((s) => raw.includes(s));
};

/** "131026: Message undeliverable" → plain explanation (keeps Meta's text when unknown). */
const reasonText = (reason) => {
  const text = String(reason || 'Not delivered').trim();
  const code = text.match(/\b(1\d{5})\b/)?.[1];
  return (REASONS[code] ? `${REASONS[code]} (${code})` : text).slice(0, 300);
};

/** A report only moves a bill forward (sent → delivered → read); "failed" applies unless already read. */
const advances = (current, event) => (event === 'failed' ? current !== 'read' : (RANK[event] || 0) > (RANK[current] || 0));

/**
 * @param {object} payload MSG91 report: requestId, eventName (sent|delivered|read|failed), reason, customerNumber
 * @returns {Promise<boolean>} true when it matched a bill or a campaign
 */
async function recordReport(payload) {
  const requestId = payload.requestId;
  const event = eventOf(payload);
  if (!requestId || !event) return false;
  const reason = event === 'failed' ? reasonText(payload.reason) : undefined;

  let matched = false;
  const bill = await BillMessage.findOne({ providerId: requestId }).select('delivery').lean();
  if (bill) {
    matched = true;
    if (advances(bill.delivery, event)) {
      await BillMessage.updateOne({ _id: bill._id }, {
        $set: { delivery: event, deliveryAt: new Date(), ...(reason && { deliveryError: reason }) },
      });
    }
  }

  // Campaign counts: one report per stage per message, so "sent" is already counted at send time.
  const field = { delivered: 'delivered', read: 'read', failed: 'undelivered' }[event];
  if (field) {
    const phone = String(payload.customerNumber || '').replace(/^91(?=\d{10}$)/, '');
    const update = { $inc: { [field]: 1 } };
    if (reason) update.$push = { errorSample: { $each: [`${phone}: ${reason}`], $slice: ERROR_SAMPLE } };
    const res = await Campaign.updateOne({ providerIds: requestId }, update);
    matched = matched || res.matchedCount > 0;
  }
  return matched;
}

/** True for MSG91 reports about messages we sent (MSG91 marks outbound with direction "1"). */
const isOutboundReport = (payload) => payload.webhookType === 'outbound' || String(payload.direction) === '1';

module.exports = { recordReport, isOutboundReport, reasonText };
