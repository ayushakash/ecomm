import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon, PaperAirplaneIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { whatsappChatAPI } from '../../../services/api';
import { shortTime } from './ChatList';

const TICKS = { sent: '✓', delivered: '✓✓', read: '✓✓' };

/** "closes in 5 h 20 m" for the 24-hour reply window. */
function timeLeft(until) {
  const ms = new Date(until).getTime() - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h ? `${h} h ${m} m` : `${m} m`;
}

/** One conversation: messages + reply box. Refreshes every 5 s. */
const ChatThread = ({ phone, onBack }) => {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: ['wa-chat-thread', phone],
    queryFn: () => whatsappChatAPI.messages(phone),
    refetchInterval: 5000,
  });
  const chat = data?.chat;
  const messages = data?.messages ?? [];

  // Opening a chat marks it read on the server — refresh the list and the sidebar badge.
  useEffect(() => {
    if (data) {
      queryClient.invalidateQueries({ queryKey: ['wa-chats'] });
      queryClient.invalidateQueries({ queryKey: ['wa-chat-unread'] });
    }
  }, [data?.messages?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, phone]);

  const send = useMutation({
    mutationFn: (msg) => whatsappChatAPI.reply(phone, msg),
    onSuccess: () => {
      setText('');
      queryClient.invalidateQueries({ queryKey: ['wa-chat-thread', phone] });
      queryClient.invalidateQueries({ queryKey: ['wa-chats'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Not sent');
      queryClient.invalidateQueries({ queryKey: ['wa-chat-thread', phone] });
    },
  });

  // Grow the reply box with its content (up to ~5 lines).
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  const submit = () => {
    const msg = text.trim();
    if (msg && !send.isPending) send.mutate(msg);
  };

  const left = chat?.windowOpen ? timeLeft(chat.windowClosesAt) : null;

  return (
    <div className="flex flex-col h-full bg-[#efeae2]">
      {/* Header */}
      <div className="flex items-center gap-3 px-2 py-2 bg-green-700 text-white">
        <button onClick={onBack} className="p-2 rounded-full active:bg-green-800 lg:hidden" aria-label="Back to chats">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0 pl-1">
          <p className="font-semibold truncate">{chat?.name || `+91 ${phone}`}</p>
          <p className="text-xs text-green-100 truncate">+91 {phone}{left ? ` · reply window: ${left} left` : chat ? ' · reply window closed' : ''}</p>
        </div>
        <a href={`tel:+91${phone}`} className="p-2 rounded-full active:bg-green-800" aria-label="Call customer">
          <PhoneIcon className="w-5 h-5" />
        </a>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
        {isLoading && <p className="text-center text-sm text-gray-500">Loading…</p>}
        {messages.map((m) => {
          const out = m.direction === 'out';
          return (
            <div key={m._id} className={`flex ${out ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] sm:max-w-[70%] rounded-lg px-3 py-1.5 shadow-sm text-sm whitespace-pre-wrap break-words ${out ? 'bg-[#d9fdd3]' : 'bg-white'}`}>
                {m.autoReply && <p className="text-[11px] text-gray-500 italic">Auto-reply</p>}
                {m.mediaUrl && !out ? (
                  <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">{m.text || 'Open attachment'}</a>
                ) : m.text}
                <span className="flex justify-end items-center gap-1 mt-0.5 text-[11px] text-gray-500">
                  {shortTime(m.at || m.createdAt)}
                  {out && (m.status === 'failed'
                    ? <span className="text-red-600 font-semibold" title={m.error}>! Not sent</span>
                    : <span className={m.status === 'read' ? 'text-blue-500' : ''}>{TICKS[m.status] || ''}</span>)}
                </span>
                {out && m.status === 'failed' && m.error && <p className="text-[11px] text-red-600">{m.error}</p>}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      {chat && !chat.windowOpen ? (
        <div className="p-3 bg-white border-t border-gray-200 text-sm text-gray-700">
          It's been more than 24 hours since this customer wrote. WhatsApp only allows replies within 24 hours —
          {' '}<a href={`tel:+91${phone}`} className="text-green-700 font-semibold underline">call +91 {phone}</a> instead.
          Once they message again, you can reply here.
        </div>
      ) : (
        <form className="flex items-end gap-2 p-2 bg-[#f0f2f5]" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <textarea ref={textareaRef} rows={1} value={text} onChange={(e) => setText(e.target.value)} maxLength={4000}
            onKeyDown={(e) => {
              // Desktop: Enter sends, Shift+Enter = new line. On phones the keyboard's Enter adds a line; use the button.
              if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(pointer: fine)').matches) { e.preventDefault(); submit(); }
            }}
            placeholder="Type a message" className="flex-1 resize-none rounded-2xl border-0 px-4 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-green-500" />
          <button type="submit" disabled={!text.trim() || send.isPending} aria-label="Send"
            className="w-11 h-11 shrink-0 rounded-full bg-green-600 text-white flex items-center justify-center disabled:opacity-40 active:bg-green-700">
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </form>
      )}
    </div>
  );
};

export default ChatThread;
