import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { settingsAPI } from '../../../services/api';

const DEFAULTS = { enabled: false, traderName: 'Chardeevari', template: 'bill_details', contactPhone: '', language: 'en' };
const inputCls = 'mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm';

/** Trader name, MSG91 template name and the master on/off switch for sending. */
const BillSettings = () => {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsAPI.getSettings });
  const [form, setForm] = useState(DEFAULTS);
  // Fill the form from saved settings exactly once: a later refetch must not wipe unsaved edits.
  const initialized = useRef(false);
  useEffect(() => {
    if (settings && !initialized.current) {
      initialized.current = true;
      setForm({ ...DEFAULTS, ...(settings.whatsappBills || {}) });
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: () => settingsAPI.updateSettings({ whatsappBills: form }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['settings'] }); toast.success('Saved'); },
    onError: (err) => toast.error(err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || 'Could not save'),
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Never show (and let someone save) defaults before the real settings have loaded.
  if (isLoading || !settings) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <form className="bg-white rounded-lg border border-gray-200 p-4 space-y-4 max-w-xl" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <label className="flex items-start gap-3">
        <input type="checkbox" className="w-5 h-5 mt-0.5" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} />
        <span className="text-sm">
          <strong>Sending on</strong>
          <span className="block text-gray-500">Turn on only after MSG91 shows the template as <em>Approved</em>.</span>
        </span>
      </label>
      <label className="block text-sm font-medium text-gray-700">
        Trader name in the message
        <input className={inputCls} required minLength={2} maxLength={60} value={form.traderName} onChange={(e) => set('traderName', e.target.value)} />
        <span className="text-xs text-gray-500 font-normal">"Thank you for shopping with <strong>{form.traderName || '…'}</strong>!"</span>
      </label>
      <label className="block text-sm font-medium text-gray-700">
        Contact number in the message ({'{{5}}'})
        <input className={inputCls} inputMode="tel" maxLength={16} placeholder="e.g. 9241514013" pattern="\+?[0-9\s\-]{10,16}"
          value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} />
        <span className="text-xs text-gray-500 font-normal">
          "For any queries, please call or WhatsApp us at <strong>{form.contactPhone || '…'}</strong>." Fill this only with a template that has
          {' {{5}}'} (e.g. <code>bill_details_v2</code>); leave empty for <code>bill_details</code> — otherwise MSG91 rejects the message.
        </span>
      </label>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm font-medium text-gray-700">
          Template name
          <input className={inputCls} required pattern="[a-z0-9_]+" value={form.template} onChange={(e) => set('template', e.target.value.trim())} />
        </label>
        <label className="text-sm font-medium text-gray-700">
          Language code
          <input className={inputCls} required pattern="[a-z]{2}(_[A-Z]{2})?" value={form.language} onChange={(e) => set('language', e.target.value.trim())} />
        </label>
      </div>
      <p className="text-xs text-gray-500">Must match exactly what you created in MSG91 (e.g. <code>bill_details</code>, <code>en</code>). The message shows trader name, bill no, date and total only — never paid or balance due.</p>
      <button type="submit" disabled={save.isPending} className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm">{save.isPending ? 'Saving…' : 'Save'}</button>
    </form>
  );
};

export default BillSettings;
