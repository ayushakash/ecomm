import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { professionalAPI } from '../../services/api';

/** Delivery areas offered as one-tap chips; any other area can be typed. */
export const COMMON_AREAS = ['Kadru', 'Harmu', 'Ashok Nagar', 'Doranda'];

export const EMPTY_PROFESSIONAL = {
  kind: 'individual',
  name: '',
  phone: '',
  whatsapp: '',
  trades: [],
  areas: [],
  experienceYears: '',
  team: [],
  rateNote: '',
  photoUrl: '',
  sitePhotos: [],
  notes: '',
  verified: false,
  consentGiven: false,
  isActive: true,
};

const MAX_SITE_PHOTOS = 6;
const inputCls = 'mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm';
// Inline row controls (team rows): no block/w-full so flex widths apply.
const rowInputCls = 'border border-gray-300 rounded-md p-2 text-sm';
const labelCls = 'text-sm font-medium text-gray-700';

/** Add / edit a mason, painter… (individual) or a contractor with a team. */
const ProfessionalForm = ({ initial, trades, saving, onSave, onClose }) => {
  const [form, setForm] = useState({ ...EMPTY_PROFESSIONAL, ...initial });
  const [areaInput, setAreaInput] = useState('');
  const [uploading, setUploading] = useState(false);

  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  const isContractor = form.kind === 'contractor';
  const teamTotal = form.team.reduce((sum, m) => sum + (Number(m.count) || 0), 0);

  const toggleTrade = (value) =>
    set('trades', form.trades.includes(value) ? form.trades.filter((t) => t !== value) : [...form.trades, value]);

  const addArea = (raw) => {
    const names = raw.split(',').map((a) => a.trim()).filter(Boolean);
    const next = [...form.areas];
    names.forEach((n) => {
      if (!next.some((a) => a.toLowerCase() === n.toLowerCase())) next.push(n);
    });
    set('areas', next);
    setAreaInput('');
  };

  const setTeamRow = (i, key, value) => set('team', form.team.map((m, idx) => (idx === i ? { ...m, [key]: value } : m)));

  const upload = async (files, onUrl) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of files) onUrl(await professionalAPI.uploadImage(file));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Photo upload failed');
    } finally {
      setUploading(false);
    }
  };

  const addSitePhotos = (fileList) => {
    const room = MAX_SITE_PHOTOS - form.sitePhotos.length;
    const files = Array.from(fileList || []).slice(0, room);
    upload(files, (url) => setForm((f) => ({ ...f, sitePhotos: [...f.sitePhotos, url] })));
  };

  const submit = (e) => {
    e.preventDefault();
    // Checkbox groups and chip lists can't use the browser's `required`, so check them here.
    if (!form.trades.length) return toast.error('Select at least one trade');
    if (!form.areas.length) return toast.error('Add at least one area');
    if (!form.consentGiven) return toast.error('Consent to list this professional is required');
    onSave({
      ...form,
      experienceYears: Number(form.experienceYears),
      team: isContractor ? form.team.filter((m) => m.trade && Number(m.count) > 0).map((m) => ({ trade: m.trade, count: Number(m.count) })) : [],
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto p-4">
      <form onSubmit={submit} className="bg-white rounded-xl w-full max-w-2xl p-5 space-y-5 my-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{initial?._id ? 'Edit professional' : 'Register professional'}</h2>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100" aria-label="Close">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Type */}
        <div className="flex gap-2">
          {[['individual', 'Individual worker'], ['contractor', 'Contractor (with team)']].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => set('kind', value)}
              className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium ${form.kind === value ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-700'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Mandatory details */}
        <div className="grid sm:grid-cols-2 gap-3">
          <label className={labelCls}>
            Name *
            <input className={inputCls} required minLength={2} maxLength={80} value={form.name} onChange={(e) => set('name', e.target.value)} />
          </label>
          <label className={labelCls}>
            Phone *
            <input className={inputCls} required inputMode="numeric" pattern="[6-9][0-9]{9}" title="10-digit mobile number" maxLength={10}
              value={form.phone} onChange={(e) => set('phone', e.target.value.replace(/\D/g, ''))} />
          </label>
          <label className={labelCls}>
            Experience (years) *
            <input type="number" min={0} max={60} required className={inputCls} value={form.experienceYears}
              onChange={(e) => set('experienceYears', e.target.value)} />
          </label>
          <label className={labelCls}>
            WhatsApp (if different)
            <input className={inputCls} inputMode="numeric" pattern="[6-9][0-9]{9}" title="10-digit mobile number" maxLength={10}
              value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value.replace(/\D/g, ''))} />
          </label>
        </div>

        <fieldset>
          <legend className={labelCls}>Trades * {isContractor && <span className="font-normal text-gray-500">(work the team can do)</span>}</legend>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {trades.map((t) => (
              <label key={t.value} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.trades.includes(t.value)} onChange={() => toggleTrade(t.value)} />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <span className={labelCls}>Areas served *</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {form.areas.map((a) => (
              <span key={a} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-medium">
                {a}
                <button type="button" onClick={() => set('areas', form.areas.filter((x) => x !== a))} aria-label={`Remove ${a}`}>
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            ))}
            {COMMON_AREAS.filter((a) => !form.areas.includes(a)).map((a) => (
              <button key={a} type="button" onClick={() => addArea(a)} className="px-2 py-1 rounded-full border border-dashed border-gray-300 text-xs text-gray-600 hover:bg-gray-50">
                + {a}
              </button>
            ))}
          </div>
          <input
            className={inputCls}
            placeholder="Other area — type and press Enter (comma for several)"
            value={areaInput}
            onChange={(e) => setAreaInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addArea(areaInput);
              }
            }}
            onBlur={() => areaInput.trim() && addArea(areaInput)}
          />
        </div>

        {/* Contractor team strength */}
        {isContractor && (
          <div className="rounded-lg border border-gray-200 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className={labelCls}>Team strength</span>
              <span className="text-sm font-semibold text-gray-900">Total: {teamTotal} people</span>
            </div>
            {form.team.map((m, i) => (
              <div key={i} className="flex gap-2 items-center">
                <select className={`${rowInputCls} flex-1 min-w-0`} value={m.trade} onChange={(e) => setTeamRow(i, 'trade', e.target.value)}>
                  <option value="">Trade…</option>
                  {trades.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <input type="number" min={1} max={500} className={`${rowInputCls} w-24 shrink-0`} placeholder="Count" value={m.count}
                  onChange={(e) => setTeamRow(i, 'count', e.target.value)} />
                <button type="button" onClick={() => set('team', form.team.filter((_, idx) => idx !== i))} className="p-2 rounded hover:bg-red-50" aria-label="Remove row">
                  <TrashIcon className="w-4 h-4 text-red-600" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => set('team', [...form.team, { trade: '', count: '' }])}
              className="inline-flex items-center gap-1 text-sm text-primary-700 font-medium">
              <PlusIcon className="w-4 h-4" /> Add trade to team
            </button>
          </div>
        )}

        {/* Optional */}
        <div className="grid sm:grid-cols-2 gap-3">
          <label className={labelCls}>
            Rate (optional)
            <input className={inputCls} maxLength={60} placeholder="₹700/day or ₹25/sq ft" value={form.rateNote} onChange={(e) => set('rateNote', e.target.value)} />
          </label>
          <label className={labelCls}>
            Profile photo (optional)
            <input type="file" accept="image/*" capture="user" className="mt-1 block w-full text-sm" disabled={uploading}
              onChange={(e) => upload([e.target.files?.[0]].filter(Boolean), (url) => set('photoUrl', url))} />
          </label>
        </div>
        {form.photoUrl && (
          <div className="flex items-center gap-3">
            <img src={form.photoUrl} alt="Profile" className="w-16 h-16 rounded-full object-cover" />
            <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => set('photoUrl', '')}>Remove photo</button>
          </div>
        )}

        <div>
          <label className={labelCls}>
            Site / work photos (optional, up to {MAX_SITE_PHOTOS})
            <input type="file" accept="image/*" multiple className="mt-1 block w-full text-sm"
              disabled={uploading || form.sitePhotos.length >= MAX_SITE_PHOTOS} onChange={(e) => addSitePhotos(e.target.files)} />
          </label>
          {form.sitePhotos.length > 0 && (
            <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-2">
              {form.sitePhotos.map((url) => (
                <div key={url} className="relative">
                  <img src={url} alt="Site work" className="w-full aspect-square object-cover rounded" />
                  <button type="button" onClick={() => set('sitePhotos', form.sitePhotos.filter((u) => u !== url))}
                    className="absolute top-1 right-1 bg-white/90 rounded-full p-0.5" aria-label="Remove photo">
                    <XMarkIcon className="w-3 h-3 text-red-600" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {uploading && <p className="text-xs text-gray-500 mt-1">Uploading…</p>}
        </div>

        <label className={`block ${labelCls}`}>
          Notes (admin only)
          <textarea className={inputCls} rows={2} maxLength={500} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </label>

        <div className="space-y-2 rounded-lg bg-gray-50 p-3">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5" checked={form.consentGiven} onChange={(e) => set('consentGiven', e.target.checked)} />
            <span><strong>Consent taken *</strong> — the professional agreed to have their name, phone and photos shown to Chardeevari customers.</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.verified} onChange={(e) => set('verified', e.target.checked)} />
            Verified by Chardeevari (we know their work)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
            Active (uncheck to hide without deleting)
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300">Cancel</button>
          <button type="submit" disabled={saving || uploading} className="px-4 py-2 text-sm rounded-lg bg-primary-600 text-white disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfessionalForm;
