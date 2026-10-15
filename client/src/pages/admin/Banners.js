import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { PencilSquareIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { bannerAPI, productAPI } from '../../services/api';

const CTA_TYPES = [
  { value: 'none', label: 'No button' },
  { value: 'products', label: 'All products' },
  { value: 'category', label: 'Category' },
  { value: 'product', label: 'Product (ID)' },
  { value: 'url', label: 'Web link' },
  { value: 'whatsapp', label: 'WhatsApp bulk chat' },
  { value: 'calculator', label: 'Material calculator' },
];

const EMPTY = {
  badge: '',
  title: '',
  highlight: '',
  body: '',
  imageUrl: '',
  gradientFrom: '#2C3E54',
  gradientTo: '#1E2A3A',
  ctaType: 'none',
  ctaValue: '',
  ctaLabel: '',
  isActive: true,
  sortOrder: 0,
  startsAt: '',
  endsAt: '',
};

// <input type="datetime-local"> works in local time without a zone suffix.
const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const scheduleLabel = (b) => {
  const now = Date.now();
  if (!b.isActive) return { text: 'Hidden', cls: 'bg-gray-100 text-gray-600' };
  if (b.startsAt && new Date(b.startsAt).getTime() > now) return { text: 'Scheduled', cls: 'bg-blue-100 text-blue-700' };
  if (b.endsAt && new Date(b.endsAt).getTime() <= now) return { text: 'Expired', cls: 'bg-red-100 text-red-700' };
  return { text: 'Live', cls: 'bg-green-100 text-green-700' };
};

const inputCls = 'mt-1 block w-full border border-gray-300 rounded-md p-2 text-sm';

const Banners = () => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null); // null | { id?: string, form }
  const [uploading, setUploading] = useState(false);

  const { data: banners = [], isLoading } = useQuery({ queryKey: ['admin-banners'], queryFn: bannerAPI.getAll });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: productAPI.getCategories });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-banners'] });

  const saveMutation = useMutation({
    mutationFn: ({ id, form }) => {
      const payload = {
        ...form,
        sortOrder: Number(form.sortOrder) || 0,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      };
      return id ? bannerAPI.update(id, payload) : bannerAPI.create(payload);
    },
    onSuccess: (_, { id }) => {
      invalidate();
      setEditing(null);
      toast.success(id ? 'Banner updated' : 'Banner added — it is now in the app carousel');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to save banner'),
  });

  const toggleMutation = useMutation({
    mutationFn: (b) => bannerAPI.update(b._id, { isActive: !b.isActive }),
    onSuccess: invalidate,
    onError: () => toast.error('Failed to update banner'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => bannerAPI.remove(id),
    onSuccess: () => {
      invalidate();
      toast.success('Banner deleted');
    },
    onError: () => toast.error('Failed to delete banner'),
  });

  const openNew = () =>
    setEditing({ form: { ...EMPTY, sortOrder: banners.length ? Math.max(...banners.map((b) => b.sortOrder || 0)) + 1 : 0 } });

  const openEdit = (b) =>
    setEditing({
      id: b._id,
      form: {
        ...EMPTY,
        ...Object.fromEntries(Object.entries(b).filter(([, v]) => v !== null && v !== undefined)),
        startsAt: toLocalInput(b.startsAt),
        endsAt: toLocalInput(b.endsAt),
      },
    });

  const setField = (name, value) => setEditing((e) => ({ ...e, form: { ...e.form, [name]: value } }));

  const handleImage = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      setField('imageUrl', await bannerAPI.uploadImage(file));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const form = editing?.form;
  const needsValue = form && ['category', 'product', 'url'].includes(form.ctaType);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">App Banners</h1>
          <p className="text-sm text-gray-500">
            Offers shown in the mobile app home carousel, before the built-in slides. Live banners appear in the app within a few minutes.
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
        >
          <PlusIcon className="w-4 h-4" /> Add banner
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : banners.length === 0 ? (
        <div className="bg-white rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          No banners yet. Add one to start showing offers in the app.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {banners.map((b) => {
            const status = scheduleLabel(b);
            return (
              <div key={b._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <BannerPreview banner={b} />
                <div className="p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${status.cls}`}>{status.text}</span>
                    <span className="text-gray-500">Order {b.sortOrder}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleMutation.mutate(b)}
                      className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50"
                    >
                      {b.isActive ? 'Hide' : 'Show'}
                    </button>
                    <button onClick={() => openEdit(b)} className="p-1.5 rounded hover:bg-gray-100" title="Edit">
                      <PencilSquareIcon className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => window.confirm('Delete this banner?') && deleteMutation.mutate(b._id)}
                      className="p-1.5 rounded hover:bg-red-50"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate(editing);
            }}
            className="bg-white rounded-xl w-full max-w-2xl p-5 space-y-4 my-8"
          >
            <h2 className="text-lg font-semibold">{editing.id ? 'Edit banner' : 'New banner'}</h2>

            <BannerPreview banner={form} />

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-sm font-medium text-gray-700">
                Badge
                <input className={inputCls} value={form.badge} maxLength={60} placeholder="DIWALI OFFER"
                  onChange={(e) => setField('badge', e.target.value)} />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Title *
                <input className={inputCls} value={form.title} maxLength={80} required placeholder="Flat ₹20 off on every bag of"
                  onChange={(e) => setField('title', e.target.value)} />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Highlight (orange text after title)
                <input className={inputCls} value={form.highlight} maxLength={40} placeholder="cement"
                  onChange={(e) => setField('highlight', e.target.value)} />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Order (lower shows first)
                <input type="number" className={inputCls} value={form.sortOrder}
                  onChange={(e) => setField('sortOrder', e.target.value)} />
              </label>
            </div>

            <label className="block text-sm font-medium text-gray-700">
              Description
              <textarea className={inputCls} rows={2} value={form.body} maxLength={200}
                onChange={(e) => setField('body', e.target.value)} />
            </label>

            <div className="grid sm:grid-cols-3 gap-3 items-end">
              <label className="text-sm font-medium text-gray-700 sm:col-span-1">
                Background image (optional)
                <input type="file" accept="image/*" className="mt-1 block w-full text-sm" disabled={uploading}
                  onChange={(e) => handleImage(e.target.files?.[0])} />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Gradient start
                <input type="color" className="mt-1 block w-full h-9 border border-gray-300 rounded-md" value={form.gradientFrom}
                  onChange={(e) => setField('gradientFrom', e.target.value)} />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Gradient end
                <input type="color" className="mt-1 block w-full h-9 border border-gray-300 rounded-md" value={form.gradientTo}
                  onChange={(e) => setField('gradientTo', e.target.value)} />
              </label>
            </div>
            {uploading && <p className="text-xs text-gray-500">Uploading image…</p>}
            {form.imageUrl && (
              <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => setField('imageUrl', '')}>
                Remove image (use gradient)
              </button>
            )}

            <div className="grid sm:grid-cols-3 gap-3">
              <label className="text-sm font-medium text-gray-700">
                On tap
                <select className={inputCls} value={form.ctaType}
                  onChange={(e) => setEditing((ed) => ({ ...ed, form: { ...ed.form, ctaType: e.target.value, ctaValue: '' } }))}>
                  {CTA_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
              {form.ctaType === 'category' && (
                <label className="text-sm font-medium text-gray-700">
                  Category *
                  <select className={inputCls} value={form.ctaValue} required onChange={(e) => setField('ctaValue', e.target.value)}>
                    <option value="">Select…</option>
                    {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </label>
              )}
              {needsValue && form.ctaType !== 'category' && (
                <label className="text-sm font-medium text-gray-700">
                  {form.ctaType === 'url' ? 'URL *' : 'Product ID *'}
                  <input className={inputCls} value={form.ctaValue} required
                    type={form.ctaType === 'url' ? 'url' : 'text'}
                    placeholder={form.ctaType === 'url' ? 'https://…' : '64f…'}
                    onChange={(e) => setField('ctaValue', e.target.value.trim())} />
                </label>
              )}
              {form.ctaType !== 'none' && (
                <label className="text-sm font-medium text-gray-700">
                  Button text
                  <input className={inputCls} value={form.ctaLabel} maxLength={30} placeholder="Shop now"
                    onChange={(e) => setField('ctaLabel', e.target.value)} />
                </label>
              )}
            </div>

            <div className="grid sm:grid-cols-3 gap-3 items-end">
              <label className="text-sm font-medium text-gray-700">
                Starts (optional)
                <input type="datetime-local" className={inputCls} value={form.startsAt}
                  onChange={(e) => setField('startsAt', e.target.value)} />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Ends (optional)
                <input type="datetime-local" className={inputCls} value={form.endsAt}
                  onChange={(e) => setField('endsAt', e.target.value)} />
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 pb-2">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setField('isActive', e.target.checked)} />
                Visible in app
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 text-sm rounded-lg border border-gray-300">
                Cancel
              </button>
              <button type="submit" disabled={saveMutation.isPending || uploading}
                className="px-4 py-2 text-sm rounded-lg bg-primary-600 text-white disabled:opacity-50">
                {saveMutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

/** Approximates the mobile HeroCarousel card. */
const BannerPreview = ({ banner }) => (
  <div
    className="relative rounded-xl overflow-hidden px-5 py-6 text-white min-h-[150px]"
    style={{ background: `linear-gradient(225deg, ${banner.gradientFrom}, ${banner.gradientTo})` }}
  >
    {banner.imageUrl && (
      <>
        <img src={banner.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/85 to-slate-900/35" />
      </>
    )}
    <div className="relative">
      {banner.badge && (
        <span className="inline-block mb-3 text-[11px] font-bold px-2.5 py-1 rounded-full border border-orange-400/40 bg-orange-400/15 text-orange-300">
          {banner.badge}
        </span>
      )}
      <h3 className="text-xl font-extrabold leading-tight">
        {banner.title || 'Banner title'}
        {banner.highlight && <span className="text-orange-400"> {banner.highlight}</span>}
      </h3>
      {banner.body && <p className="mt-2 text-sm text-slate-300 line-clamp-3">{banner.body}</p>}
      {banner.ctaType && banner.ctaType !== 'none' && (
        <span className="inline-block mt-4 px-4 py-1.5 rounded-full bg-orange-500 text-sm font-bold">
          {banner.ctaLabel || 'Shop now'}
        </span>
      )}
    </div>
  </div>
);

export default Banners;
