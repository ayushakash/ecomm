import React, { useEffect, useRef, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { ArrowUpTrayIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { shopContactAPI } from '../../../services/api';
import { primaryBtn, errorMessage, formatDate } from './constants';

const STATUSES = [
  ['', 'All'],
  ['pending', 'Pending'],
  ['sent', 'Welcomed'],
  ['failed', 'Failed'],
  ['opted_out', 'Opted out'],
];
const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-800',
  sent: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  opted_out: 'bg-gray-200 text-gray-700',
};
const statusLabel = (s) => STATUSES.find(([k]) => k === s)?.[1] || s;

/** Walk-in shop customers imported from Khatabook, and their one-time WhatsApp welcome status. */
const ShopCustomers = ({ onSendWelcome }) => {
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['shop-contacts', status, query, page],
    queryFn: () => shopContactAPI.list({ status: status || undefined, search: query || undefined, page }),
    placeholderData: keepPreviousData,
  });
  const counts = data?.counts || {};
  const all = Object.values(counts).reduce((a, b) => a + b, 0);
  const waiting = (counts.pending || 0) + (counts.failed || 0);

  const upload = useMutation({
    mutationFn: shopContactAPI.import,
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ['shop-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-audience'] });
      toast.success(`${r.added} added · ${r.alreadyThere} already there${r.invalid ? ` · ${r.invalid} without a valid number` : ''}`);
    },
    onError: (err) => toast.error(errorMessage(err, 'Import failed')),
    onSettled: () => { if (fileRef.current) fileRef.current.value = ''; },
  });
  const optOut = useMutation({
    mutationFn: shopContactAPI.optOut,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-audience'] });
      toast.success('Opted out — this number will not get WhatsApp messages');
    },
    onError: (err) => toast.error(errorMessage(err, 'Could not update')),
  });

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <p className="text-sm text-gray-600">
          Export your customer list from <strong>Khatabook</strong> as Excel (.xlsx) or CSV and upload it. Numbers already in the list are not added again.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden"
            onChange={(e) => e.target.files?.[0] && upload.mutate(e.target.files[0])} />
          <button type="button" className={primaryBtn} disabled={upload.isPending} onClick={() => fileRef.current?.click()}>
            <ArrowUpTrayIcon className="w-4 h-4" /> {upload.isPending ? 'Importing…' : 'Upload Khatabook export'}
          </button>
          <button type="button" disabled={!waiting} onClick={onSendWelcome}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-primary-600 text-primary-700 text-sm font-medium disabled:opacity-50">
            <PaperAirplaneIcon className="w-4 h-4" /> Send welcome to pending ({waiting})
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUSES.map(([key, label]) => (
          <button key={key || 'all'} type="button" onClick={() => { setStatus(key); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap border ${status === key ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`}>
            {label} <span className="opacity-75">{key ? counts[key] || 0 : all}</span>
          </button>
        ))}
      </div>

      <input className="block w-full border border-gray-300 rounded-md p-2 text-sm" placeholder="Search name or number"
        value={search} onChange={(e) => setSearch(e.target.value)} />

      {isLoading ? <p className="text-sm text-gray-500">Loading…</p> : !data?.contacts?.length ? (
        <p className="text-sm text-gray-500">No customers here.</p>
      ) : (
        <ul className="bg-white rounded-lg border border-gray-200 divide-y">
          {data.contacts.map((c) => (
            <li key={c._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 break-words">{c.name || '—'} <span className="text-gray-500 font-normal">{c.phone}</span></p>
                <p className="text-xs text-gray-500">
                  <span className={`inline-block px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[c.welcomeStatus] || ''}`}>{statusLabel(c.welcomeStatus)}</span>
                  {c.welcomeSentAt && <span className="ml-2">{formatDate(c.welcomeSentAt)}</span>}
                  {c.welcomeError && <span className="ml-2 text-red-600 break-words">{c.welcomeError}</span>}
                </p>
              </div>
              {c.welcomeStatus !== 'opted_out' && (
                <button type="button" className="self-start sm:self-auto text-xs text-gray-600 underline" disabled={optOut.isPending}
                  onClick={() => window.confirm(`Never send WhatsApp messages to ${c.phone}?`) && optOut.mutate(c._id)}>
                  Opt out
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {data?.pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button type="button" className="px-3 py-1.5 rounded border border-gray-300 disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span className="text-gray-600">Page {page} of {data.pages} · {data.total} customers</span>
          <button type="button" className="px-3 py-1.5 rounded border border-gray-300 disabled:opacity-50" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
};

export default ShopCustomers;
