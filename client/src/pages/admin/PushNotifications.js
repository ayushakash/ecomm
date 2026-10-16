import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { BellAlertIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { productAPI, pushCampaignAPI } from '../../services/api';

const LINK_TYPES = [
  { value: 'none', label: 'Just open the app' },
  { value: 'products', label: 'All products' },
  { value: 'category', label: 'Category' },
  { value: 'product', label: 'Product (ID)' },
  { value: 'calculator', label: 'Material calculator' },
  { value: 'url', label: 'Web link' },
];

const EMPTY = { title: '', body: '', audience: 'all', city: '', linkType: 'none', linkValue: '' };

const inputCls = 'mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm';

const PushNotifications = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: productAPI.getCategories });
  const { data: campaigns = [], isLoading } = useQuery({ queryKey: ['push-campaigns'], queryFn: pushCampaignAPI.getAll });
  const { data: reach } = useQuery({
    queryKey: ['push-audience', form.audience, form.audience === 'city' ? form.city.trim().toLowerCase() : ''],
    queryFn: () => pushCampaignAPI.audience({ audience: form.audience, city: form.city.trim() }),
  });

  const sendMutation = useMutation({
    mutationFn: pushCampaignAPI.send,
    onSuccess: (c) => {
      queryClient.invalidateQueries({ queryKey: ['push-campaigns'] });
      setForm(EMPTY);
      toast.success(`Sent to ${c.sent} device${c.sent === 1 ? '' : 's'}${c.failed ? ` (${c.failed} failed)` : ''}`);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to send notification'),
  });

  const submit = (e) => {
    e.preventDefault();
    const where = form.audience === 'city' ? `people in ${form.city.trim()}` : 'everyone with the app';
    if (window.confirm(`Send this notification to ${reach?.customers ?? 0} ${where} now? This cannot be undone.`)) {
      sendMutation.mutate(form);
    }
  };

  const linkLabel = (c) => {
    if (c.linkType === 'category') return `Category: ${categories.find((x) => x._id === c.linkValue)?.name || c.linkValue}`;
    if (c.linkType === 'product' || c.linkType === 'url') return `${LINK_TYPES.find((t) => t.value === c.linkType).label}: ${c.linkValue}`;
    return LINK_TYPES.find((t) => t.value === c.linkType)?.label;
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Push Notifications</h1>
        <p className="text-sm text-gray-500">
          Send offers and announcements to everyone who has the mobile app with notifications on (logged in or not).
          Order updates (confirmed, out for delivery, delivered, cancelled) are sent automatically.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <form onSubmit={submit} className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Title *
            <input className={inputCls} value={form.title} maxLength={65} required placeholder="🔥 ₹20 off every cement bag"
              onChange={(e) => setField('title', e.target.value)} />
            <span className="text-xs text-gray-400">{form.title.length}/65</span>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Message *
            <textarea className={inputCls} rows={3} value={form.body} maxLength={240} required
              placeholder="UltraTech & ACC at the lowest price in Ranchi. Offer ends Sunday!"
              onChange={(e) => setField('body', e.target.value)} />
            <span className="text-xs text-gray-400">{form.body.length}/240</span>
          </label>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm font-medium text-gray-700">
              Send to
              <select className={inputCls} value={form.audience} onChange={(e) => setField('audience', e.target.value)}>
                <option value="all">Everyone with the app</option>
                <option value="city">People in a city</option>
              </select>
            </label>
            {form.audience === 'city' && (
              <label className="text-sm font-medium text-gray-700">
                City *
                <input className={inputCls} value={form.city} required placeholder="Ranchi"
                  onChange={(e) => setField('city', e.target.value)} />
              </label>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm font-medium text-gray-700">
              On tap open
              <select className={inputCls} value={form.linkType}
                onChange={(e) => setForm((f) => ({ ...f, linkType: e.target.value, linkValue: '' }))}>
                {LINK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            {form.linkType === 'category' && (
              <label className="text-sm font-medium text-gray-700">
                Category *
                <select className={inputCls} value={form.linkValue} required onChange={(e) => setField('linkValue', e.target.value)}>
                  <option value="">Select…</option>
                  {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </label>
            )}
            {(form.linkType === 'product' || form.linkType === 'url') && (
              <label className="text-sm font-medium text-gray-700">
                {form.linkType === 'url' ? 'URL *' : 'Product ID *'}
                <input className={inputCls} value={form.linkValue} required type={form.linkType === 'url' ? 'url' : 'text'}
                  placeholder={form.linkType === 'url' ? 'https://…' : '64f…'}
                  onChange={(e) => setField('linkValue', e.target.value.trim())} />
              </label>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-100">
            <p className="text-sm text-gray-600">
              Will reach <strong>{reach?.customers ?? '…'}</strong> {reach?.customers === 1 ? 'person' : 'people'} on{' '}
              <strong>{reach?.devices ?? '…'}</strong> device{reach?.devices === 1 ? '' : 's'}
            </p>
            <button type="submit" disabled={sendMutation.isPending || !reach?.devices}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
              <PaperAirplaneIcon className="w-4 h-4" />
              {sendMutation.isPending ? 'Sending…' : 'Send now'}
            </button>
          </div>
        </form>

        <div className="lg:col-span-2">
          <p className="text-sm font-medium text-gray-700 mb-2">Preview</p>
          <div className="rounded-2xl bg-gray-800 p-4">
            <div className="rounded-xl bg-white/95 p-3 shadow">
              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                <BellAlertIcon className="w-4 h-4 text-orange-500" />
                <span className="font-medium">Chardeevari</span>
                <span>· now</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-gray-900 break-words">{form.title || 'Notification title'}</p>
              <p className="text-sm text-gray-700 break-words line-clamp-4">{form.body || 'Your message appears here.'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <h2 className="px-4 py-3 text-sm font-semibold text-gray-900 border-b border-gray-100">Sent notifications</h2>
        {isLoading ? (
          <p className="p-4 text-sm text-gray-500">Loading…</p>
        ) : campaigns.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">Nothing sent yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2">Sent</th>
                  <th className="px-4 py-2">Notification</th>
                  <th className="px-4 py-2">Audience</th>
                  <th className="px-4 py-2">Opens</th>
                  <th className="px-4 py-2 text-right">Delivered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaigns.map((c) => (
                  <tr key={c._id} className="align-top">
                    <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                      {new Date(c.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      {c.sentBy?.name && <div className="text-xs">by {c.sentBy.name}</div>}
                    </td>
                    <td className="px-4 py-2 max-w-sm">
                      <div className="font-medium text-gray-900">{c.title}</div>
                      <div className="text-gray-600 line-clamp-2">{c.body}</div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{c.audience === 'city' ? c.city : 'Everyone'}</td>
                    <td className="px-4 py-2 text-gray-600">{linkLabel(c)}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      {c.sent}/{c.devices}
                      {c.failed > 0 && <div className="text-xs text-red-600">{c.failed} failed</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PushNotifications;
