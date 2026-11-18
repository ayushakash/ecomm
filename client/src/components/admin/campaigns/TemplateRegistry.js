import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { ArrowPathIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { whatsappTemplateAPI } from '../../../services/api';
import { inputCls, primaryBtn, errorMessage, formatDate } from './constants';

const STATUS_STYLES = {
  approved: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  rejected: 'bg-red-100 text-red-800',
};

const StatusBadge = ({ status }) => (
  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-700'}`}>
    {status || 'unknown'}
  </span>
);

/** Map each {{n}} of one template to the customer's name (with fallback) or fixed text. */
const VariableMapping = ({ template, onSaved }) => {
  const [vars, setVars] = useState(template.variables.map((v) => ({ source: v.source, value: v.value })));
  const setVar = (i, changes) => setVars((list) => list.map((v, j) => (j === i ? { ...v, ...changes } : v)));
  const save = useMutation({
    mutationFn: () => whatsappTemplateAPI.update(template._id, { variables: vars }),
    onSuccess: (t) => { onSaved(t); toast.success('Saved'); },
    onError: (err) => toast.error(errorMessage(err, 'Could not save')),
  });

  if (!template.variableCount) return <p className="text-xs text-gray-500">No blanks to fill.</p>;
  return (
    <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      {vars.map((v, i) => (
        <div key={i} className="grid grid-cols-1 sm:grid-cols-[3rem_12rem_1fr] gap-2 sm:items-center">
          <span className="text-sm font-mono text-gray-700">{`{{${i + 1}}}`}</span>
          <select className="border border-gray-300 rounded-md p-2 text-sm" value={v.source} onChange={(e) => setVar(i, { source: e.target.value })}>
            <option value="name">Customer name</option>
            <option value="static">Fixed text</option>
          </select>
          <input className="border border-gray-300 rounded-md p-2 text-sm" required maxLength={1000} value={v.value}
            placeholder={v.source === 'name' ? 'If no name, use… (e.g. Customer)' : 'Text to put here'}
            onChange={(e) => setVar(i, { value: e.target.value })} />
        </div>
      ))}
      <button type="submit" className={primaryBtn} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save blanks'}</button>
    </form>
  );
};

const TemplateCard = ({ template, onChanged, onRemoved }) => {
  const toggle = useMutation({
    mutationFn: () => whatsappTemplateAPI.update(template._id, { enabled: !template.enabled }),
    onSuccess: onChanged,
    onError: (err) => toast.error(errorMessage(err, 'Could not update')),
  });
  const refresh = useMutation({
    mutationFn: () => whatsappTemplateAPI.refresh(template._id),
    onSuccess: (t) => { onChanged(t); toast.success(`Status: ${t.status || 'unknown'}`); },
    onError: (err) => toast.error(errorMessage(err, 'Could not refresh')),
  });
  const remove = useMutation({
    mutationFn: () => whatsappTemplateAPI.remove(template._id),
    onSuccess: () => { onRemoved(template._id); toast.success('Removed from the list'); },
    onError: (err) => toast.error(errorMessage(err, 'Could not remove')),
  });

  return (
    <li className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 break-words">{template.label}</p>
          <p className="text-xs text-gray-500 break-all">
            {template.name} · {template.language}{template.category ? ` · ${template.category}` : ''}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={template.status} />
            {template.statusCheckedAt && <span className="text-xs text-gray-400">checked {formatDate(template.statusCheckedAt)}</span>}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 shrink-0">
          <input type="checkbox" className="w-5 h-5" checked={template.enabled} disabled={toggle.isPending} onChange={() => toggle.mutate()} />
          Use in campaigns
        </label>
      </div>

      <p className="text-sm text-gray-800 whitespace-pre-wrap break-words bg-gray-50 rounded-md p-3">{template.body || '(no body text)'}</p>
      {template.buttons?.length > 0 && (
        <p className="text-xs text-gray-500">Buttons: {template.buttons.map((b) => b.text).join(' · ')}</p>
      )}

      {/* Re-read the mapping only when MSG91 data is refreshed, so toggling never wipes unsaved edits. */}
      <VariableMapping key={`${template._id}-${template.statusCheckedAt}`} template={template} onSaved={onChanged} />

      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-100">
        <button type="button" disabled={refresh.isPending} onClick={() => refresh.mutate()}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 disabled:opacity-50">
          <ArrowPathIcon className={`w-4 h-4 ${refresh.isPending ? 'animate-spin' : ''}`} /> Refresh status
        </button>
        <button type="button" disabled={remove.isPending}
          onClick={() => window.confirm(`Remove "${template.label}"? This removes it from this list only, not from MSG91.`) && remove.mutate()}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-red-200 text-sm text-red-700 disabled:opacity-50">
          <TrashIcon className="w-4 h-4" /> Remove
        </button>
      </div>
    </li>
  );
};

/** WhatsApp templates available to campaigns: added by name from MSG91, blanks mapped here. */
const TemplateRegistry = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', language: 'en', label: '' });
  const { data: templates = [], isLoading } = useQuery({ queryKey: ['wa-templates'], queryFn: whatsappTemplateAPI.getAll });

  const replace = (t) => queryClient.setQueryData(['wa-templates'], (list = []) => list.map((x) => (x._id === t._id ? t : x)));
  const drop = (id) => queryClient.setQueryData(['wa-templates'], (list = []) => list.filter((x) => x._id !== id));

  const add = useMutation({
    mutationFn: () => whatsappTemplateAPI.add(form),
    onSuccess: (t) => {
      queryClient.setQueryData(['wa-templates'], (list = []) => [t, ...list]);
      setForm({ name: '', language: 'en', label: '' });
      toast.success(t.variableCount ? `Added — now fill its ${t.variableCount} blank(s) below` : 'Added');
    },
    onError: (err) => toast.error(errorMessage(err, 'Could not add template')),
  });

  return (
    <div className="space-y-4">
      <form className="bg-white rounded-lg border border-gray-200 p-4 space-y-3" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
        <p className="text-sm text-gray-600">
          Create and get the template approved in MSG91 first, then add it here by its exact name. Its text, buttons and status are read from MSG91.
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="text-sm font-medium text-gray-700">
            Template name *
            <input className={inputCls} required pattern="[a-z0-9_]+" placeholder="shop_welcome_v1" value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.trim() }))} />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Language *
            <input className={inputCls} required pattern="[a-z]{2}(_[A-Z]{2})?" placeholder="en / hi" value={form.language}
              onChange={(e) => setForm((f) => ({ ...f, language: e.target.value.trim() }))} />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Label (shown in lists)
            <input className={inputCls} maxLength={80} placeholder="Shop welcome (Hindi)" value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
          </label>
        </div>
        <button type="submit" className={primaryBtn} disabled={add.isPending}>
          <PlusIcon className="w-4 h-4" /> {add.isPending ? 'Checking MSG91…' : 'Add template'}
        </button>
      </form>

      {isLoading ? <p className="text-sm text-gray-500">Loading…</p> : templates.length === 0 ? (
        <p className="text-sm text-gray-500">No templates added yet.</p>
      ) : (
        <ul className="space-y-3">
          {templates.map((t) => <TemplateCard key={t._id} template={t} onChanged={replace} onRemoved={drop} />)}
        </ul>
      )}
    </div>
  );
};

export default TemplateRegistry;
