import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { campaignAPI, pushCampaignAPI } from '../../../services/api';
import { AUDIENCE_LABELS, formatDate } from './constants';

const CHANNEL_STYLES = {
  whatsapp: 'bg-green-100 text-green-800',
  email: 'bg-sky-100 text-sky-800',
  push: 'bg-orange-100 text-orange-800',
};

/** One row shape for WhatsApp / email campaigns and push broadcasts. */
const toRow = (c) => (c.channel
  ? {
    id: c._id,
    createdAt: c.createdAt,
    channel: c.channel,
    audience: c.audience === 'test' ? `Test · ${c.testTarget || ''}` : AUDIENCE_LABELS[c.audience] || c.audience,
    what: c.channel === 'whatsapp' ? `${c.template?.label || c.template?.name} (${c.template?.language})` : c.subject,
    sent: c.sent,
    total: c.recipients,
    failed: c.failed,
    skipped: c.skipped,
    delivery: c.channel === 'whatsapp' ? { delivered: c.delivered || 0, read: c.read || 0, undelivered: c.undelivered || 0 } : null,
    reasons: c.channel === 'whatsapp' ? (c.errorSample || []) : [],
    note: c.status === 'sending' ? 'sending…' : c.status === 'stopped' ? 'stopped' : c.remaining ? `${c.remaining} not sent yet` : '',
    by: c.sentBy?.name,
  }
  : {
    id: c._id,
    createdAt: c.createdAt,
    channel: 'push',
    audience: c.audience === 'city' ? c.city : AUDIENCE_LABELS.all,
    what: c.title,
    sent: c.sent,
    total: c.devices,
    failed: c.failed,
    skipped: 0,
    delivery: null,
    reasons: [],
    note: '',
    by: c.sentBy?.name,
  });

/** Everything sent from Campaigns, newest first. */
const CampaignHistory = () => {
  const { data: campaigns = [], isLoading: l1 } = useQuery({ queryKey: ['campaigns'], queryFn: campaignAPI.getAll });
  const { data: pushes = [], isLoading: l2 } = useQuery({ queryKey: ['push-campaigns'], queryFn: pushCampaignAPI.getAll });
  const rows = [...campaigns, ...pushes].map(toRow).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (l1 || l2) return <p className="text-sm text-gray-500">Loading…</p>;
  if (!rows.length) return <p className="text-sm text-gray-500">Nothing sent yet.</p>;

  return (
    <ul className="bg-white rounded-lg border border-gray-200 divide-y">
      {rows.map((r) => (
        <li key={`${r.channel}-${r.id}`} className="p-3 text-sm flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${CHANNEL_STYLES[r.channel]}`}>{r.channel}</span>
              <span className="font-medium text-gray-900 break-words">{r.what}</span>
            </div>
            <p className="text-xs text-gray-500 break-words">
              {formatDate(r.createdAt)} · {r.audience}{r.by ? ` · by ${r.by}` : ''}
            </p>
            {r.reasons.length > 0 && (
              <ul className="text-xs text-red-600 list-disc pl-4">
                {r.reasons.map((x) => <li key={x} className="break-words">{x}</li>)}
              </ul>
            )}
          </div>
          <div className="text-left sm:text-right shrink-0">
            <p className="font-medium text-gray-900">{r.sent}/{r.total} sent</p>
            <p className="text-xs text-gray-500">
              {[r.failed > 0 && <span key="f" className="text-red-600">{r.failed} failed</span>,
                r.skipped > 0 && `${r.skipped} skipped`,
                r.note].filter(Boolean).reduce((acc, x, i) => (i ? [...acc, ' · ', x] : [x]), [])}
            </p>
            {r.delivery && (
              <p className="text-xs text-gray-600">
                {r.delivery.delivered} delivered · {r.delivery.read} read
                {r.delivery.undelivered > 0 && <span className="text-red-600"> · {r.delivery.undelivered} not delivered</span>}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
};

export default CampaignHistory;
