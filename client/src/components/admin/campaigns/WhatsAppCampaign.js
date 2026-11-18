import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { campaignAPI, whatsappTemplateAPI } from '../../../services/api';
import CampaignProgress from './CampaignProgress';
import {
  WHATSAPP_AUDIENCES, COST_PER_MESSAGE, inputCls, primaryBtn, errorMessage, fillTemplate,
} from './constants';

const SAMPLE_NAME = 'Ramesh Kumar';
const isPhone = (p) => /^[6-9]\d{9}$/.test(p);

/** Send an approved WhatsApp template (from the Templates registry) to an audience. */
const WhatsAppCampaign = ({ initialAudience, onOpenTemplates }) => {
  const queryClient = useQueryClient();
  const preset = WHATSAPP_AUDIENCES.some((a) => a.value === initialAudience) ? initialAudience : null;
  const [templateId, setTemplateId] = useState('');
  const [audience, setAudience] = useState(preset || 'test');
  const [testPhone, setTestPhone] = useState('');
  const [campaignId, setCampaignId] = useState(null);

  useEffect(() => { if (preset) setAudience(preset); }, [preset]);

  const { data: templates = [], isLoading } = useQuery({ queryKey: ['wa-templates'], queryFn: whatsappTemplateAPI.getAll });
  const usable = templates.filter((t) => t.enabled && t.status === 'approved');
  const template = usable.find((t) => t._id === templateId);

  useEffect(() => {
    if (!template && usable.length) setTemplateId(usable[0]._id);
  }, [template, usable]);

  const target = audience === 'test' ? testPhone : undefined;
  const { data: reach, isFetching } = useQuery({
    queryKey: ['campaign-audience', 'whatsapp', audience, target],
    queryFn: () => campaignAPI.audience({ channel: 'whatsapp', audience, target }),
    enabled: audience !== 'test' || isPhone(testPhone),
  });
  const recipients = audience === 'test' && !isPhone(testPhone) ? 0 : reach?.recipients ?? 0;
  const batch = Math.min(recipients, 500);
  const rate = COST_PER_MESSAGE[template?.category];

  const send = useMutation({
    mutationFn: () => campaignAPI.sendWhatsApp({ templateId, audience, testPhone: audience === 'test' ? testPhone : undefined }),
    onSuccess: (c) => {
      queryClient.setQueryData(['campaign', c._id], c);
      setCampaignId(c._id);
      toast.success(`Sending to ${c.recipients}`);
    },
    onError: (err) => toast.error(errorMessage(err, 'Could not send')),
  });

  const submit = (e) => {
    e.preventDefault();
    const cost = rate ? `\nEstimated cost: ≈ ₹${(batch * rate).toFixed(2)} (${template.category}, ≈ ₹${rate}/message)` : '';
    const more = recipients > batch ? `\n${recipients - batch} more can be sent after this batch.` : '';
    if (window.confirm(`Send "${template.label}" on WhatsApp to ${batch} ${batch === 1 ? 'person' : 'people'} now?${cost}${more}\nThis cannot be undone.`)) {
      send.mutate();
    }
  };

  if (isLoading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (!usable.length) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        No approved template is switched on yet. Add one in{' '}
        <button type="button" className="underline font-medium" onClick={onOpenTemplates}>Templates</button>{' '}
        and wait for MSG91/Meta to approve it.
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <form onSubmit={submit} className="lg:col-span-3 bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          Template
          <select className={inputCls} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            {usable.map((t) => (
              <option key={t._id} value={t._id}>{t.label} · {t.language}{t.category ? ` · ${t.category}` : ''}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Send to
          <select className={inputCls} value={audience} onChange={(e) => setAudience(e.target.value)}>
            {WHATSAPP_AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </label>
        {audience === 'test' && (
          <label className="block text-sm font-medium text-gray-700">
            Mobile number *
            <input className={inputCls} inputMode="numeric" maxLength={10} required pattern="[6-9][0-9]{9}" placeholder="10-digit mobile"
              value={testPhone} onChange={(e) => setTestPhone(e.target.value.replace(/\D/g, ''))} />
          </label>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-100">
          <div className="text-sm text-gray-600">
            Will reach <strong>{isFetching ? '…' : recipients}</strong>
            {reach?.skipped > 0 && <span> · {reach.skipped} skipped (opted out)</span>}
            {recipients > 500 && <span className="block text-xs">Sent 500 at a time; continue after each batch.</span>}
            {rate && batch > 0 && <span className="block text-xs">Estimated cost ≈ ₹{(batch * rate).toFixed(2)} ({template.category})</span>}
          </div>
          <button type="submit" className={primaryBtn} disabled={send.isPending || !recipients}>
            <PaperAirplaneIcon className="w-4 h-4" />
            {send.isPending ? 'Starting…' : 'Send'}
          </button>
        </div>
      </form>

      <div className="lg:col-span-2 space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Preview <span className="text-xs text-gray-400">(name shown as “{SAMPLE_NAME}”)</span></p>
          <div className="rounded-xl bg-[#efeae2] p-4">
            <div className="rounded-lg bg-white p-3 shadow-sm max-w-sm">
              <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{fillTemplate(template, SAMPLE_NAME)}</p>
              {template?.buttons?.length > 0 && (
                <div className="mt-2 border-t border-gray-100 pt-2 space-y-1">
                  {template.buttons.map((b, i) => (
                    <p key={i} className="text-center text-sm font-medium text-sky-600">{b.text}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {campaignId && <CampaignProgress id={campaignId} />}
      </div>
    </div>
  );
};

export default WhatsAppCampaign;
