import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { whatsappBillAPI } from '../../../services/api';

/** Numbers that must never get WhatsApp bills: STOP replies (automatic) and ones added by admin. */
const OptOuts = () => {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const { data: items = [], isLoading } = useQuery({ queryKey: ['wa-opt-outs'], queryFn: whatsappBillAPI.optOuts });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['wa-opt-outs'] });

  const add = useMutation({
    mutationFn: () => whatsappBillAPI.addOptOut(phone, note),
    onSuccess: () => { setPhone(''); setNote(''); refresh(); toast.success('Number blocked'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not add'),
  });
  const remove = useMutation({
    mutationFn: (p) => whatsappBillAPI.removeOptOut(p),
    onSuccess: () => { refresh(); toast.success('Removed — this number can get bills again'); },
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Customers who reply <strong>STOP</strong> to a WhatsApp bill are added here automatically. You can also add a number yourself.
      </p>
      <form className="flex flex-col sm:flex-row gap-2" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
        <input className="border border-gray-300 rounded-md px-3 py-2 text-sm" inputMode="numeric" maxLength={10} required
          pattern="[6-9][0-9]{9}" placeholder="10-digit mobile" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />
        <input className="border border-gray-300 rounded-md px-3 py-2 text-sm flex-1" placeholder="Note (optional)" maxLength={200}
          value={note} onChange={(e) => setNote(e.target.value)} />
        <button type="submit" disabled={add.isPending} className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium">Block number</button>
      </form>
      {isLoading ? <p className="text-sm text-gray-500">Loading…</p> : items.length === 0 ? (
        <p className="text-sm text-gray-500">No opted-out numbers.</p>
      ) : (
        <ul className="bg-white rounded-lg border border-gray-200 divide-y">
          {items.map((o) => (
            <li key={o.phone} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div>
                <span className="font-medium">{o.phone}</span>
                <span className="ml-2 text-xs text-gray-500">{o.source === 'stop_reply' ? 'Replied STOP' : 'Added by admin'}{o.note ? ` · ${o.note}` : ''}</span>
              </div>
              <button className="text-xs text-gray-600 underline" onClick={() => window.confirm(`Allow WhatsApp bills to ${o.phone} again?`) && remove.mutate(o.phone)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default OptOuts;
