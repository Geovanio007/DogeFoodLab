import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MessageCircle, Reply, Send, X } from 'lucide-react';

/**
 * Community chat for the main menu.
 *
 *  - useChatUnread(address, enabled)  → number of unread replies for the player,
 *    refreshed every 25s while the page is visible. Drives the message-icon badge
 *    in the profile card and the "Community" tab badge.
 *  - <CommunityChat />                → the chat panel itself (lives in the
 *    "Community" tab of the main menu activity card).
 *
 * Backend: /api/community-chat/*  (messages, send, notifications, notifications/read)
 */

const API = `${process.env.REACT_APP_BACKEND_URL}/api/community-chat`;
const MESSAGE_MAX = 280;
const POLL_MS = 5000;
const UNREAD_POLL_MS = 25000;

// ── Unread replies ───────────────────────────────────────────────────────────
export function useChatUnread(address, enabled = true) {
  const [unread, setUnread] = useState(0);
  const active = !!address && enabled && address !== 'GUEST_USER';

  const refresh = useCallback(async () => {
    if (!active) return;
    try {
      const r = await fetch(`${API}/notifications?player_id=${encodeURIComponent(address)}`);
      if (!r.ok) return;
      const d = await r.json();
      setUnread(d.unread_count || 0);
    } catch (_) { /* offline / transient — keep the last value */ }
  }, [active, address]);

  useEffect(() => {
    if (!active) { setUnread(0); return undefined; }
    refresh();
    const iv = setInterval(() => { if (!document.hidden) refresh(); }, UNREAD_POLL_MS);
    const onVisible = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(iv);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [active, refresh]);

  const markRead = useCallback(async () => {
    if (!active) return;
    setUnread(0);
    try {
      await fetch(`${API}/notifications/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: address }),
      });
    } catch (_) { /* ignore — next poll corrects the badge */ }
  }, [active, address]);

  return { unread, markRead, refresh };
}

// ── Small helpers ────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#f472b6', '#fb923c', '#22d3ee', '#818cf8'];
const colorFor = (name = '') => {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

const timeAgo = (iso) => {
  const t = new Date(iso).getTime();
  if (!t) return '';
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 45) return 'now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${Math.max(1, m)}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

const mergeMessages = (prev, incoming) => {
  if (!incoming.length) return prev;
  const seen = new Set(prev.map((m) => m.id));
  const added = incoming.filter((m) => !seen.has(m.id));
  if (!added.length) return prev;
  return [...prev, ...added].slice(-150);
};

// ── Panel ────────────────────────────────────────────────────────────────────
const CommunityChat = ({ address, isLoggedIn, username, onNeedUsername, chat, active = true }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);
  const stickRef = useRef(true);
  const lastAtRef = useRef(null);
  const inputRef = useRef(null);

  const viewer = isLoggedIn && address && address !== 'GUEST_USER' ? address : '';

  // First load + polling for new messages (only while this tab is showing)
  const fetchMessages = useCallback(async (initial) => {
    try {
      const qs = new URLSearchParams({ limit: '60' });
      if (viewer) qs.set('viewer', viewer);
      if (!initial && lastAtRef.current) qs.set('after', lastAtRef.current);
      const r = await fetch(`${API}/messages?${qs.toString()}`);
      if (!r.ok) return;
      const d = await r.json();
      const list = d.messages || [];
      if (initial) setMessages(list); else setMessages((prev) => mergeMessages(prev, list));
      if (list.length) lastAtRef.current = list[list.length - 1].created_at;
    } catch (_) { /* transient */ } finally {
      if (initial) setLoading(false);
    }
  }, [viewer]);

  useEffect(() => {
    if (!active) return undefined;
    lastAtRef.current = null;
    setLoading(true);
    fetchMessages(true);
    const iv = setInterval(() => { if (!document.hidden) fetchMessages(false); }, POLL_MS);
    return () => clearInterval(iv);
  }, [active, fetchMessages]);

  // Opening the tab (or receiving a reply while it is open) clears the badge
  const unreadCount = chat ? chat.unread : 0;
  const markRead = chat ? chat.markRead : null;
  useEffect(() => {
    if (active && unreadCount > 0 && markRead) markRead();
  }, [active, unreadCount, markRead]);

  // Keep the view pinned to the newest message unless the reader scrolled up
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const startReply = (m) => {
    setReplyTo({ id: m.id, nickname: m.nickname, text: m.message });
    setError('');
    if (inputRef.current) inputRef.current.focus();
  };

  const send = async () => {
    const body = text.trim();
    if (!body || sending || !viewer) return;
    setSending(true);
    setError('');
    try {
      const r = await fetch(`${API}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: viewer, message: body, reply_to: replyTo ? replyTo.id : null }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        const detail = typeof d.detail === 'string' ? d.detail : 'Could not send your message.';
        setError(detail);
        return;
      }
      stickRef.current = true;
      setMessages((prev) => mergeMessages(prev, [d.message]));
      lastAtRef.current = d.message.created_at;
      setText('');
      setReplyTo(null);
    } catch (_) {
      setError('Connection problem. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const canWrite = !!viewer && !!username;

  return (
    <div className="flex flex-col" data-testid="community-chat">
      {/* Message list */}
      <div
        ref={listRef}
        onScroll={onScroll}
        className="h-[340px] sm:h-[400px] overflow-y-auto px-3 py-3 space-y-1.5"
        data-testid="community-chat-list"
      >
        {loading ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500">Loading conversation…</div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-2 px-6">
            <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-violet-300" />
            </div>
            <div className="text-sm font-semibold text-white">Start the conversation</div>
            <div className="text-xs text-slate-500">Say hello to the other scientists. Replies show up with a notification.</div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`group rounded-xl px-3 py-2 transition-colors ${
                m.replied_to_me
                  ? 'bg-amber-400/[0.07] border-l-2 border-amber-400/70'
                  : m.is_mine
                    ? 'bg-sky-500/[0.07] border-l-2 border-sky-400/40'
                    : 'hover:bg-white/[0.02] border-l-2 border-transparent'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold text-[#0d1117]"
                  style={{ background: colorFor(m.nickname) }}
                  aria-hidden="true"
                >
                  {(m.nickname || '?').slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-semibold truncate" style={{ color: colorFor(m.nickname) }}>
                      {m.nickname}{m.is_mine ? ' (you)' : ''}
                    </span>
                    <span className="text-[10px] text-slate-600 tabular-nums">{timeAgo(m.created_at)}</span>
                    {m.replied_to_me && (
                      <span className="text-[9px] font-bold uppercase tracking-wide text-amber-300 bg-amber-400/10 rounded px-1.5 py-0.5">
                        Replied to you
                      </span>
                    )}
                  </div>
                  {m.reply_nickname && (
                    <div className="mt-1 mb-0.5 pl-2 border-l-2 border-white/10 text-[11px] text-slate-500 truncate">
                      <Reply className="inline w-3 h-3 mr-1 -mt-0.5 opacity-70" />
                      <span className="text-slate-400">{m.reply_nickname}</span>: {m.reply_text}
                    </div>
                  )}
                  <p className="text-[13px] text-slate-200 leading-snug break-words whitespace-pre-wrap">{m.message}</p>
                </div>
                {canWrite && !m.is_mine && (
                  <button
                    type="button"
                    onClick={() => startReply(m)}
                    className="shrink-0 mt-0.5 p-1.5 rounded-lg text-slate-500 hover:text-sky-300 hover:bg-white/5 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition"
                    aria-label={`Reply to ${m.nickname}`}
                    title="Reply"
                  >
                    <Reply className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-white/[0.06] bg-[#0d1117]/60 p-3">
        {!viewer ? (
          <div className="text-center text-xs text-slate-400 py-2">
            Connect your wallet or open the game in Telegram to join the conversation.
          </div>
        ) : !username ? (
          <div className="flex items-center justify-between gap-3 py-1">
            <span className="text-xs text-slate-400">Pick a username to start chatting.</span>
            <button
              type="button"
              onClick={onNeedUsername}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold transition-colors"
            >
              Set username
            </button>
          </div>
        ) : (
          <>
            {replyTo && (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-slate-400">
                <Reply className="w-3 h-3 shrink-0 text-sky-300" />
                <span className="truncate">Replying to <span className="text-slate-200 font-semibold">{replyTo.nickname}</span>: {replyTo.text}</span>
                <button type="button" onClick={() => setReplyTo(null)} className="ml-auto p-0.5 text-slate-500 hover:text-white" aria-label="Cancel reply">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => { setText(e.target.value.slice(0, MESSAGE_MAX)); if (error) setError(''); }}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder={replyTo ? `Reply to ${replyTo.nickname}…` : 'Write a message…'}
                className="flex-1 resize-none max-h-24 bg-[#0d1117] border border-white/10 focus:border-sky-400/50 outline-none rounded-xl px-3 py-2 text-[13px] text-white placeholder-slate-600"
                data-testid="community-chat-input"
              />
              <button
                type="button"
                onClick={send}
                disabled={sending || !text.trim()}
                className="shrink-0 w-10 h-10 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-500 text-white flex items-center justify-center transition-colors"
                aria-label="Send message"
                data-testid="community-chat-send"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px]">
              <span className={error ? 'text-red-400' : 'text-slate-600'} role={error ? 'alert' : undefined}>
                {error || 'Be kind. No links. Enter to send.'}
              </span>
              {text.length > MESSAGE_MAX - 60 && (
                <span className="text-slate-500 tabular-nums">{text.length}/{MESSAGE_MAX}</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CommunityChat;
