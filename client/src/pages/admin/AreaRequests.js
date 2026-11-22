import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { TrashIcon, ArrowDownTrayIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { areaRequestAPI } from '../../services/api';

const ITEM_LABELS = { cement: 'Cement', sariya: 'Sariya', balu: 'Sand', eent: 'Bricks', gitti: 'Gitti', other: 'Other' };

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const AreaRequests = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setCity(cityInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, cityInput]);

  const { data, isLoading } = useQuery({
    queryKey: ['area-requests', page, search, city],
    queryFn: () => areaRequestAPI.list({ page, limit: 50, search: search || undefined, city: city || undefined }),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => areaRequestAPI.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['area-requests'] });
      toast.success('Request deleted');
    },
    onError: () => toast.error('Failed to delete request'),
  });

  const handleDelete = (id) => {
    if (window.confirm('Delete this area request?')) deleteMutation.mutate(id);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await areaRequestAPI.export({ search: search || undefined, city: city || undefined });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `area_requests_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const requests = data?.requests || [];
  const byArea = data?.byArea || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  const itemsText = (items) => (items?.length ? items.map((i) => ITEM_LABELS[i] || i).join(', ') : '—');

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Area Requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} requests from areas without a serving merchant</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          {exporting ? 'Exporting...' : 'Export Excel/CSV'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, phone, area, pincode..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <input
          type="text"
          placeholder="Filter by city..."
          value={cityInput}
          onChange={(e) => setCityInput(e.target.value)}
          className="sm:w-44 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Demand by area */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Demand by area</h2>
        </div>
        {isLoading ? (
          <div className="py-10 text-center text-gray-400 text-sm">Loading...</div>
        ) : byArea.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">No demand yet</div>
        ) : (
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {['City', 'Area', 'Requests', 'Latest'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {byArea.map((row) => (
                  <tr key={`${row.city}|${row.area}`} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-900 whitespace-nowrap">{row.city || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-700">{row.area || '—'}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">{row.count}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{formatDate(row.latest)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Requests */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">No requests found</div>
        ) : (
          <>
            {/* Mobile cards */}
            <ul className="sm:hidden divide-y divide-gray-100">
              {requests.map((r) => (
                <li key={r._id} className="p-4 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{r.name || '—'}</p>
                      {r.phone && (
                        <a href={`tel:+91${r.phone}`} className="text-sm text-primary-600">+91 {r.phone}</a>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(r._id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Delete request"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-700">{[r.area, r.city, r.pincode].filter(Boolean).join(', ')}</p>
                  <p className="text-xs text-gray-500">{itemsText(r.items)}</p>
                  {r.note && <p className="text-xs text-gray-600 italic">{r.note}</p>}
                  <p className="text-xs text-gray-400">
                    {formatDate(r.updatedAt || r.createdAt)} · {r.source}{r.count > 1 ? ` · ${r.count}×` : ''}
                  </p>
                </li>
              ))}
            </ul>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Date', 'Name', 'Phone', 'Area', 'City', 'Items', 'Source', 'Note', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requests.map((r) => (
                    <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {formatDate(r.updatedAt || r.createdAt)}
                        {r.count > 1 && <span className="ml-1 text-xs text-orange-600">({r.count}×)</span>}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{r.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {r.phone ? <a href={`tel:+91${r.phone}`} className="hover:text-primary-600">+91 {r.phone}</a> : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {r.area || '—'}
                        {r.pincode && <span className="block text-xs text-gray-400">{r.pincode}</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.city || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{itemsText(r.items)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          r.source === 'app' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {r.source || 'web'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={r.note || ''}>{r.note || '—'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(r._id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Delete request"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Page {page} of {pages} — {total} requests</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AreaRequests;
