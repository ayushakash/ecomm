export const WHATSAPP_AUDIENCES = [
  { value: 'test', label: 'Test — one number' },
  { value: 'shop_welcome', label: 'Shop customers — welcome not sent yet' },
  { value: 'shop_all', label: 'All shop customers' },
  { value: 'customers', label: 'Registered customers (with phone)' },
];

export const EMAIL_AUDIENCES = [
  { value: 'test', label: 'Test — one email' },
  { value: 'customers', label: 'Registered customers (with email)' },
];

export const AUDIENCE_LABELS = {
  test: 'Test',
  shop_welcome: 'Shop welcome',
  shop_all: 'All shop customers',
  customers: 'Registered customers',
  all: 'Everyone with the app',
};

/** Approximate Meta price per delivered message in India (₹); an estimate only. */
export const COST_PER_MESSAGE = { MARKETING: 0.86, UTILITY: 0.12 };

export const inputCls = 'mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm';
export const primaryBtn = 'w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50';

export const formatDate = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export const errorMessage = (err, fallback) => err.response?.data?.message || fallback;

/** Template body with each {{n}} filled from the variable mapping; the 'name' source uses `sampleName`. */
export const fillTemplate = (template, sampleName) => String(template?.body || '').replace(/\{\{(\d+)\}\}/g, (match, n) => {
  const v = template.variables?.[Number(n) - 1];
  if (!v) return match;
  if (v.source === 'name') return sampleName || v.value || match;
  return v.value || match;
});
