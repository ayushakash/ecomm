import React, { useState } from 'react';
import SendBills from '../../components/admin/whatsappBills/SendBills';
import BillHistory from '../../components/admin/whatsappBills/BillHistory';
import OptOuts from '../../components/admin/whatsappBills/OptOuts';
import BillSettings from '../../components/admin/whatsappBills/BillSettings';

const TABS = [
  ['send', 'Send bills'],
  ['history', 'History'],
  ['optouts', 'Opt-outs'],
  ['settings', 'Settings'],
];

/** Upload a sales report, pick bills, send them as WhatsApp bills (MSG91). Built for use on a phone. */
const WhatsAppBills = () => {
  const [tab, setTab] = useState('send');
  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Bills</h1>
          <p className="text-gray-600 text-sm">Send each customer their bill on WhatsApp, with a link to order online.</p>
        </div>
        <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
          {TABS.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px ${tab === key ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500'}`}>
              {label}
            </button>
          ))}
        </div>
        {/* Keep the send tab mounted so an upload/progress survives switching tabs. */}
        <div className={tab === 'send' ? '' : 'hidden'}><SendBills onOpenSettings={() => setTab('settings')} /></div>
        {tab === 'history' && <BillHistory />}
        {tab === 'optouts' && <OptOuts />}
        {tab === 'settings' && <BillSettings />}
      </div>
    </div>
  );
};

export default WhatsAppBills;
