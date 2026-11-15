import React from 'react';
import { XMarkIcon, PencilSquareIcon, TrashIcon, PhoneIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';

const Row = ({ label, children }) => (
  <div className="flex gap-3 py-2 border-b border-gray-100 last:border-0 text-sm">
    <span className="w-32 shrink-0 text-gray-500">{label}</span>
    <span className="text-gray-900">{children}</span>
  </div>
);

/** Read-only profile shown when an admin clicks a professional in the list. */
const ProfessionalDetail = ({ professional: p, tradeLabel, onEdit, onToggleActive, onDelete, onClose }) => {
  const isContractor = p.kind === 'contractor';
  const wa = p.whatsapp || p.phone;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-xl p-5 space-y-4 my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {p.photoUrl ? (
              <img src={p.photoUrl} alt={p.name} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xl font-bold">
                {p.name?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-1">
                {p.name}
                {p.verified && <CheckBadgeIcon className="w-5 h-5 text-green-600" title="Verified by Chardeevari" />}
              </h2>
              <p className="text-sm text-gray-500">
                {isContractor ? `Contractor · team of ${p.teamTotal}` : 'Individual'} · {p.experienceYears} yrs experience
              </p>
              <span className={`inline-flex mt-1 px-2 py-0.5 text-xs font-semibold rounded-full ${p.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                {p.isActive ? 'Active' : 'Hidden'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100" aria-label="Close">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2">
          <a href={`tel:+91${p.phone}`} className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium">
            <PhoneIcon className="w-4 h-4" /> {p.phone}
          </a>
          <a href={`https://wa.me/91${wa}`} target="_blank" rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium">
            WhatsApp
          </a>
        </div>

        <div>
          <Row label="Trades">{p.trades.map(tradeLabel).join(', ')}</Row>
          <Row label="Areas">{p.areas.join(', ')}{p.city ? ` (${p.city})` : ''}</Row>
          {p.rateNote && <Row label="Rate">{p.rateNote}</Row>}
          {p.notes && <Row label="Notes">{p.notes}</Row>}
          <Row label="Consent">{p.consentGiven ? 'Taken' : 'Not taken'}</Row>
          <Row label="Registered">
            {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            {p.addedBy?.name ? ` by ${p.addedBy.name}` : ''}
          </Row>
        </div>

        {isContractor && (
          <div className="rounded-lg border border-gray-200">
            <div className="px-3 py-2 bg-gray-50 text-sm font-medium flex justify-between">
              <span>Team strength</span>
              <span>{p.teamTotal} people</span>
            </div>
            {p.team.length ? p.team.map((m) => (
              <div key={m.trade} className="px-3 py-2 text-sm flex justify-between border-t border-gray-100">
                <span>{tradeLabel(m.trade)}</span>
                <span className="font-medium">{m.count}</span>
              </div>
            )) : <p className="px-3 py-2 text-sm text-gray-500 border-t border-gray-100">No team added yet</p>}
          </div>
        )}

        {p.sitePhotos?.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {p.sitePhotos.map((url) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                <img src={url} alt="Site work" className="w-full aspect-square object-cover rounded" />
              </a>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onDelete} className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg text-red-600 hover:bg-red-50">
            <TrashIcon className="w-4 h-4" /> Delete
          </button>
          <button onClick={onToggleActive} className="px-3 py-2 text-sm rounded-lg border border-gray-300">
            {p.isActive ? 'Hide' : 'Make active'}
          </button>
          <button onClick={onEdit} className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg bg-primary-600 text-white">
            <PencilSquareIcon className="w-4 h-4" /> Edit
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalDetail;
