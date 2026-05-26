import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Trophy, Flame, Zap, Send, Users, Eye, Mic, Radio,
  TrendingUp, Target, Clock, Award, AlertTriangle, Sparkles,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

/* ============================================================
   DogeFood Lab — LAB ARENA (Phase 1)
   Live 24h leaderboard, prize pool, chat, predictions, heat events.
   Streaming UI is a tease-card until Phase 2.
   ============================================================ */

const RANK_BADGE = {
  1: { bg: 'from-yellow-300 to-amber-500', text: '#0b1738' },
  2: { bg: 'from-slate-200 to-slate-400', text: '#0b1738' },
  3: { bg: 'from-orange-300 to-amber-700', text: '#0b1738' },
};

const formatHMS = (totalSec) => {
  const s = Math.max(0, totalSec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return [h, m, sec].map((v) => String(v).padStart(2, '0')).join(':');
};

const useNow = (everyMs = 1000) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
};

// ─── Hook: polled fetch ──────────────────────────────────────
const usePoll = (url, intervalMs, options) => {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    if (!url) return undefined;
    const tick = async () => {
      try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error('http ' + res.status);
        const json = await res.json();
        if (aliveRef.current) setData(json);
      } catch (e) {
        if (aliveRef.current) setErr(e);
      }
    };
    tick();
    const t = setInterval(tick, intervalMs);
    return () => { aliveRef.current = false; clearInterval(t); };
  }, [url, intervalMs, options]);
  return { data, err };
};

const LabArena = ({ playerAddress = 'GUEST_USER', playerNickname = '' }) => {
  const navigate = useNavigate();
  const [showStreamModal, setShowStreamModal] = useState(false);

  const arenaPoll = usePoll(`${API_URL}/api/arena/leaderboard?limit=50`, 4000);
  const heatPoll = usePoll(`${API_URL}/api/arena/heat`, 15000);
  const predictionPoll = usePoll(`${API_URL}/api/arena/prediction/${playerAddress}`, 8000);

  const arena = arenaPoll.data?.arena;
  const entries = arenaPoll.data?.entries || [];
  const heat = heatPoll.data?.event;
  const myPrediction = predictionPoll.data?.prediction;

  const isJoined = useMemo(
    () => entries.some((e) => e.player_address === playerAddress),
    [entries, playerAddress]
  );

  return (
    <div className="min-h-screen bg-[#04030f] text-white relative overflow-hidden" data-testid="lab-arena">
      <ArenaBackground heatColor={heat?.color} />

      {/* Header */}
      <header className="relative z-20 px-3 sm:px-6 pt-3 sm:pt-5 pb-3 flex items-center gap-3">
        <button
          data-testid="arena-back-btn"
          onClick={() => navigate('/')}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors"
          aria-label="Back to menu"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-[9px] sm:text-[10px] tracking-[0.35em] font-mono text-yellow-300/80 uppercase">
            Lab Arena · Live
          </div>
          <h1
            className="text-xl sm:text-3xl font-bold leading-tight truncate"
            style={{ fontFamily: "'Bowlby One', 'Fredoka', system-ui, sans-serif", fontWeight: 400 }}
          >
            Arena<span className="text-yellow-400">.</span>
          </h1>
        </div>
        <LiveDot />
      </header>

      {/* Heat banner */}
      {heat && <HeatEventBanner heat={heat} startedAt={heatPoll.data?.started_at} duration={heatPoll.data?.duration_min} />}

      {/* Top: arena banner + prize pool */}
      <div className="relative z-10 px-3 sm:px-6">
        <ArenaBanner
          arena={arena}
          isJoined={isJoined}
          onJoin={async () => {
            try {
              const res = await fetch(`${API_URL}/api/arena/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: playerAddress, nickname: playerNickname }),
              });
              const j = await res.json();
              if (!res.ok) alert(j.detail || 'Failed to join arena');
            } catch (e) { alert(e.message); }
          }}
        />
      </div>

      {/* Streams placeholder section */}
      <div className="relative z-10 px-3 sm:px-6 mt-4 sm:mt-6">
        <SectionHeader icon={<Radio className="w-3.5 h-3.5" />} label="Active Streams" hint="Preview · launching v2.1" />
        <StreamTeaseStrip onClick={() => setShowStreamModal(true)} />
      </div>

      {/* Main 2-col grid: leaderboard | chat + predictions */}
      <div className="relative z-10 px-3 sm:px-6 mt-4 sm:mt-6 grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-3 sm:gap-4 pb-24">
        <div className="space-y-4">
          <LeaderboardCard entries={entries} myAddress={playerAddress} />
        </div>
        <div className="space-y-4">
          <PredictionPanel
            entries={entries}
            myAddress={playerAddress}
            myPrediction={myPrediction}
            onPredict={async (target) => {
              try {
                const res = await fetch(`${API_URL}/api/arena/predict`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ address: playerAddress, target_address: target }),
                });
                const j = await res.json();
                if (!res.ok) alert(j.detail || 'Prediction failed');
              } catch (e) { alert(e.message); }
            }}
          />
          <ArenaChat playerAddress={playerAddress} playerNickname={playerNickname} />
        </div>
      </div>

      {showStreamModal && <StreamComingSoonModal onClose={() => setShowStreamModal(false)} />}
      <ArenaStyles />
    </div>
  );
};

/* ─── Atmospheric background ─── */
const ArenaBackground = ({ heatColor }) => (
  <>
    <div aria-hidden className="absolute inset-0 pointer-events-none"
         style={{ background: 'radial-gradient(ellipse at 50% 0%, #11203f 0%, #050917 55%, #02030a 100%)' }} />
    <div aria-hidden className="absolute inset-0 pointer-events-none arena-grid opacity-25" />
    <div aria-hidden className="absolute -top-32 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] rounded-full opacity-25 pointer-events-none"
         style={{ background: `radial-gradient(circle, ${heatColor || 'rgba(250,204,21,0.5)'}, transparent 65%)`, filter: 'blur(60px)' }} />
    <div aria-hidden className="absolute inset-0 arena-scanline opacity-20 pointer-events-none mix-blend-overlay" />
  </>
);

/* ─── Heat Event Banner ─── */
const HeatEventBanner = ({ heat, startedAt, duration }) => {
  const now = useNow(1000);
  const endsAt = useMemo(() => {
    if (!startedAt) return null;
    return new Date(startedAt).getTime() + (duration || 30) * 60 * 1000;
  }, [startedAt, duration]);
  const remainingSec = endsAt ? Math.max(0, Math.floor((endsAt - now) / 1000)) : 0;

  return (
    <div data-testid="heat-banner" className="relative z-10 mx-3 sm:mx-6 mb-3 rounded-2xl border-2 overflow-hidden"
         style={{ borderColor: heat.color + 'aa', background: `linear-gradient(90deg, ${heat.color}25, transparent 60%)` }}>
      <div className="absolute inset-0 opacity-30 pointer-events-none arena-pulse"
           style={{ background: `radial-gradient(ellipse at left, ${heat.color}55, transparent 70%)` }} />
      <div className="relative flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0"
             style={{ background: heat.color + '33', border: `1.5px solid ${heat.color}` }}>
          <Flame className="w-5 h-5" style={{ color: heat.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] sm:text-[10px] tracking-[0.3em] font-mono font-bold uppercase" style={{ color: heat.color }}>
              Heat Event
            </span>
            <span className="text-[9px] sm:text-[10px] font-mono text-white/40">{heat.intensity?.toUpperCase()}</span>
          </div>
          <div className="text-sm sm:text-base font-bold text-white truncate">{heat.name}</div>
          <div className="text-[11px] sm:text-xs text-white/70 truncate">{heat.blurb}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[9px] tracking-[0.3em] font-mono text-white/40 uppercase">Ends in</div>
          <div className="font-mono font-bold tabular-nums text-yellow-200">{formatHMS(remainingSec)}</div>
        </div>
      </div>
    </div>
  );
};

/* ─── Arena Banner (countdown + prize pool + join) ─── */
const ArenaBanner = ({ arena, isJoined, onJoin }) => {
  const now = useNow(1000);
  const endsAt = arena?.ends_at ? new Date(arena.ends_at).getTime() : null;
  const remaining = endsAt ? Math.max(0, Math.floor((endsAt - now) / 1000)) : 0;

  return (
    <section data-testid="arena-banner"
             className="relative rounded-3xl border-2 border-yellow-400/40 overflow-hidden bg-gradient-to-br from-[#0d1430]/95 via-[#0a0f24]/95 to-[#06091a]/95 backdrop-blur-md shadow-[0_8px_0_rgba(0,0,0,0.35),0_20px_50px_-15px_rgba(250,204,21,0.4)]">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-300/80 to-transparent" />
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-30 pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(250,204,21,0.6), transparent 70%)', filter: 'blur(40px)' }} />
      <div className="relative grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 sm:gap-6 px-4 sm:px-6 py-4 sm:py-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-[10px] sm:text-xs tracking-[0.3em] font-mono font-bold text-yellow-300 uppercase">
              24h Arena · {arena?.entries_count || 0} competitors
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1 leading-tight"
              style={{ fontFamily: "'Bowlby One', 'Fredoka', system-ui, sans-serif", fontWeight: 400 }}>
            Prize Pool
          </h2>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl sm:text-5xl font-bold tabular-nums text-yellow-400"
                  style={{ fontFamily: "'JetBrains Mono', monospace", textShadow: '0 0 20px rgba(250,204,21,0.5)' }}>
              {(arena?.prize_pool || 0).toLocaleString()}
            </span>
            <span className="text-sm sm:text-base font-mono font-bold text-white/60">PTS</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] sm:text-xs text-white/60">
            <Clock className="w-3.5 h-3.5" />
            <span>Resets in <span className="text-white font-mono font-bold">{formatHMS(remaining)}</span></span>
          </div>
        </div>

        <div className="flex flex-col items-stretch sm:items-end gap-2">
          <button
            data-testid="arena-join-btn"
            onClick={onJoin}
            disabled={isJoined}
            className={`arena-join-btn relative px-5 sm:px-7 py-3 sm:py-3.5 rounded-2xl font-bold text-sm sm:text-base transition-all whitespace-nowrap ${isJoined ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Trophy className="w-4 h-4" />
              {isJoined ? 'Joined' : 'Join Arena · 50 pts'}
            </span>
          </button>
          {!isJoined && (
            <div className="text-[10px] text-white/50 text-center sm:text-right font-mono">Entry fee adds to pool</div>
          )}
        </div>
      </div>
    </section>
  );
};

/* ─── Leaderboard ─── */
const LeaderboardCard = ({ entries, myAddress }) => {
  return (
    <section data-testid="arena-leaderboard"
             className="rounded-2xl border border-white/10 bg-[#0a0f24]/80 backdrop-blur overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <span className="text-xs sm:text-sm font-bold tracking-wider uppercase text-white">Live Leaderboard</span>
        </div>
        <span className="text-[10px] font-mono text-white/40">{entries.length} live</span>
      </div>
      {entries.length === 0 ? (
        <div className="py-10 text-center text-white/40 text-sm">
          <Users className="w-6 h-6 mx-auto mb-2 opacity-50" />
          No competitors yet. Be the first to enter.
        </div>
      ) : (
        <ul className="divide-y divide-white/5">
          {entries.map((e) => (
            <LeaderboardRow key={e.id} entry={e} isMe={e.player_address === myAddress} />
          ))}
        </ul>
      )}
    </section>
  );
};

const LeaderboardRow = ({ entry, isMe }) => {
  const badge = RANK_BADGE[entry.rank];
  return (
    <li
      data-testid={`arena-row-${entry.rank}`}
      className={`flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 transition-colors ${isMe ? 'bg-yellow-400/[0.06]' : 'hover:bg-white/[0.03]'}`}
    >
      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm
        ${badge ? `bg-gradient-to-br ${badge.bg}` : 'bg-white/5 border border-white/10 text-white/80'}`}
        style={badge ? { color: badge.text } : undefined}>
        {entry.rank}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm sm:text-[15px] font-bold text-white truncate">
            {entry.nickname || entry.player_address?.slice(0, 8)}
          </span>
          {isMe && <span className="text-[9px] tracking-[0.2em] font-bold text-yellow-300 bg-yellow-400/15 border border-yellow-400/30 rounded px-1.5 py-0.5">YOU</span>}
          {entry.is_streaming && (
            <span className="flex items-center gap-1 text-[9px] tracking-[0.2em] font-bold text-red-300 bg-red-500/15 border border-red-500/30 rounded px-1.5 py-0.5 uppercase">
              <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse" /> Live
            </span>
          )}
        </div>
        {entry.win_streak > 0 && (
          <div className="text-[10px] text-orange-300/80 font-mono mt-0.5 flex items-center gap-1">
            <Flame className="w-3 h-3" /> {entry.win_streak} streak
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className="font-mono font-bold tabular-nums text-yellow-200 text-base sm:text-lg leading-none">
          {(entry.points || 0).toLocaleString()}
        </div>
        <div className="text-[9px] tracking-[0.25em] font-mono text-white/40 uppercase mt-0.5">pts</div>
      </div>
    </li>
  );
};

/* ─── Prediction Panel ─── */
const PredictionPanel = ({ entries, myAddress, myPrediction, onPredict }) => {
  const candidates = entries.filter((e) => e.player_address !== myAddress).slice(0, 6);
  return (
    <section data-testid="arena-predictions" className="rounded-2xl border border-white/10 bg-[#0a0f24]/80 backdrop-blur overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-300" />
          <span className="text-xs font-bold tracking-wider uppercase text-white">Predict Winner</span>
        </div>
        <span className="text-[10px] font-mono text-amber-300/70">20 pts · 3x</span>
      </div>
      {myPrediction ? (
        <div className="p-3.5">
          <div className="text-[10px] tracking-[0.3em] font-mono text-white/40 uppercase mb-1">Your pick</div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white truncate">
              {entries.find((e) => e.player_address === myPrediction.target_address)?.nickname || myPrediction.target_address?.slice(0, 10)}
            </span>
            <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full ${myPrediction.status === 'pending' ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30' : myPrediction.status === 'won' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
              {myPrediction.status}
            </span>
          </div>
          <div className="text-[10px] text-white/50 mt-2">Settles at arena reset</div>
        </div>
      ) : candidates.length === 0 ? (
        <div className="py-6 px-4 text-center text-white/40 text-xs">Wait for more competitors to start predicting.</div>
      ) : (
        <ul className="p-2 space-y-1.5 max-h-56 overflow-auto">
          {candidates.map((c) => (
            <li key={c.id}>
              <button
                data-testid={`predict-btn-${c.rank}`}
                onClick={() => onPredict(c.player_address)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl bg-white/[0.03] hover:bg-amber-400/10 border border-white/10 hover:border-amber-400/40 transition-all text-left group"
              >
                <span className="w-6 text-center text-[10px] font-mono text-white/40">#{c.rank}</span>
                <span className="flex-1 text-sm font-bold text-white truncate">{c.nickname || c.player_address?.slice(0, 8)}</span>
                <span className="font-mono text-xs tabular-nums text-yellow-200">{(c.points || 0).toLocaleString()}</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-300/0 group-hover:text-amber-300 transition-colors" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

/* ─── Arena Chat ─── */
const ArenaChat = ({ playerAddress, playerNickname }) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const { data } = usePoll(`${API_URL}/api/arena/chat?limit=40`, 3500);
  const messages = data?.messages || [];
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`${API_URL}/api/arena/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: playerAddress, nickname: playerNickname, text: trimmed }),
      });
      const j = await res.json();
      if (!res.ok) { setErr(j.detail || 'Failed'); }
      else setText('');
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <section data-testid="arena-chat" className="rounded-2xl border border-white/10 bg-[#0a0f24]/80 backdrop-blur overflow-hidden flex flex-col h-[24rem]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-sky-300" />
          <span className="text-xs font-bold tracking-wider uppercase text-white">Arena Chat</span>
        </div>
        <span className="text-[10px] font-mono text-white/40">{messages.length} msgs</span>
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 hide-scrollbar">
        {messages.length === 0 ? (
          <div className="text-center text-white/30 text-xs py-8">No messages yet. Say hi!</div>
        ) : messages.map((m) => (
          <ChatRow key={m.id} msg={m} isMe={m.player_address === playerAddress} />
        ))}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex items-center gap-1.5 px-2 py-2 border-t border-white/5 shrink-0"
      >
        <input
          data-testid="arena-chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Drop a message"
          maxLength={220}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-yellow-400/50"
        />
        <button
          data-testid="arena-chat-send"
          type="submit"
          disabled={busy || !text.trim()}
          className="px-3 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-[#0b1738] font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
      {err && <div className="px-3 pb-2 text-[10px] text-red-300 font-mono shrink-0">{err}</div>}
    </section>
  );
};

const ChatRow = ({ msg, isMe }) => (
  <div className={`flex items-start gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
    <div className={`max-w-[80%] rounded-xl px-2.5 py-1.5 ${isMe ? 'bg-yellow-400/15 border border-yellow-400/30' : 'bg-white/[0.04] border border-white/5'}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-mono">
        <span className={`font-bold truncate ${isMe ? 'text-yellow-200' : 'text-sky-300'}`}>
          {msg.nickname || msg.player_address?.slice(0, 8)}
        </span>
        <span className={`text-[8px] tracking-wider uppercase px-1 py-px rounded ${msg.badge === 'competitor' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-white/40'}`}>
          {msg.badge}
        </span>
      </div>
      <div className="text-[13px] text-white/90 leading-snug break-words">{msg.text}</div>
    </div>
  </div>
);

/* ─── Stream Tease Strip + Modal (placeholder until Phase 2) ─── */
const STREAM_TEASES = [
  { name: 'RexLab',     rank: 1, viewers: 184, mic: true,  rarity: 'Mythic' },
  { name: 'MaxScience', rank: 4, viewers: 92,  mic: true,  rarity: 'Legendary' },
  { name: 'LunaShiba',  rank: 7, viewers: 41,  mic: false, rarity: 'Epic' },
  { name: 'NeonPup',    rank: 12, viewers: 18, mic: true,  rarity: 'Rare' },
];

const StreamTeaseStrip = ({ onClick }) => (
  <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-3 px-3 sm:-mx-6 sm:px-6 hide-scrollbar">
    {STREAM_TEASES.map((s, i) => (
      <button
        key={i}
        data-testid={`stream-tease-${i}`}
        onClick={onClick}
        className="shrink-0 w-44 sm:w-56 group rounded-2xl border border-white/10 hover:border-yellow-400/40 bg-gradient-to-b from-white/[0.04] to-white/[0.01] overflow-hidden transition-all hover:-translate-y-0.5 text-left"
      >
        <div className="relative aspect-video bg-gradient-to-br from-sky-900/60 to-[#0a0820] overflow-hidden">
          <div className="absolute inset-0 arena-pulse opacity-50"
               style={{ background: 'radial-gradient(ellipse at 30% 40%, rgba(56,189,248,0.45), transparent 65%)' }} />
          <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/85 text-white text-[9px] font-bold tracking-wider uppercase">
            <span className="w-1 h-1 rounded-full bg-white animate-pulse" /> Live
          </div>
          <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-mono">
            <Eye className="w-3 h-3" /> {s.viewers}
          </div>
          {s.mic && (
            <div className="absolute bottom-2 left-2 w-6 h-6 rounded-full bg-emerald-500/80 flex items-center justify-center">
              <Mic className="w-3 h-3 text-white" />
            </div>
          )}
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-amber-400/90 text-[#0b1738] text-[9px] font-bold tracking-wider uppercase">
            #{s.rank}
          </div>
        </div>
        <div className="px-2.5 py-2">
          <div className="text-xs font-bold text-white truncate">{s.name}</div>
          <div className="text-[10px] font-mono text-amber-300/80">Mixing {s.rarity}</div>
        </div>
      </button>
    ))}
  </div>
);

const StreamComingSoonModal = ({ onClose }) => (
  <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
    <div className="w-full max-w-sm rounded-2xl border border-yellow-400/40 bg-[#0a0f24] p-5 sm:p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
      <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center mb-3">
        <Radio className="w-7 h-7 text-[#0b1738]" />
      </div>
      <div className="text-[10px] tracking-[0.3em] font-mono font-bold text-yellow-300 uppercase mb-1">Coming v2.1</div>
      <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Bowlby One', system-ui, sans-serif", fontWeight: 400 }}>Live Streaming</h3>
      <p className="text-sm text-white/70 leading-relaxed">
        Go Live with screen broadcast + mic voice chat. Real-time spectator rooms. Coming with LiveKit infrastructure in the next drop.
      </p>
      <button
        data-testid="stream-modal-close"
        onClick={onClose}
        className="mt-5 w-full py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-[#0b1738] font-bold transition-colors"
      >
        Got it
      </button>
    </div>
  </div>
);

/* ─── Helpers ─── */
const SectionHeader = ({ icon, label, hint }) => (
  <div className="flex items-center justify-between mb-2 px-1">
    <div className="flex items-center gap-2">
      <span className="text-yellow-400/80">{icon}</span>
      <span className="text-xs sm:text-sm font-bold tracking-[0.2em] uppercase text-white">{label}</span>
    </div>
    {hint && <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">{hint}</span>}
  </div>
);

const LiveDot = () => (
  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/15 border border-red-500/40">
    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
    <span className="text-[9px] sm:text-[10px] tracking-[0.25em] font-mono font-bold text-red-300 uppercase">Live</span>
  </div>
);

/* ─── Inline styles ─── */
const ArenaStyles = () => (
  <style>{`
    .arena-grid {
      background-image:
        linear-gradient(rgba(250,204,21,0.06) 1px, transparent 1px),
        linear-gradient(90deg, rgba(250,204,21,0.06) 1px, transparent 1px);
      background-size: 48px 48px;
      mask-image: linear-gradient(to bottom, black 0%, black 60%, transparent 100%);
      -webkit-mask-image: linear-gradient(to bottom, black 0%, black 60%, transparent 100%);
    }
    .arena-scanline {
      background: repeating-linear-gradient(to bottom, rgba(255,255,255,0) 0, rgba(255,255,255,0) 3px, rgba(255,255,255,0.03) 4px);
    }
    @keyframes arena-pulse {
      0%,100% { opacity: 0.4; }
      50%     { opacity: 0.7; }
    }
    .arena-pulse { animation: arena-pulse 3.5s ease-in-out infinite; }

    .arena-join-btn {
      background: linear-gradient(180deg, #fde047 0%, #facc15 60%, #ca8a04 100%);
      color: #0b1738;
      border: 3px solid #0b1738;
      box-shadow: 0 5px 0 #422006, 0 10px 20px -5px rgba(250,204,21,0.5);
      transition: transform 0.18s ease, box-shadow 0.18s ease;
    }
    .arena-join-btn:not(:disabled):hover { transform: translateY(2px); box-shadow: 0 3px 0 #422006, 0 6px 14px -4px rgba(250,204,21,0.6); }
    .arena-join-btn:not(:disabled):active { transform: translateY(5px); box-shadow: 0 0 0 #422006, 0 4px 8px -3px rgba(250,204,21,0.4); }

    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `}</style>
);

export default LabArena;
