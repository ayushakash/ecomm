import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { campaignAPI } from '../../../services/api';
import CampaignProgress from './CampaignProgress';
import { EMAIL_AUDIENCES, inputCls, primaryBtn, errorMessage } from './constants';

const EMPTY = { subject: '', body: '', ctaText: '', ctaUrl: '', audience: 'test', testEmail: '' };
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

/** Wait until `value` stops changing for `ms` before using it (keeps the preview from refetching on every key). */
const useDebounced = (value, ms) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
};

/** Plain-text email to customers, wrapped in the branded layout with an unsubscribe link. */
const EmailCampaign = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [campaignId, setCampaignId] = useState(null);
  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const { data: status } = useQuery({ queryKey: ['email-status'], queryFn: campaignAPI.emailStatus });
  const testOk = isEmail(form.testEmail);
  const target = form.audience === 'test' ? form.testEmail.trim() : undefined;
  const { data: reach, isFetching } = useQuery({
    queryKey: ['campaign-audience', 'email', form.audience, target],
    queryFn: () => campaignAPI.audience({ channel: 'email', audience: form.audience, target }),
    enabled: form.audience !== 'test' || testOk,
  });
  const recipients = form.audience === 'test' && !testOk ? 0 : reach?.recipients ?? 0;
  const batch = Math.min(recipients, 500);

  const content = useDebounced(JSON.stringify({ body: form.body, ctaText: form.ctaText, ctaUrl: form.ctaUrl }), 400);
  const { data: previewHtml } = useQuery({
    queryKey: ['email-preview', content],
    queryFn: () => campaignAPI.emailPreview(JSON.parse(content)),
    placeholderData: (prev) => prev,
  });

  const send = useMutation({
    mutationFn: () => campaignAPI.sendEmail({
      subject: form.subject,
      body: form.body,
      ctaText: form.ctaText || undefined,
      ctaUrl: form.ctaUrl || undefined,
      audience: form.audience,
      testEmail: form.audience === 'test' ? form.testEmail.trim() : undefined,
    }),
    onSuccess: (c) => {
      queryClient.setQueryData(['campaign', c._id], c);
      setCampaignId(c._id);
      toast.success(`Sending to ${c.recipients}`);
    },
    onError: (err) => toast.error(errorMessage(err, 'Could not send')),
  });

  const submit = (e) => {
    e.preventDefault();
    const more = recipients > batch ? `\n${recipients - batch} more can be sent after this batch.` : '';
    if (window.confirm(`Email "${form.subject}" to ${batch} ${batch === 1 ? 'person' : 'people'} now?${more}\nThis cannot be undone.`)) {
      send.mutate();
    }
  };

  const transport = status?.transport;

  return (
    <div className="space-y-4">
      {transport && transport !== 'brevo' && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <strong>Server can't send via SMTP; add BREVO_API_KEY.</strong>{' '}
          {transport === 'smtp'
            ? 'SMTP is set up, which works on a local machine but not on the live server.'
            : 'No email transport is set up, so nothing can be sent.'}
        </div>
      )}
      {transport === 'brevo' && (
        <p className="text-xs text-gray-500">Sending through Brevo{status.from ? ` as ${status.from}` : ''}.</p>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        <form onSubmit={submit} className="lg:col-span-3 bg-white rounded-lg border border-gray-200 p-4 space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Subject *
            <input className={inputCls} value={form.subject} maxLength={150} required placeholder="Cement at the lowest price in Ranchi this week"
              onChange={(e) => setField('subject', e.target.value)} />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Message *
            <textarea className={inputCls} rows={8} value={form.body} maxLength={5000} required
              placeholder={'Namaste!\n\nLeave an empty line between paragraphs.'}
              onChange={(e) => setField('body', e.target.value)} />
          </label>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm font-medium text-gray-700">
              Button text
              <input className={inputCls} value={form.ctaText} maxLength={40} placeholder="Shop now" required={!!form.ctaUrl}
                onChange={(e) => setField('ctaText', e.target.value)} />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Button link
              <input className={inputCls} type="url" value={form.ctaUrl} placeholder="https://chardeevari.in/products" required={!!form.ctaText}
                onChange={(e) => setField('ctaUrl', e.target.value.trim())} />
            </label>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm font-medium text-gray-700">
              Send to
              <select className={inputCls} value={form.audience} onChange={(e) => setField('audience', e.target.value)}>
                {EMAIL_AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </label>
            {form.audience === 'test' && (
              <label className="text-sm font-medium text-gray-700">
                Email *
                <input className={inputCls} type="email" required value={form.testEmail} placeholder="you@example.com"
                  onChange={(e) => setField('testEmail', e.target.value)} />
              </label>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-100">
            <div className="text-sm text-gray-600">
              Will reach <strong>{isFetching ? '…' : recipients}</strong>
              {reach?.skipped > 0 && <span> · {reach.skipped} skipped (unsubscribed)</span>}
              {recipients > 500 && <span className="block text-xs">Sent 500 at a time; continue after each batch.</span>}
            </div>
            <button type="submit" className={primaryBtn} disabled={send.isPending || !recipients || transport === 'none'}>
              <PaperAirplaneIcon className="w-4 h-4" />
              {send.isPending ? 'Starting…' : 'Send'}
            </button>
          </div>
        </form>

        <div className="lg:col-span-2 space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Preview</p>
            <p className="text-xs text-gray-500 mb-1">Subject: <span className="text-gray-800">{form.subject || '—'}</span></p>
            <iframe title="Email preview" sandbox="" srcDoc={previewHtml || ''}
              className="w-full h-[28rem] rounded-lg border border-gray-200 bg-gray-50" />
          </div>
          {campaignId && <CampaignProgress id={campaignId} />}
        </div>
      </div>
    </div>
  );
};

export default EmailCampaign;
