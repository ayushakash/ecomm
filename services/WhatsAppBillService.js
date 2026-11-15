const axios = require('axios');
const { formatAmount } = require('../utils/billReport');

const MSG91_URL = 'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/';

/**
 * Template variables, in order — must match the approved MSG91 templates:
 *   bill_paid: {{1}} trader, {{2}} bill no, {{3}} date, {{4}} total
 *   bill_due:  {{1}} trader, {{2}} bill no, {{3}} date, {{4}} total, {{5}} paid, {{6}} balance
 */
function templateValues(bill, traderName) {
  const values = [traderName, bill.billNo, bill.dateLabel, formatAmount(bill.total)];
  if (bill.template === 'due') values.push(formatAmount(bill.received), formatAmount(bill.balance));
  return values;
}

/**
 * Send one bill via MSG91 WhatsApp template. Never throws.
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendBill(bill, settings) {
  const authKey = process.env.MSG91_AUTH_KEY;
  if (!authKey) return { success: false, error: 'MSG91_AUTH_KEY is not configured' };

  const components = {};
  templateValues(bill, settings.traderName).forEach((value, i) => {
    components[`body_${i + 1}`] = { type: 'text', value: String(value).replace(/\s+/g, ' ').slice(0, 60) };
  });

  try {
    const { data } = await axios.post(MSG91_URL, {
      integrated_number: process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER || '916201176610',
      content_type: 'template',
      payload: {
        messaging_product: 'whatsapp',
        type: 'template',
        template: {
          name: bill.template === 'due' ? settings.dueTemplate : settings.paidTemplate,
          language: { code: settings.language || 'en', policy: 'deterministic' },
          namespace: process.env.MSG91_WHATSAPP_NAMESPACE || null,
          to_and_components: [{ to: [`91${bill.phone}`], components }],
        },
      },
    }, { headers: { authkey: authKey, 'Content-Type': 'application/json' }, timeout: 15000 });

    // MSG91 can answer 200 with hasError=true (e.g. template/number problems).
    if (data?.hasError || data?.status === 'fail') {
      return { success: false, error: String(data.errors || data.message || 'MSG91 rejected the message').slice(0, 300) };
    }
    return { success: true };
  } catch (err) {
    const detail = err.response?.data;
    const msg = detail?.errors || detail?.message || err.message;
    return { success: false, error: String(typeof msg === 'string' ? msg : JSON.stringify(msg)).slice(0, 300) };
  }
}

module.exports = { sendBill, templateValues };
