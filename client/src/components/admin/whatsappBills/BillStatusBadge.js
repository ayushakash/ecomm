import React from 'react';

const STYLES = {
  new: ['New', 'bg-blue-100 text-blue-800'],
  retry: ['Failed · retry', 'bg-amber-100 text-amber-800'],
  sending: ['Sending…', 'bg-gray-200 text-gray-700'],
  // "Sent" = MSG91 accepted it. Actual WhatsApp delivery is reported in MSG91's delivery report.
  sent: ['Sent to MSG91 ✓', 'bg-green-100 text-green-800'],
  failed: ['Failed ✗', 'bg-red-100 text-red-800'],
  no_phone: ['No phone', 'bg-gray-100 text-gray-500'],
  opted_out: ['Opted out', 'bg-red-100 text-red-700'],
};

/** Status chip shared by the send list and the history list. */
const BillStatusBadge = ({ status }) => {
  const [label, cls] = STYLES[status] || [status, 'bg-gray-100 text-gray-600'];
  return <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${cls}`}>{label}</span>;
};

export default BillStatusBadge;
