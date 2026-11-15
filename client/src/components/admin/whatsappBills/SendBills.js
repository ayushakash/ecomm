import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { ArrowUpTrayIcon, ArrowDownTrayIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { whatsappBillAPI } from '../../../services/api';
import DataTable from '../../commonComponents/dataTable';
import BillStatusBadge from './BillStatusBadge';

const SENDABLE = ['new', 'retry'];
const rupees = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

const FILTERS = [
  ['sendable', 'Ready to send'],
  ['all', 'All bills'],
  ['due', 'Balance due'],
  ['paid', 'Fully paid'],
  ['skipped', 'Skipped'],
];

/** Unique customers (name + phone) from the uploaded report, as a JSON download. */
function downloadContacts(rows) {
  const byPhone = new Map();
  rows.filter((r) => r.phone).forEach((r) => {
    const c = byPhone.get(r.phone) || { name: r.partyName, phone: r.phone, bills: 0, totalSpend: 0, lastBillDate: r.billDate };
    c.bills += 1;
    c.totalSpend += r.total;
    if (r.billDate > c.lastBillDate) { c.lastBillDate = r.billDate; c.name = r.partyName || c.name; }
    byPhone.set(r.phone, c);
  });
  const blob = new Blob([JSON.stringify([...byPhone.values()], null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `customers-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

const SendBills = ({ onOpenSettings }) => {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [filter, setFilter] = useState('sendable');
  const [globalFilter, setGlobalFilter] = useState('');
  const [batch, setBatch] = useState(null); // { id, total, sent, failed, sending }

  const previewMutation = useMutation({
    mutationFn: whatsappBillAPI.preview,
    onSuccess: (res) => {
      setData(res);
      setSelected(new Set(res.rows.filter((r) => SENDABLE.includes(r.status)).map((r) => r.key)));
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not read the report'),
  });

  const sendMutation = useMutation({
    mutationFn: (bills) => whatsappBillAPI.send(bills),
    onSuccess: (res) => {
      if (!res.queued) {
        toast('Nothing new to send — those bills were already sent.');
        previewMutation.mutate(file);
        return;
      }
      setBatch({ id: res.batchId, total: res.queued, sent: 0, failed: 0, sending: res.queued });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not start sending'),
  });

  // Poll progress while a batch is running; refresh the list when it finishes.
  useEffect(() => {
    if (!batch?.id || batch.sending === 0) return undefined;
    const timer = setInterval(async () => {
      try {
        const p = await whatsappBillAPI.batch(batch.id);
        setBatch((b) => ({ ...b, ...p }));
        if (p.sending === 0) {
          clearInterval(timer);
          toast[p.failed ? 'error' : 'success'](`Done: ${p.sent} sent${p.failed ? `, ${p.failed} failed` : ''}`);
          queryClient.invalidateQueries({ queryKey: ['wa-bill-history'] });
          previewMutation.mutate(file);
        }
      } catch {
        /* keep polling */
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [batch?.id, batch?.sending]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => {
    const all = data?.rows ?? [];
    switch (filter) {
      case 'sendable': return all.filter((r) => SENDABLE.includes(r.status));
      case 'due': return all.filter((r) => r.template === 'due' && r.phone);
      case 'paid': return all.filter((r) => r.template === 'paid' && r.phone);
      case 'skipped': return all.filter((r) => !SENDABLE.includes(r.status));
      default: return all;
    }
  }, [data, filter]);

  const selectable = rows.filter((r) => SENDABLE.includes(r.status));
  const toggle = (r) => {
    if (!SENDABLE.includes(r.status)) return;
    setSelected((s) => {
      const next = new Set(s);
      next.has(r.key) ? next.delete(r.key) : next.add(r.key);
      return next;
    });
  };
  const selectedRows = (data?.rows ?? []).filter((r) => selected.has(r.key));
  const sending = batch && batch.sending > 0;
  const enabled = data?.settings?.enabled;

  const columns = useMemo(() => [
    {
      id: 'select',
      header: '',
      cell: ({ row }) => (
        <input type="checkbox" className="w-4 h-4" aria-label={`Select bill ${row.original.billNo}`}
          disabled={!SENDABLE.includes(row.original.status)} checked={selected.has(row.original.key)}
          onChange={() => toggle(row.original)} onClick={(e) => e.stopPropagation()} />
      ),
    },
    { header: 'Bill', id: 'bill', accessorFn: (r) => `${r.billNo} · ${r.dateLabel}` },
    { header: 'Customer', id: 'customer', accessorFn: (r) => `${r.partyName || '-'} ${r.phone || ''}`,
      cell: ({ row }) => (
        <div>
          <div className="text-gray-900">{row.original.partyName || '-'}</div>
          <div className="text-xs text-gray-500">{row.original.phone || 'no phone'}</div>
        </div>
      ) },
    { header: 'Amount', id: 'amount', accessorFn: (r) => r.total,
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{rupees(row.original.total)}</div>
          {row.original.balance > 0 && <div className="text-xs text-amber-700">Due {rupees(row.original.balance)}</div>}
        </div>
      ) },
    { header: 'Status', accessorKey: 'status', cell: (info) => <BillStatusBadge status={info.getValue()} /> },
  ], [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const s = data?.summary;

  return (
    <div className="space-y-4 pb-24">
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <p className="text-sm text-gray-600">
          Export the <strong>Sales Report</strong> from your billing app (the .xls file as downloaded) and upload it here.
          Each bill is sent on WhatsApp <strong>only once</strong>, even if you upload overlapping reports.
        </p>
        <label className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-3 rounded-lg bg-primary-600 text-white font-medium cursor-pointer hover:bg-primary-700">
          <ArrowUpTrayIcon className="w-5 h-5" />
          {previewMutation.isPending ? 'Reading…' : file ? `Upload another (${file.name})` : 'Upload sales report'}
          <input type="file" className="hidden" disabled={previewMutation.isPending || sending}
            accept=".xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              setFile(f);
              setBatch(null);
              previewMutation.mutate(f);
            }} />
        </label>
      </div>

      {data && enabled === false && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Sending is <strong>off</strong>. Once MSG91 approves the bill templates, turn it on in{' '}
          <button className="underline font-medium" onClick={onOpenSettings}>Settings</button>. You can still review the list.
        </div>
      )}

      {s && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            ['Ready to send', s.sendable, 'text-blue-700'],
            ['Already sent', s.alreadySent, 'text-green-700'],
            ['No phone / walk-in', s.noPhone, 'text-gray-600'],
            ['Opted out', s.optedOut, 'text-red-700'],
          ].map(([label, value, cls]) => (
            <div key={label} className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-500">{label}</p>
              <p className={`text-xl font-bold ${cls}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {data && (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <select className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Show">
              {FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <button className="px-3 py-2 text-sm rounded-md border border-gray-300 bg-white" disabled={sending}
              onClick={() => setSelected((sel) => new Set([...sel, ...selectable.map((r) => r.key)]))}>Select all</button>
            <button className="px-3 py-2 text-sm rounded-md border border-gray-300 bg-white" disabled={sending}
              onClick={() => setSelected(new Set())}>Clear</button>
            <button className="ml-auto inline-flex items-center gap-1 px-3 py-2 text-sm rounded-md border border-gray-300 bg-white"
              onClick={() => downloadContacts(data.rows)}>
              <ArrowDownTrayIcon className="w-4 h-4" /> Customers (JSON)
            </button>
          </div>

          <DataTable
            title={`${rows.length} bills`}
            columns={columns}
            data={rows}
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
            onRowClick={toggle}
            renderCard={(r) => (
              <div className={`bg-white rounded-xl border p-3 flex gap-3 items-start ${selected.has(r.key) ? 'border-primary-500 ring-1 ring-primary-500' : 'border-gray-200'}`}>
                <input type="checkbox" className="w-5 h-5 mt-0.5" aria-label={`Select bill ${r.billNo}`}
                  disabled={!SENDABLE.includes(r.status)} checked={selected.has(r.key)} readOnly />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold text-gray-900">Bill {r.billNo}</span>
                    <BillStatusBadge status={r.status} />
                  </div>
                  <p className="text-xs text-gray-500">{r.dateLabel} · {r.partyName || '-'} · {r.phone || 'no phone'}</p>
                  <p className="text-sm mt-1">
                    {rupees(r.total)}
                    {r.balance > 0 && <span className="ml-2 text-amber-700 font-medium">Due {rupees(r.balance)}</span>}
                  </p>
                  {r.lastError && <p className="text-xs text-red-600 mt-1">Last error: {r.lastError}</p>}
                </div>
              </div>
            )}
          />
        </>
      )}

      {/* Sticky action bar */}
      {data && (
        <div className="fixed bottom-0 inset-x-0 lg:left-72 bg-white border-t border-gray-200 p-3 z-40">
          {sending ? (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Sending… {batch.sent + batch.failed} / {batch.total}</span>
                {batch.failed > 0 && <span className="text-red-600">{batch.failed} failed</span>}
              </div>
              <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                <div className="h-full bg-green-600 transition-all" style={{ width: `${((batch.sent + batch.failed) / batch.total) * 100}%` }} />
              </div>
              <p className="text-xs text-gray-500 mt-1">You can lock your phone — sending continues on the server.</p>
            </div>
          ) : (
            <button
              disabled={!selectedRows.length || !enabled || sendMutation.isPending}
              onClick={() => window.confirm(`Send ${selectedRows.length} WhatsApp bill${selectedRows.length > 1 ? 's' : ''}?`) && sendMutation.mutate(selectedRows)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-green-600 text-white font-semibold disabled:opacity-40">
              <PaperAirplaneIcon className="w-5 h-5" />
              {enabled ? `Send to ${selectedRows.length} selected` : 'Sending is off (see Settings)'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SendBills;
