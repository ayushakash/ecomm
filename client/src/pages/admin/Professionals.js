import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { PlusIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';
import { professionalAPI } from '../../services/api';
import DataTable from '../../components/commonComponents/dataTable';
import ProfessionalForm from '../../components/admin/ProfessionalForm';
import ProfessionalDetail from '../../components/admin/ProfessionalDetail';

const selectCls = 'border border-gray-300 rounded-md px-3 py-2 text-sm bg-white';

const Professionals = () => {
  const queryClient = useQueryClient();
  const [globalFilter, setGlobalFilter] = useState('');
  const [filters, setFilters] = useState({ kind: '', trade: '', area: '', status: 'active' });
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null); // null | professional (or {} for new)

  const { data: list = [], isLoading, error } = useQuery({ queryKey: ['admin-professionals'], queryFn: professionalAPI.getAll });
  const { data: meta } = useQuery({ queryKey: ['professional-meta'], queryFn: professionalAPI.meta, staleTime: Infinity });
  const trades = useMemo(() => meta?.trades ?? [], [meta]);

  const tradeLabel = useMemo(() => {
    const map = Object.fromEntries(trades.map((t) => [t.value, t.label]));
    return (value) => map[value] ?? value;
  }, [trades]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-professionals'] });

  const saveMutation = useMutation({
    mutationFn: ({ _id, ...data }) => (_id ? professionalAPI.update(_id, data) : professionalAPI.create(data)),
    onSuccess: (saved, { _id }) => {
      invalidate();
      setEditing(null);
      setSelectedId(saved._id);
      toast.success(_id ? 'Professional updated' : 'Professional registered');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to save'),
  });

  const toggleMutation = useMutation({
    mutationFn: (p) => professionalAPI.update(p._id, { isActive: !p.isActive }),
    onSuccess: invalidate,
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => professionalAPI.remove(id),
    onSuccess: () => {
      invalidate();
      setSelectedId(null);
      toast.success('Professional deleted');
    },
    onError: () => toast.error('Failed to delete'),
  });

  const areaOptions = useMemo(() => [...new Set(list.flatMap((p) => p.areas))].sort(), [list]);

  const filtered = useMemo(
    () =>
      list.filter(
        (p) =>
          (!filters.kind || p.kind === filters.kind) &&
          (!filters.trade || p.trades.includes(filters.trade)) &&
          (!filters.area || p.areas.includes(filters.area)) &&
          (filters.status === 'all' || (filters.status === 'active') === p.isActive)
      ),
    [list, filters]
  );

  const stats = useMemo(() => {
    const active = list.filter((p) => p.isActive);
    return {
      total: active.length,
      contractors: active.filter((p) => p.kind === 'contractor').length,
      teamStrength: active.reduce((sum, p) => sum + p.teamTotal + 1, 0), // +1: the contractor/worker themself
      verified: active.filter((p) => p.verified).length,
    };
  }, [list]);

  const columns = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row }) => (
          <span className="font-medium text-gray-900 inline-flex items-center gap-1">
            {row.original.name}
            {row.original.verified && <CheckBadgeIcon className="w-4 h-4 text-green-600" title="Verified" />}
          </span>
        ),
      },
      {
        header: 'Type',
        id: 'kind',
        accessorFn: (p) => (p.kind === 'contractor' ? 'Contractor' : 'Individual'),
      },
      { header: 'Trades', id: 'trades', accessorFn: (p) => p.trades.map(tradeLabel).join(', ') },
      { header: 'Areas', id: 'areas', accessorFn: (p) => p.areas.join(', ') },
      { header: 'Exp.', id: 'exp', accessorFn: (p) => `${p.experienceYears} yrs` },
      { header: 'Team', id: 'team', accessorFn: (p) => (p.kind === 'contractor' ? p.teamTotal : '-') },
      { header: 'Phone', accessorKey: 'phone' },
      {
        header: 'Status',
        id: 'status',
        accessorFn: (p) => (p.isActive ? 'Active' : 'Hidden'),
        cell: (info) => (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${info.getValue() === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
            {info.getValue()}
          </span>
        ),
      },
    ],
    [tradeLabel]
  );

  const selected = list.find((p) => p._id === selectedId);
  const setFilter = (name) => (e) => setFilters((f) => ({ ...f, [name]: e.target.value }));

  if (error) {
    return <p className="p-6 text-red-600">Error loading professionals: {error.message}</p>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Professionals</h1>
            <p className="text-gray-600">Masons, painters, plumbers and contractors registered by Chardeevari</p>
          </div>
          <button onClick={() => setEditing({})}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
            <PlusIcon className="w-4 h-4" /> Register professional
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['Active professionals', stats.total],
            ['Contractors', stats.contractors],
            ['Total team strength', stats.teamStrength],
            ['Verified', stats.verified],
          ].map(([label, value]) => (
            <div key={label} className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <select className={selectCls} value={filters.kind} onChange={setFilter('kind')} aria-label="Type">
            <option value="">All types</option>
            <option value="individual">Individuals</option>
            <option value="contractor">Contractors</option>
          </select>
          <select className={selectCls} value={filters.trade} onChange={setFilter('trade')} aria-label="Trade">
            <option value="">All trades</option>
            {trades.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select className={selectCls} value={filters.area} onChange={setFilter('area')} aria-label="Area">
            <option value="">All areas</option>
            {areaOptions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select className={selectCls} value={filters.status} onChange={setFilter('status')} aria-label="Status">
            <option value="active">Active</option>
            <option value="hidden">Hidden</option>
            <option value="all">All</option>
          </select>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <DataTable
            title={`Registered (${filtered.length})`}
            columns={columns}
            data={filtered}
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
            onRowClick={(p) => setSelectedId(p._id)}
            renderCard={(p) => (
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900 inline-flex items-center gap-1">
                    {p.name}
                    {p.verified && <CheckBadgeIcon className="w-4 h-4 text-green-600" />}
                  </span>
                  <span className="text-xs text-gray-500">{p.kind === 'contractor' ? `Contractor · ${p.teamTotal}` : 'Individual'}</span>
                </div>
                <p className="text-sm text-gray-700">{p.trades.map(tradeLabel).join(', ')}</p>
                <p className="text-xs text-gray-500">{p.areas.join(', ')} · {p.experienceYears} yrs · {p.phone}</p>
              </div>
            )}
          />
        )}
      </div>

      {selected && !editing && (
        <ProfessionalDetail
          professional={selected}
          tradeLabel={tradeLabel}
          onClose={() => setSelectedId(null)}
          onEdit={() => setEditing(selected)}
          onToggleActive={() => toggleMutation.mutate(selected)}
          onDelete={() => window.confirm(`Delete ${selected.name}? This cannot be undone.`) && deleteMutation.mutate(selected._id)}
        />
      )}

      {editing && (
        <ProfessionalForm
          initial={editing}
          trades={trades}
          saving={saveMutation.isPending}
          onClose={() => setEditing(null)}
          onSave={(form) => saveMutation.mutate({ ...form, _id: editing._id })}
        />
      )}
    </div>
  );
};

export default Professionals;
