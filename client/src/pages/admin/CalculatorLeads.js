import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { TrashIcon, ArrowDownTrayIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const fetchLeads = async ({ page, search, city }) => {
  const params = new URLSearchParams({ page, limit: 50 });
  if (search) params.set('search', search);
  if (city) params.set('city', city);
  const res = await api.get(`/api/calculator-leads?${params}`);
  return res.data;
};

const CalculatorLeads = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['calculator-leads', page, search, cityFilter],
    queryFn: () => fetchLeads({ page, search, city: cityFilter }),
    keepPreviousData: true,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/calculator-leads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['calculator-leads']);
      toast.success('Lead deleted');
    },
    onError: () => toast.error('Failed to delete lead'),
  });

  const handleDownload = () => {
    const params = new URLSearchParams();
    if (cityFilter) params.set('city', cityFilter);
    const token = localStorage.getItem('accessToken');
    // Build URL and trigger download
    const url = `/api/calculator-leads/download?${params}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `calculator_leads_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => toast.error('Download failed'));
  };

  const leads = data?.leads || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Calculator Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total leads captured from PDF downloads</p>
        </div>
        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          Download CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name or phone..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <input
          type="text"
          placeholder="Filter by city..."
          value={cityFilter}
          onChange={e => { setCityFilter(e.target.value); setPage(1); }}
          className="sm:w-44 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Loading...</div>
        ) : leads.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">No leads found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Name', 'Phone', 'City', 'Area (sqft)', 'Floors', 'Est. Cost', 'Mode', 'Date', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map(lead => (
                  <tr key={lead._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{lead.name}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      <a href={`tel:+91${lead.phone}`} className="hover:text-primary-600">+91 {lead.phone}</a>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{lead.city || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{lead.area ? lead.area.toLocaleString() : '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{lead.floors || '—'}</td>
                    <td className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap">
                      {lead.totalCost ? `₹${Math.round(lead.totalCost).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                        lead.priceMode === 'market' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {lead.priceMode || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteMutation.mutate(lead._id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Delete lead"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Page {page} of {pages} — {total} leads</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
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

export default CalculatorLeads;
