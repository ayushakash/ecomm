const axios = require('axios');

const SEND_URL = 'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/';
const integratedNumber = () => process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER || '916201176610';

const errorText = (err) => {
  const detail = err.response?.data;
  const msg = detail?.errors || detail?.message || err.message;
  return String(typeof msg === 'string' ? msg : JSON.stringify(msg)).slice(0, 300);
};

/**
 * Send one approved MSG91 WhatsApp template to a 10-digit Indian number.
 * `values` fill the body {{1}}, {{2}}, … in order. Never throws.
 * @returns {Promise<{success: boolean, requestId?: string, error?: string}>} `requestId` matches the `requestId` in MSG91 delivery reports.
 */
async function sendTemplate({ name, language, phone, values = [] }) {
  const authKey = process.env.MSG91_AUTH_KEY;
  if (!authKey) return { success: false, error: 'MSG91_AUTH_KEY is not configured' };

  // WhatsApp rejects parameters with newlines, tabs or long runs of spaces.
  const components = {};
  values.forEach((value, i) => {
    components[`body_${i + 1}`] = { type: 'text', value: String(value).replace(/\s+/g, ' ').trim().slice(0, 1000) };
  });

  try {
    const { data } = await axios.post(SEND_URL, {
      integrated_number: integratedNumber(),
      content_type: 'template',
      payload: {
        messaging_product: 'whatsapp',
        type: 'template',
        template: {
          name,
          language: { code: language || 'en', policy: 'deterministic' },
          namespace: process.env.MSG91_WHATSAPP_NAMESPACE || null,
          to_and_components: [{ to: [`91${phone}`], components }],
        },
      },
    }, { headers: { authkey: authKey, 'Content-Type': 'application/json' }, timeout: 15000 });

    // MSG91 can answer 200 with hasError=true (e.g. template/number problems).
    if (data?.hasError || data?.status === 'fail') {
      return { success: false, error: String(data.errors || data.message || 'MSG91 rejected the message').slice(0, 300) };
    }
    return { success: true, requestId: data?.request_id || undefined };
  } catch (err) {
    return { success: false, error: errorText(err) };
  }
}

const TEMPLATE_CACHE_MS = 5 * 60 * 1000;
const templateCache = new Map();

/**
 * Look up a template in MSG91: approval status, category, body text, buttons and how many
 * {{n}} blanks the body has. MSG91 accepts a send even when the value count is wrong and only
 * fails it later, so this is checked before every batch. Cached for a few minutes unless
 * `fresh` is set. Never throws.
 * @returns {Promise<{status?: string, variables?: number, body?: string, buttons?: {type: string, text: string}[], category?: string, error?: string}>}
 */
async function getTemplateInfo({ name, language = 'en' }, { fresh = false } = {}) {
  const key = `${name}|${language}`;
  const cached = templateCache.get(key);
  if (!fresh && cached && Date.now() - cached.at < TEMPLATE_CACHE_MS) return cached.info;

  const authKey = process.env.MSG91_AUTH_KEY;
  if (!authKey) return { error: 'MSG91_AUTH_KEY is not configured' };
  try {
    const { data } = await axios.get(`https://control.msg91.com/api/v5/whatsapp/get-template-client/${integratedNumber()}`, {
      params: { template_name: name },
      headers: { authkey: authKey, accept: 'application/json' },
      timeout: 15000,
    });
    const templates = Array.isArray(data?.data) ? data.data : [data?.data].filter(Boolean);
    const tpl = templates.find((t) => t.name === name);
    const lang = tpl?.languages?.find((l) => l.language === language);
    if (!lang) return { error: `Template "${name}" (${language}) was not found in MSG91` };

    const components = lang.code || lang.components || [];
    const ofType = (type) => components.find((c) => String(c.type).toUpperCase() === type);
    const body = String(ofType('BODY')?.text || '');
    const info = {
      status: String(lang.status || '').toLowerCase(),
      variables: new Set(body.match(/\{\{\d+\}\}/g) || []).size,
      body,
      buttons: (ofType('BUTTONS')?.buttons || []).map((b) => ({ type: String(b.type || ''), text: String(b.text || '') })),
      category: String(tpl.category || lang.category || '').toUpperCase(),
    };
    templateCache.set(key, { at: Date.now(), info });
    return info;
  } catch (err) {
    return { error: `Could not check the template in MSG91 (${err.response?.status || err.message})` };
  }
}

/**
 * Body values for one recipient from a registry template's variable mapping:
 * 'name' → the recipient's name (or the fallback when missing), 'static' → fixed text.
 */
function valuesFor(template, recipientName) {
  const name = String(recipientName || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  return template.variables.map((v) => (v.source === 'name' ? name || v.value : v.value));
}

module.exports = { sendTemplate, getTemplateInfo, valuesFor };
