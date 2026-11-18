const { formatAmount } = require('../utils/billReport');
const WhatsAppTemplateService = require('./WhatsAppTemplateService');

/** "9241514013" / "+91 92415-14013" → "+91 92415 14013"; other formats are passed through trimmed. */
function formatContact(raw) {
  const digits = String(raw || '').replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
  return digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : String(raw || '').trim();
}

/**
 * Template variables, in order — must match the approved MSG91 template:
 *   {{1}} trader, {{2}} bill no, {{3}} date, {{4}} total, and {{5}} contact number when one is set
 *   (bill_details has 4 variables; bill_details_v2 has 5). Paid / balance due are never sent.
 */
function templateValues(bill, traderName, contactPhone) {
  const values = [traderName, bill.billNo, bill.dateLabel, formatAmount(bill.total)];
  if (String(contactPhone || '').trim()) values.push(formatContact(contactPhone));
  return values;
}

/**
 * Send one bill via MSG91 WhatsApp template. Never throws.
 * @returns {Promise<{success: boolean, error?: string}>}
 */
function sendBill(bill, settings) {
  return WhatsAppTemplateService.sendTemplate({
    name: settings.template,
    language: settings.language,
    phone: bill.phone,
    values: templateValues(bill, settings.traderName, settings.contactPhone).map((v) => String(v).replace(/\s+/g, ' ').slice(0, 60)),
  });
}

/** MSG91 status and body variable count of the configured bill template (see WhatsAppTemplateService.getTemplateInfo). */
function getTemplateInfo(settings) {
  return WhatsAppTemplateService.getTemplateInfo({ name: settings.template, language: settings.language });
}

module.exports = { sendBill, templateValues, getTemplateInfo };
