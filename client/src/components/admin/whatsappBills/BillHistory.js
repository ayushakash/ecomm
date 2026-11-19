import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { whatsappBillAPI } from '../../../services/api';
import DataTable from '../../commonComponents/dataTable';
import BillStatusBadge from './BillStatusBadge';

const rupees = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const when = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-');
// After MSG91 accepts a bill, WhatsApp's delivery report (delivered / read / failed) is the real outcome.
const shownStatus = (r) => (r.status === 'sent' && r.delivery && r.delivery !== 'sent'
  ? (r.delivery === 'failed' ? 'undelivered' : r.delivery)
  : r.status);
const problem = (r) => r.error || r.deliveryError || '';

/** Every bill ever sent (or attempted) on WhatsApp — the "never twice" record. */
const BillHistory = () => {
  const [status, setStatus] = useState('');
  const [globalFilter, setGlobalFilter] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['wa-bill-history', status],
    queryFn: () => whatsappBillAPI.history({ status: status || undefined, limit: 500 }),
  });

  const columns = useMemo(() => [
    { header: 'Bill', id: 'bill', accessorFn: (r) => `${r.billNo} · ${r.billDate}` },
    { header: 'Customer', id: 'customer', accessorFn: (r) => `${r.partyName || '-'} ${r.phone}` },
    { header: 'Amount', id: 'amount', accessorFn: (r) => r.total, cell: ({ row }) => (
      <span>{rupees(row.original.total)}{row.original.balance > 0 && <span className="ml-1 text-xs text-amber-700">(due {rupees(row.original.balance)})</span>}</span>
    ) },
    { header: 'Status', id: 'status', accessorFn: shownStatus, cell: (info) => <BillStatusBadge status={info.getValue()} /> },
    { header: 'Sent', id: 'sent', accessorFn: (r) => when(r.sentAt || r.updatedAt) },
    { header: 'Problem', id: 'error', accessorFn: problem },
  ], []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <select className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="sending">Sending</option>
        </select>
        {data && <span className="text-sm text-gray-500">{data.total} total{data.total > 500 ? ' (latest 500 shown)' : ''}</span>}
      </div>
      {isLoading ? <p className="text-sm text-gray-500">Loading…</p> : (
        <DataTable
          title="Sent bills"
          columns={columns}
          data={data?.items ?? []}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          renderCard={(r) => (
            <div className="bg-white rounded-xl border border-gray-200 p-3">
              <div className="flex justify-between gap-2">
                <span className="font-semibold">Bill {r.billNo}</span>
                <BillStatusBadge status={shownStatus(r)} />
              </div>
              <p className="text-xs text-gray-500">{r.billDate} · {r.partyName || '-'} · {r.phone}</p>
              <p className="text-sm">{rupees(r.total)}{r.balance > 0 && <span className="ml-2 text-amber-700">Due {rupees(r.balance)}</span>}</p>
              <p className="text-xs text-gray-400">{when(r.sentAt || r.updatedAt)}</p>
              {problem(r) && <p className="text-xs text-red-600 mt-1">{problem(r)}</p>}
            </div>
          )}
        />
      )}
    </div>
  );
};

export default BillHistory;
