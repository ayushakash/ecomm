import React from 'react';
import { useSearchParams } from 'react-router-dom';
import WhatsAppCampaign from '../../components/admin/campaigns/WhatsAppCampaign';
import EmailCampaign from '../../components/admin/campaigns/EmailCampaign';
import TemplateRegistry from '../../components/admin/campaigns/TemplateRegistry';
import ShopCustomers from '../../components/admin/campaigns/ShopCustomers';
import CampaignHistory from '../../components/admin/campaigns/CampaignHistory';
import PushNotifications from './PushNotifications';

const TABS = [
  ['whatsapp', 'WhatsApp'],
  ['email', 'Email'],
  ['push', 'Push'],
  ['templates', 'Templates'],
  ['shop', 'Shop customers'],
  ['history', 'History'],
];

/** WhatsApp, email and push campaigns in one place; the tab lives in the URL (?tab=). */
const Campaigns = () => {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([key]) => key === params.get('tab')) ? params.get('tab') : 'whatsapp';
  const open = (key, extra = {}) => setParams({ tab: key, ...extra });

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600 text-sm">Send offers and announcements on WhatsApp, email and app notifications.</p>
        </div>
        <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
          {TABS.map(([key, label]) => (
            <button key={key} type="button" onClick={() => open(key)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px ${tab === key ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500'}`}>
              {label}
            </button>
          ))}
        </div>
        {tab === 'whatsapp' && (
          <WhatsAppCampaign initialAudience={params.get('audience') || undefined} onOpenTemplates={() => open('templates')} />
        )}
        {tab === 'email' && <EmailCampaign />}
        {tab === 'push' && <div className="-mx-4 sm:-mx-6"><PushNotifications /></div>}
        {tab === 'templates' && <TemplateRegistry />}
        {tab === 'shop' && <ShopCustomers onSendWelcome={() => open('whatsapp', { audience: 'shop_welcome' })} />}
        {tab === 'history' && <CampaignHistory />}
      </div>
    </div>
  );
};

export default Campaigns;
