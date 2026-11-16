const axios = require('axios');
const { formatAmount } = require('../utils/billReport');

const MSG91_URL = 'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/';

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
async function sendBill(bill, settings) {
  const authKey = process.env.MSG91_AUTH_KEY;
  if (!authKey) return { success: false, error: 'MSG91_AUTH_KEY is not configured' };

  const components = {};
  templateValues(bill, settings.traderName, settings.contactPhone).forEach((value, i) => {
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
          name: settings.template,
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

const TEMPLATE_CACHE_MS = 5 * 60 * 1000;
const templateCache = new Map();

/**
 * Look up the template in MSG91: approval status and how many {{n}} blanks its body has.
 * MSG91 accepts a send even when the value count is wrong and only fails it later, so this is
 * checked before every batch. Never throws.
 * @returns {Promise<{status?: string, variables?: number, error?: string}>}
 */
async function getTemplateInfo(settings) {
  const key = `${settings.template}|${settings.language}`;
  const cached = templateCache.get(key);
  if (cached && Date.now() - cached.at < TEMPLATE_CACHE_MS) return cached.info;

  const authKey = process.env.MSG91_AUTH_KEY;
  if (!authKey) return { error: 'MSG91_AUTH_KEY is not configured' };
  const number = process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER || '916201176610';
  try {
    const { data } = await axios.get(`https://control.msg91.com/api/v5/whatsapp/get-template-client/${number}`, {
      params: { template_name: settings.template },
      headers: { authkey: authKey, accept: 'application/json' },
      timeout: 15000,
    });
    const templates = Array.isArray(data?.data) ? data.data : [data?.data].filter(Boolean);
    const tpl = templates.find((t) => t.name === settings.template);
    const lang = tpl?.languages?.find((l) => l.language === settings.language);
    if (!lang) return { error: `Template "${settings.template}" (${settings.language}) was not found in MSG91` };
    const body = (lang.code || lang.components || []).find((c) => String(c.type).toUpperCase() === 'BODY');
    const variables = new Set(String(body?.text || '').match(/\{\{\d+\}\}/g) || []).size;
    const info = { status: String(lang.status || '').toLowerCase(), variables };
    templateCache.set(key, { at: Date.now(), info });
    return info;
  } catch (err) {
    return { error: `Could not check the template in MSG91 (${err.response?.status || err.message})` };
  }
}

module.exports = { sendBill, templateValues, getTemplateInfo };
