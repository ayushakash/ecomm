import React, { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { campaignAPI } from '../../../services/api';
import { errorMessage, primaryBtn } from './constants';

/** Live counts of a WhatsApp/email campaign while it sends, and a button to send the next batch. */
const CampaignProgress = ({ id }) => {
  const queryClient = useQueryClient();
  const { data: c } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignAPI.get(id),
    refetchInterval: (query) => (query.state.data?.status === 'sending' ? 2000 : false),
  });

  // Refresh audience counts / history / shop statuses once a batch finishes.
  // Mounted right after a send starts, so the previous status starts as 'sending'.
  const lastStatus = useRef('sending');
  useEffect(() => {
    if (!c) return;
    if (lastStatus.current === 'sending' && c.status !== 'sending') {
      queryClient.invalidateQueries({ queryKey: ['campaign-audience'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['shop-contacts'] });
    }
    lastStatus.current = c.status;
  }, [c, queryClient]);

  const next = useMutation({
    mutationFn: () => campaignAPI.continue(id),
    onSuccess: (campaign) => queryClient.setQueryData(['campaign', id], campaign),
    onError: (err) => toast.error(errorMessage(err, 'Could not continue')),
  });

  if (!c) return null;
  const sending = c.status === 'sending';
  const done = c.sent + c.failed;
  const nextCount = Math.min(c.remaining, 500);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900">
          {sending ? `Sending… ${done}/${c.recipients}` : c.status === 'stopped' ? 'Stopped — sends kept failing' : 'Finished'}
        </p>
        {sending && <span className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          ['Sent', c.sent, 'text-green-700'],
          ['Failed', c.failed, c.failed ? 'text-red-600' : 'text-gray-900'],
          ['Skipped', c.skipped, 'text-gray-900'],
          ['Remaining', c.remaining, 'text-gray-900'],
        ].map(([label, value, cls]) => (
          <div key={label} className="rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-xl font-bold ${cls}`}>{value}</p>
          </div>
        ))}
      </div>
      {c.skipped > 0 && <p className="text-xs text-gray-500">Skipped = opted out (STOP / unsubscribed) or invalid.</p>}
      {c.errorSample?.length > 0 && (
        <ul className="text-xs text-red-700 bg-red-50 rounded-md p-2 space-y-1 break-words">
          {c.errorSample.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
      {!sending && c.remaining > 0 && c.audience !== 'test' && (
        <button type="button" className={primaryBtn} disabled={next.isPending}
          onClick={() => window.confirm(`Send to the next ${nextCount} people?`) && next.mutate()}>
          {next.isPending ? 'Starting…' : `Send next ${nextCount}`}
        </button>
      )}
    </div>
  );
};

export default CampaignProgress;
