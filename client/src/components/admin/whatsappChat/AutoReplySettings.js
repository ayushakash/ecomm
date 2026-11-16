import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { settingsAPI } from '../../../services/api';

const DEFAULTS = {
  autoReplyEnabled: false,
  autoReplyText: 'Thanks for your message! 🙏 We will reply here shortly. For urgent help, call or WhatsApp us at +91 92415 14013.',
};

/** Auto-reply on/off + text (sent at most once per customer per 24 h, never to STOP). */
const AutoReplySettings = ({ onClose }) => {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: settingsAPI.getSettings });
  const [form, setForm] = useState(DEFAULTS);
  const initialized = useRef(false);
  useEffect(() => {
    if (settings && !initialized.current) {
      initialized.current = true;
      setForm({ ...DEFAULTS, ...(settings.whatsappChat || {}) });
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: () => settingsAPI.updateSettings({ whatsappChat: form }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['settings'] }); toast.success('Saved'); onClose(); },
    onError: (err) => toast.error(err.response?.data?.errors?.[0]?.msg || 'Could not save'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <form className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 space-y-4" onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-lg">Auto-reply</h2>
          <button type="button" onClick={onClose} aria-label="Close"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        {!settings ? <p className="text-sm text-gray-500">Loading…</p> : (
          <>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" className="w-5 h-5 mt-0.5" checked={form.autoReplyEnabled} onChange={(e) => setForm((f) => ({ ...f, autoReplyEnabled: e.target.checked }))} />
              <span><strong>Send an automatic reply</strong><span className="block text-gray-500">Once per customer per day, so they know their message was received. Not sent to STOP.</span></span>
            </label>
            <textarea className="w-full border border-gray-300 rounded-lg p-3 text-sm" rows={4} maxLength={1000} required minLength={2}
              value={form.autoReplyText} onChange={(e) => setForm((f) => ({ ...f, autoReplyText: e.target.value }))} />
            <button type="submit" disabled={save.isPending} className="w-full py-3 rounded-lg bg-green-600 text-white font-semibold">{save.isPending ? 'Saving…' : 'Save'}</button>
          </>
        )}
      </form>
    </div>
  );
};

export default AutoReplySettings;
