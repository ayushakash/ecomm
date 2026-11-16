import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import { whatsappChatAPI } from '../../services/api';
import ChatList from '../../components/admin/whatsappChat/ChatList';
import ChatThread from '../../components/admin/whatsappChat/ChatThread';
import AutoReplySettings from '../../components/admin/whatsappChat/AutoReplySettings';

/**
 * WhatsApp-style inbox for the API number. Phone: list OR conversation (full screen, back button / ?phone= in URL
 * so the phone's back button closes the chat). Desktop: list and conversation side by side.
 */
const WhatsAppChat = () => {
  const [params, setParams] = useSearchParams();
  const phone = params.get('phone');
  const [search, setSearch] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const { data: chats = [], isLoading } = useQuery({
    queryKey: ['wa-chats', search],
    queryFn: () => whatsappChatAPI.chats(search),
    refetchInterval: 10000,
  });

  const open = (p) => setParams({ phone: p });
  // Back = browser history back, so the phone's back gesture and the arrow behave the same.
  const back = () => (window.history.length > 1 ? window.history.back() : setParams({}));

  return (
    // Fill the screen under the admin top bar (mobile) / next to the sidebar (desktop).
    <div className="h-[calc(100dvh-4.25rem)] lg:h-screen flex flex-col">
      <div className={`${phone ? 'hidden lg:flex' : 'flex'} items-center justify-between px-4 py-3 bg-white border-b border-gray-200`}>
        <div>
          <h1 className="text-lg font-bold text-gray-900">WhatsApp Chat</h1>
          <p className="text-xs text-gray-500">Replies from customers to your WhatsApp bills</p>
        </div>
        <button onClick={() => setShowSettings(true)} className="p-2 rounded-full hover:bg-gray-100" aria-label="Auto-reply settings">
          <Cog6ToothIcon className="w-6 h-6 text-gray-600" />
        </button>
      </div>
      <div className="flex-1 flex min-h-0">
        <div className={`${phone ? 'hidden lg:block' : 'block'} w-full lg:w-96 lg:border-r border-gray-200 min-h-0`}>
          <ChatList chats={chats} selectedPhone={phone} onSelect={open} search={search} onSearch={setSearch} loading={isLoading} />
        </div>
        <div className={`${phone ? 'block' : 'hidden lg:flex'} flex-1 min-h-0`}>
          {phone ? <ChatThread key={phone} phone={phone} onBack={back} /> : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm bg-[#f0f2f5]">Select a chat</div>
          )}
        </div>
      </div>
      {showSettings && <AutoReplySettings onClose={() => setShowSettings(false)} />}
    </div>
  );
};

export default WhatsAppChat;
