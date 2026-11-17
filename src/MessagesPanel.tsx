import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { apiRequest, formatDateShort, getInitials } from '../lib/api';
import type { ChatMessage, MessageThread, UserSummary } from '../types/marketplace';
import { FloatingInput } from './FloatingFields';

interface MessagesPanelProps {
  currentUser: UserSummary;
  initialPartnerId?: number | null;
  onMessagesRead?: () => void;
}

export const MessagesPanel: React.FC<MessagesPanelProps> = ({
  currentUser,
  initialPartnerId = null,
  onMessagesRead,
}) => {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [activePartnerId, setActivePartnerId] = useState<number | null>(initialPartnerId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const loadThreads = async () => {
    const res = await apiRequest<{ threads: MessageThread[] }>('/api/messages/threads');
    setThreads(res.threads);
    if (!activePartnerId && res.threads.length > 0) {
      setActivePartnerId(initialPartnerId || res.threads[0].partnerId);
    }
  };

  const loadConversation = async (partnerId: number) => {
    const res = await apiRequest<{ messages: ChatMessage[] }>(`/api/messages/${partnerId}`);
    setMessages(res.messages);
    onMessagesRead?.();
  };

  useEffect(() => {
    loadThreads();
  }, []);

  useEffect(() => {
    if (initialPartnerId) {
      setActivePartnerId(initialPartnerId);
    }
  }, [initialPartnerId]);

  useEffect(() => {
    if (!activePartnerId) return;
    loadConversation(activePartnerId);
    const timer = window.setInterval(() => {
      loadConversation(activePartnerId);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [activePartnerId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePartnerId || !draft.trim()) return;
    setSending(true);
    try {
      const res = await apiRequest<{ message: ChatMessage }>('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ receiverId: activePartnerId, body: draft.trim() }),
      });
      setMessages((prev) => [...prev, res.message]);
      setDraft('');
      await loadThreads();
    } finally {
      setSending(false);
    }
  };

  const activeThread = threads.find((t) => t.partnerId === activePartnerId) || null;

  return (
    <div className="liquid-glass grid min-h-[540px] overflow-hidden rounded-2xl lg:grid-cols-12">
      <div className="border-b border-white/10 lg:col-span-4 lg:border-b-0 lg:border-r">
        <div className="border-b border-white/10 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-100">Direct Messages</h3>
          <p className="text-xs text-slate-400">Encrypted workspace conversations</p>
        </div>
        <div className="max-h-[470px] divide-y divide-white/[0.06] overflow-y-auto">
          {threads.map((t) => (
            <button
              key={t.partnerId}
              type="button"
              onClick={() => setActivePartnerId(t.partnerId)}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                activePartnerId === t.partnerId ? 'bg-sky-500/12' : 'hover:bg-white/[0.03]'
              }`}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 text-xs font-bold text-white"
                style={{ backgroundColor: `${t.partnerAvatarColor}30` }}
              >
                {getInitials(t.partnerName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-slate-100">{t.partnerName}</span>
                  {t.unreadCount > 0 && (
                    <span className="font-mono text-[11px] font-semibold text-sky-300 tabular-nums">
                      {t.unreadCount} new
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-slate-400">
                  {t.lastMessage || `${t.partnerRole} · Start conversation`}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:col-span-8">
        {!activeThread ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-slate-400">
            <MessageSquare className="mb-3 h-8 w-8 text-slate-500" />
            <p className="text-sm">Select a colleague or client to open messages.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-100">{activeThread.partnerName}</h4>
                <p className="text-xs capitalize text-slate-400">
                  @{activeThread.partnerUsername} · {activeThread.partnerRole}
                </p>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-6" style={{ maxHeight: 390 }}>
              {messages.length === 0 ? (
                <p className="py-10 text-center text-xs text-slate-400">
                  No messages yet. Send the first note below.
                </p>
              ) : (
                messages.map((m) => {
                  const mine = m.senderId === currentUser.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${
                          mine
                            ? 'bg-sky-500/20 text-slate-100 border border-sky-400/30'
                            : 'bg-white/[0.045] text-slate-200 border border-white/10'
                        }`}
                      >
                        <p className="leading-relaxed">{m.body}</p>
                        <p className="mt-1 font-mono text-[10px] text-slate-400 tabular-nums">
                          {formatDateShort(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={endRef} />
            </div>

            <form
              onSubmit={handleSend}
              className="flex items-center gap-3 border-t border-white/10 px-5 py-4"
            >
              <FloatingInput
                label={`Message ${activeThread.partnerName}`}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-sky-500 px-5 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
                Send
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
