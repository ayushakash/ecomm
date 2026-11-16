import React from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

/** "10:42 am" today, "Yesterday", else "14 Nov". */
export function shortTime(d) {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (date.toDateString() === y.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const initial = (chat) => (chat.name || chat.phone || '?').trim()[0]?.toUpperCase();

/** Conversation list (WhatsApp-style rows). */
const ChatList = ({ chats, selectedPhone, onSelect, search, onSearch, loading }) => (
  <div className="flex flex-col h-full bg-white">
    <div className="p-3 border-b border-gray-200">
      <div className="relative">
        <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input className="w-full pl-9 pr-3 py-2 rounded-full bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Search name or number" value={search} onChange={(e) => onSearch(e.target.value)} />
      </div>
    </div>
    <div className="flex-1 overflow-y-auto">
      {loading ? <p className="p-4 text-sm text-gray-500">Loading…</p> : chats.length === 0 ? (
        <p className="p-6 text-sm text-gray-500 text-center">No messages yet. When customers reply to a WhatsApp bill, they appear here.</p>
      ) : chats.map((c) => (
        <button key={c.phone} onClick={() => onSelect(c.phone)}
          className={`w-full flex items-center gap-3 px-3 py-3 text-left border-b border-gray-100 active:bg-gray-100 ${selectedPhone === c.phone ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
          <div className="w-11 h-11 shrink-0 rounded-full bg-green-600 text-white flex items-center justify-center font-semibold">{initial(c)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between gap-2">
              <span className="font-semibold text-gray-900 truncate">{c.name || `+91 ${c.phone}`}</span>
              <span className={`text-xs shrink-0 ${c.unread ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>{shortTime(c.lastMessageAt)}</span>
            </div>
            <div className="flex justify-between gap-2 items-center">
              <span className="text-sm text-gray-500 truncate">{c.lastDirection === 'out' ? 'You: ' : ''}{c.lastText}</span>
              {c.unread > 0 && <span className="shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center">{c.unread}</span>}
            </div>
            {c.name && <span className="text-xs text-gray-400">+91 {c.phone}{!c.windowOpen && ' · reply window closed'}</span>}
          </div>
        </button>
      ))}
    </div>
  </div>
);

export default ChatList;
