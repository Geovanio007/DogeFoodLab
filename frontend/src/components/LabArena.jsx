import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Trophy, Flame, Zap, Send, Users, Eye, Mic, Radio,
  TrendingUp, Target, Clock, Award, AlertTriangle,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

/* ============================================================
   DogeFood Lab — LAB ARENA (Phase 1)
   MyDoge WebView-hardened version.

   Fixes applied:
   ✅ No backdrop-filter / backdrop-blur (black on old WebView)
   ✅ No filter:blur() on layout elements (compositing crash)
   ✅ No mix-blend-mode (renders inverted/black)
   ✅ No Tailwind /opacity shorthand where WebView misreads it
   ✅ All transforms prefixed with -webkit-
   ✅ Flex prefixed with -webkit-flex where needed
   ✅ ArenaStyles inline CSS hardened with -webkit- prefixes
   ============================================================ */

const RANK_BADGE = {
  1: { bg: 'from-yellow-300 to-amber-500', text: '#0b1738' },
  2: { bg: 'from-slate-200 to-slate-400',  text: '#0b1738' },
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

/* ─── Hook: polled fetch ─── */
const usePoll = (url, intervalMs, options) => {
  const [data, setData] = useState(null);
  const [err, setErr]   = useState(null);
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    if (!url) return undefined;
    const tick = async () => {
      try {
        const res  = await fetch(url, options);
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
  const [joinError, setJoinError] = useState(null);

  // /api/arena/current returns { arena, entries, top, heat }
  // /api/arena/leaderboard returns { entries, top, total_entrants }
  // Poll /current for the arena object (prize_pool, ends_at, entries_count)
  // Poll /leaderboard separately at higher frequency for live score updates
  const currentPoll    = usePoll(`${API_URL}/api/arena/current`, 8000);
  const lbPoll         = usePoll(`${API_URL}/api/arena/leaderboard?limit=50`, 4000);
  const heatPoll       = usePoll(`${API_URL}/api/arena/heat`, 15000);
  const predictionPoll = usePoll(`${API_URL}/api/arena/prediction/${playerAddress}`, 8000);

  // arena metadata comes from /current; live entries from /leaderboard (fresher)
  const arena   = currentPoll.data?.arena;
  const entries = lbPoll.data?.entries || currentPoll.data?.entries || [];

  // Derive competitors count + prize pool from live entries when arena object is stale
  const competitorCount = entries.length || arena?.entries_count || 0;
  const prizePool       = competitorCount * 50; // 50pts entry fee per player
  const heat            = heatPoll.data?.event || currentPoll.data?.heat;
  const myPrediction    = predictionPoll.data?.prediction;

  const isJoined = useMemo(
    () => entries.some(
      (e) => e.player_address === playerAddress ||
             e.player_address?.toLowerCase() === playerAddress?.toLowerCase()
    ),
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
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center transition-colors"
          style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
          aria-label="Back to menu"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-[9px] sm:text-[10px] tracking-[0.35em] font-mono uppercase"
               style={{ color: 'rgba(253,224,71,0.8)' }}>
            Lab Arena · Live
          </div>
          <h1
            className="text-xl sm:text-3xl font-bold leading-tight truncate"
            style={{ fontFamily: "'Bowlby One', 'Fredoka', system-ui, sans-serif", fontWeight: 400 }}
          >
            Arena<span style={{ color: '#facc15' }}>.</span>
          </h1>
        </div>
        <LiveDot />
      </header>

      {/* Heat banner */}
      {heat && (
        <HeatEventBanner
          heat={heat}
          startedAt={heatPoll.data?.started_at}
          duration={heatPoll.data?.duration_min}
        />
      )}

      {/* Arena banner + prize pool */}
      <div className="relative z-10 px-3 sm:px-6">
        <ArenaBanner
          arena={arena}
          competitorCount={competitorCount}
          prizePool={prizePool}
          isJoined={isJoined}
          joinError={joinError}
          onJoin={async () => {
            setJoinError(null);
            try {
              const res = await fetch(`${API_URL}/api/arena/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: playerAddress, nickname: playerNickname }),
              });
              const j = await res.json();
              if (!res.ok) {
                setJoinError(j.detail || 'Failed to join arena');
              }
            } catch (e) { setJoinError(e.message); }
          }}
        />
      </div>

      {/* Streams placeholder */}
      <div className="relative z-10 px-3 sm:px-6 mt-4 sm:mt-6">
        <SectionHeader icon={<Radio className="w-3.5 h-3.5" />} label="Active Streams" hint="Preview · launching v2.1" />
        <StreamTeaseStrip onClick={() => setShowStreamModal(true)} />
      </div>

      {/* Main 2-col grid */}
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

/* ─── Atmospheric background ───
   ✅ No filter:blur on layout divs — glow uses opacity only
   ✅ No mix-blend-mode on scanline overlay                   */
const ArenaBackground = React.memo(({ heatColor }) => (
  <>
    {/* Deep space base */}
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #11203f 0%, #050917 55%, #02030a 100%)' }}
    />
    {/* Grid */}
    <div aria-hidden className="absolute inset-0 pointer-events-none arena-grid" style={{ opacity: 0.25 }} />
    {/* Top glow — radial gradient, reduced opacity, NO filter:blur */}
    <div
      aria-hidden
      className="absolute rounded-full pointer-events-none"
      style={{
        top: -128, left: '50%',
        width: '36rem', height: '36rem',
        WebkitTransform: 'translateX(-50%)',
        transform: 'translateX(-50%)',
        background: `radial-gradient(circle, ${heatColor || 'rgba(250,204,21,0.4)'} 0%, transparent 65%)`,
        opacity: 0.3,
      }}
    />
    {/* Scanline — NO mix-blend-mode (renders black in WebView) */}
    <div aria-hidden className="absolute inset-0 arena-scanline pointer-events-none" style={{ opacity: 0.15 }} />
  </>
));

/* ─── Heat Event Banner ─── */
const HeatEventBanner = ({ heat, startedAt, duration }) => {
  const now = useNow(1000);
  const endsAt = useMemo(() => {
    if (!startedAt) return null;
    return new Date(startedAt).getTime() + (duration || 30) * 60 * 1000;
  }, [startedAt, duration]);
  const remainingSec = endsAt ? Math.max(0, Math.floor((endsAt - now) / 1000)) : 0;

  return (
    <div
      data-testid="heat-banner"
      className="relative z-10 mx-3 sm:mx-6 mb-3 rounded-2xl overflow-hidden"
      style={{
        border: `2px solid ${heat.color}aa`,
        background: `linear-gradient(90deg, ${heat.color}25, transparent 60%)`,
      }}
    >
      {/* Left glow — solid gradient, no filter:blur */}
      <div
        className="absolute inset-0 pointer-events-none arena-pulse"
        style={{ background: `radial-gradient(ellipse at left, ${heat.color}40, transparent 70%)`, opacity: 0.35 }}
      />
      <div className="relative flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3">
        <div
          className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: heat.color + '33', border: `1.5px solid ${heat.color}` }}
        >
          <Flame className="w-5 h-5" style={{ color: heat.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="text-[9px] sm:text-[10px] tracking-[0.3em] font-mono font-bold uppercase"
              style={{ color: heat.color }}
            >
              Heat Event
            </span>
            <span className="text-[9px] sm:text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {heat.intensity?.toUpperCase()}
            </span>
          </div>
          <div className="text-sm sm:text-base font-bold text-white truncate">{heat.name}</div>
          <div className="text-[11px] sm:text-xs truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {heat.blurb}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[9px] tracking-[0.3em] font-mono uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Ends in
          </div>
          <div className="font-mono font-bold tabular-nums" style={{ color: '#fef9c3' }}>
            {formatHMS(remainingSec)}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Arena Banner ───
   ✅ No backdrop-blur-md — solid dark bg
   ✅ No filter:blur on decorative glow div                   */
const ArenaBanner = ({ arena, competitorCount, prizePool, isJoined, onJoin, joinError }) => {
  const now      = useNow(1000);

  // ends_at: try arena object first, fall back to next UTC midnight (arena resets daily)
  const endsAt = useMemo(() => {
    if (arena?.ends_at) return new Date(arena.ends_at).getTime();
    // Fallback: next UTC midnight so timer always shows something meaningful
    const tomorrow = new Date();
    tomorrow.setUTCHours(24, 0, 0, 0);
    return tomorrow.getTime();
  }, [arena?.ends_at]);

  const remaining = Math.max(0, Math.floor((endsAt - now) / 1000));

  return (
    <section
      data-testid="arena-banner"
      className="relative rounded-3xl overflow-hidden"
      style={{
        border: '2px solid rgba(250,204,21,0.4)',
        background: 'linear-gradient(135deg, rgba(13,20,48,0.98) 0%, rgba(10,15,36,0.98) 50%, rgba(6,9,26,0.98) 100%)',
        boxShadow: '0 8px 0 rgba(0,0,0,0.35), 0 20px 50px -15px rgba(250,204,21,0.4)',
      }}
    >
      {/* Top shimmer line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(to right, transparent, rgba(253,224,71,0.8), transparent)' }}
      />
      {/* Corner glow — radial gradient, NO filter:blur */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          top: -80, right: -80,
          width: 256, height: 256,
          background: 'radial-gradient(circle, rgba(250,204,21,0.45) 0%, transparent 70%)',
          opacity: 0.35,
        }}
      />
      <div className="relative grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 sm:gap-6 px-4 sm:px-6 py-4 sm:py-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            <span
              className="text-[10px] sm:text-xs tracking-[0.3em] font-mono font-bold uppercase"
              style={{ color: '#fde047' }}
            >
              24h Arena · {competitorCount} competitors
            </span>
          </div>
          <h2
            className="text-2xl sm:text-3xl font-bold text-white mb-1 leading-tight"
            style={{ fontFamily: "'Bowlby One', 'Fredoka', system-ui, sans-serif", fontWeight: 400 }}
          >
            Prize Pool
          </h2>
          <div className="flex items-baseline gap-2 mb-2">
            <span
              className="text-4xl sm:text-5xl font-bold tabular-nums"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: '#facc15',
                textShadow: '0 0 20px rgba(250,204,21,0.5)',
              }}
            >
              {(prizePool || arena?.prize_pool || 0).toLocaleString()}
            </span>
            <span className="text-sm sm:text-base font-mono font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>
              PTS
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] sm:text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
            <Clock className="w-3.5 h-3.5" />
            <span>
              Resets in{' '}
              <span className="text-white font-mono font-bold">{formatHMS(remaining)}</span>
            </span>
          </div>
        </div>

        <div className="flex flex-col items-stretch sm:items-end gap-2">
          <button
            data-testid="arena-join-btn"
            onClick={onJoin}
            disabled={isJoined}
            className={`arena-join-btn relative px-5 sm:px-7 py-3 sm:py-3.5 rounded-2xl font-bold text-sm sm:text-base whitespace-nowrap ${isJoined ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Trophy className="w-4 h-4" />
              {isJoined ? 'Joined' : 'Join Arena · 50 pts'}
            </span>
          </button>
          {!isJoined && !joinError && (
            <div
              className="text-[10px] text-center sm:text-right font-mono"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              Entry fee adds to pool
            </div>
          )}
          {joinError && (
            <div
              className="text-[10px] text-center sm:text-right font-mono px-2 py-1.5 rounded-xl"
              style={{
                color: '#fca5a5',
                backgroundColor: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.3)',
                maxWidth: 200,
              }}
            >
              {joinError}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

/* ─── Leaderboard ───
   ✅ No backdrop-blur — solid dark bg                        */
const LeaderboardCard = ({ entries, myAddress }) => (
  <section
    data-testid="arena-leaderboard"
    className="rounded-2xl overflow-hidden"
    style={{ border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(10,15,36,0.92)' }}
  >
    <div
      className="flex items-center justify-between px-4 py-3"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="flex items-center gap-2">
        <Trophy className="w-4 h-4 text-yellow-400" />
        <span className="text-xs sm:text-sm font-bold tracking-wider uppercase text-white">Live Leaderboard</span>
      </div>
      <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
        {entries.length} live
      </span>
    </div>
    {entries.length === 0 ? (
      <div className="py-10 text-center text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
        <Users className="w-6 h-6 mx-auto mb-2" style={{ opacity: 0.5 }} />
        No competitors yet. Be the first to enter.
      </div>
    ) : (
      <ul style={{ borderTop: 'none' }}>
        {entries.map((e) => (
          <LeaderboardRow key={e.id} entry={e} isMe={e.player_address === myAddress} />
        ))}
      </ul>
    )}
  </section>
);

const LeaderboardRow = ({ entry, isMe }) => {
  const badge = RANK_BADGE[entry.rank];
  return (
    <li
      data-testid={`arena-row-${entry.rank}`}
      className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 transition-colors"
      style={{
        backgroundColor: isMe ? 'rgba(250,204,21,0.06)' : 'transparent',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm
          ${badge ? `bg-gradient-to-br ${badge.bg}` : ''}`}
        style={
          badge
            ? { color: badge.text }
            : { backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }
        }
      >
        {entry.rank}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm sm:text-[15px] font-bold text-white truncate">
            {entry.nickname || entry.player_address?.slice(0, 8)}
          </span>
          {isMe && (
            <span
              className="text-[9px] tracking-[0.2em] font-bold rounded px-1.5 py-0.5"
              style={{ color: '#fde047', backgroundColor: 'rgba(250,204,21,0.15)', border: '1px solid rgba(250,204,21,0.3)' }}
            >
              YOU
            </span>
          )}
          {entry.is_streaming && (
            <span
              className="flex items-center gap-1 text-[9px] tracking-[0.2em] font-bold rounded px-1.5 py-0.5 uppercase"
              style={{ color: '#fca5a5', backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse" /> Live
            </span>
          )}
        </div>
        {entry.win_streak > 0 && (
          <div className="text-[10px] font-mono mt-0.5 flex items-center gap-1" style={{ color: 'rgba(253,186,116,0.8)' }}>
            <Flame className="w-3 h-3" /> {entry.win_streak} streak
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        <div
          className="font-mono font-bold tabular-nums text-base sm:text-lg leading-none"
          style={{ color: '#fef9c3' }}
        >
          {(entry.points || 0).toLocaleString()}
        </div>
        <div
          className="text-[9px] tracking-[0.25em] font-mono uppercase mt-0.5"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          arena pts
        </div>
      </div>
    </li>
  );
};

/* ─── Prediction Panel ───
   ✅ No backdrop-blur — solid dark bg                        */
const PredictionPanel = ({ entries, myAddress, myPrediction, onPredict }) => {
  const candidates = entries.filter((e) => e.player_address !== myAddress).slice(0, 6);
  return (
    <section
      data-testid="arena-predictions"
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(10,15,36,0.92)' }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4" style={{ color: '#fcd34d' }} />
          <span className="text-xs font-bold tracking-wider uppercase text-white">Predict Winner</span>
        </div>
        <span className="text-[10px] font-mono" style={{ color: 'rgba(253,211,77,0.7)' }}>
          20 pts · 3x
        </span>
      </div>

      {myPrediction ? (
        <div className="p-3.5">
          <div
            className="text-[10px] tracking-[0.3em] font-mono uppercase mb-1"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            Your pick
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white truncate">
              {entries.find((e) => e.player_address === myPrediction.target_address)?.nickname
                || myPrediction.target_address?.slice(0, 10)}
            </span>
            <span
              className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full"
              style={
                myPrediction.status === 'pending'
                  ? { color: '#fcd34d', backgroundColor: 'rgba(250,204,21,0.15)', border: '1px solid rgba(250,204,21,0.3)' }
                  : myPrediction.status === 'won'
                  ? { color: '#6ee7b7', backgroundColor: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)' }
                  : { color: '#fca5a5', backgroundColor: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)' }
              }
            >
              {myPrediction.status}
            </span>
          </div>
          <div className="text-[10px] mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Settles at arena reset
          </div>
        </div>
      ) : candidates.length === 0 ? (
        <div className="py-6 px-4 text-center text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Wait for more competitors to start predicting.
        </div>
      ) : (
        <ul className="p-2 space-y-1.5 max-h-56 overflow-auto">
          {candidates.map((c) => (
            <li key={c.id}>
              <button
                data-testid={`predict-btn-${c.rank}`}
                onClick={() => onPredict(c.player_address)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl transition-all text-left group"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(250,204,21,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(250,204,21,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                }}
              >
                <span className="w-6 text-center text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  #{c.rank}
                </span>
                <span className="flex-1 text-sm font-bold text-white truncate">
                  {c.nickname || c.player_address?.slice(0, 8)}
                </span>
                <span className="font-mono text-xs tabular-nums" style={{ color: '#fef9c3' }}>
                  {(c.points || 0).toLocaleString()}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

/* ─── Arena Chat ───
   ✅ No backdrop-blur — solid dark bg                        */
const ArenaChat = ({ playerAddress, playerNickname }) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState(null);
  const { data } = usePoll(`${API_URL}/api/arena/chat?limit=40`, 3500);
  const messages = data?.messages || [];
  const listRef  = useRef(null);

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
      if (!res.ok) setErr(j.detail || 'Failed');
      else setText('');
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <section
      data-testid="arena-chat"
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        border: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(10,15,36,0.92)',
        height: '24rem',
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" style={{ color: '#7dd3fc' }} />
          <span className="text-xs font-bold tracking-wider uppercase text-white">Arena Chat</span>
        </div>
        <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {messages.length} msgs
        </span>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 hide-scrollbar">
        {messages.length === 0 ? (
          <div className="text-center text-xs py-8" style={{ color: 'rgba(255,255,255,0.3)' }}>
            No messages yet. Say hi!
          </div>
        ) : (
          messages.map((m) => (
            <ChatRow key={m.id} msg={m} isMe={m.player_address === playerAddress} />
          ))
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex items-center gap-1.5 px-2 py-2 shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <input
          data-testid="arena-chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Drop a message"
          maxLength={220}
          className="flex-1 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
          style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(250,204,21,0.5)'; }}
          onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
        />
        <button
          data-testid="arena-chat-send"
          type="submit"
          disabled={busy || !text.trim()}
          className="px-3 py-2 rounded-xl font-bold shrink-0 transition-colors"
          style={{ backgroundColor: '#facc15', color: '#0b1738' }}
          onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#fde047'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#facc15'; }}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {err && (
        <div className="px-3 pb-2 text-[10px] font-mono shrink-0" style={{ color: '#fca5a5' }}>
          {err}
        </div>
      )}
    </section>
  );
};

const ChatRow = ({ msg, isMe }) => (
  <div className={`flex items-start gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
    <div
      className="max-w-[80%] rounded-xl px-2.5 py-1.5"
      style={
        isMe
          ? { backgroundColor: 'rgba(250,204,21,0.15)', border: '1px solid rgba(250,204,21,0.3)' }
          : { backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }
      }
    >
      <div className="flex items-center gap-1.5 text-[10px] font-mono">
        <span className={`font-bold truncate ${isMe ? '' : ''}`}
              style={{ color: isMe ? '#fef9c3' : '#7dd3fc' }}>
          {msg.nickname || msg.player_address?.slice(0, 8)}
        </span>
        <span
          className="text-[8px] tracking-wider uppercase px-1 py-px rounded"
          style={
            msg.badge === 'competitor'
              ? { backgroundColor: 'rgba(16,185,129,0.15)', color: '#6ee7b7' }
              : { backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }
          }
        >
          {msg.badge}
        </span>
      </div>
      <div className="text-[13px] leading-snug break-words" style={{ color: 'rgba(255,255,255,0.9)' }}>
        {msg.text}
      </div>
    </div>
  </div>
);

/* ─── Stream Tease Strip ───
   ✅ No backdrop-blur
   ✅ Glow overlay uses solid rgba, no filter:blur              */
const STREAM_TEASES = [
  { name: 'RexLab',     rank: 1,  viewers: 184, mic: true,  rarity: 'Mythic' },
  { name: 'MaxScience', rank: 4,  viewers: 92,  mic: true,  rarity: 'Legendary' },
  { name: 'LunaShiba',  rank: 7,  viewers: 41,  mic: false, rarity: 'Epic' },
  { name: 'NeonPup',    rank: 12, viewers: 18,  mic: true,  rarity: 'Rare' },
];

const StreamTeaseStrip = ({ onClick }) => (
  <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-3 px-3 sm:-mx-6 sm:px-6 hide-scrollbar">
    {STREAM_TEASES.map((s, i) => (
      <button
        key={i}
        data-testid={`stream-tease-${i}`}
        onClick={onClick}
        className="shrink-0 w-44 sm:w-56 rounded-2xl overflow-hidden transition-all text-left"
        style={{ border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(250,204,21,0.4)';
          e.currentTarget.style.WebkitTransform = 'translateY(-2px)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
          e.currentTarget.style.WebkitTransform = 'translateY(0)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <div
          className="relative overflow-hidden"
          style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg, rgba(12,40,70,0.8) 0%, rgba(10,8,32,1) 100%)' }}
        >
          {/* Glow — solid radial, no filter:blur */}
          <div
            className="absolute inset-0 arena-pulse"
            style={{ background: 'radial-gradient(ellipse at 30% 40%, rgba(56,189,248,0.3) 0%, transparent 65%)', opacity: 0.5 }}
          />
          {/* LIVE badge */}
          <div
            className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded text-white text-[9px] font-bold tracking-wider uppercase"
            style={{ backgroundColor: 'rgba(239,68,68,0.85)' }}
          >
            <span className="w-1 h-1 rounded-full bg-white animate-pulse" /> Live
          </div>
          {/* Viewer count */}
          <div
            className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded text-white text-[10px] font-mono"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          >
            <Eye className="w-3 h-3" /> {s.viewers}
          </div>
          {/* Mic indicator */}
          {s.mic && (
            <div
              className="absolute bottom-2 left-2 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(16,185,129,0.8)' }}
            >
              <Mic className="w-3 h-3 text-white" />
            </div>
          )}
          {/* Rank badge */}
          <div
            className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase"
            style={{ backgroundColor: 'rgba(250,204,21,0.9)', color: '#0b1738' }}
          >
            #{s.rank}
          </div>
        </div>
        <div className="px-2.5 py-2">
          <div className="text-xs font-bold text-white truncate">{s.name}</div>
          <div className="text-[10px] font-mono" style={{ color: 'rgba(253,211,77,0.8)' }}>
            Mixing {s.rarity}
          </div>
        </div>
      </button>
    ))}
  </div>
);

/* ─── Stream Coming Soon Modal ───
   ✅ No backdrop-blur-sm — solid dark overlay                 */
const StreamComingSoonModal = ({ onClose }) => (
  <div
    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
    onClick={onClose}
  >
    <div
      className="w-full max-w-sm rounded-2xl p-5 sm:p-6 text-center shadow-2xl"
      style={{ border: '1px solid rgba(250,204,21,0.4)', backgroundColor: '#0a0f24' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3"
        style={{ background: 'linear-gradient(135deg, #facc15 0%, #f59e0b 100%)' }}
      >
        <Radio className="w-7 h-7" style={{ color: '#0b1738' }} />
      </div>
      <div
        className="text-[10px] tracking-[0.3em] font-mono font-bold uppercase mb-1"
        style={{ color: '#fde047' }}
      >
        Coming v2.1
      </div>
      <h3
        className="text-xl font-bold text-white mb-2"
        style={{ fontFamily: "'Bowlby One', system-ui, sans-serif", fontWeight: 400 }}
      >
        Live Streaming
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
        Go Live with screen broadcast + mic voice chat. Real-time spectator rooms.
        Coming with LiveKit infrastructure in the next drop.
      </p>
      <button
        data-testid="stream-modal-close"
        onClick={onClose}
        className="mt-5 w-full py-2.5 rounded-xl font-bold transition-colors"
        style={{ backgroundColor: '#facc15', color: '#0b1738' }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fde047'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#facc15'; }}
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
      <span style={{ color: 'rgba(250,204,21,0.8)' }}>{icon}</span>
      <span className="text-xs sm:text-sm font-bold tracking-[0.2em] uppercase text-white">{label}</span>
    </div>
    {hint && (
      <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
        {hint}
      </span>
    )}
  </div>
);

const LiveDot = () => (
  <div
    className="flex items-center gap-1.5 px-2 py-1 rounded-full"
    style={{ backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)' }}
  >
    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
    <span
      className="text-[9px] sm:text-[10px] tracking-[0.25em] font-mono font-bold uppercase"
      style={{ color: '#fca5a5' }}
    >
      Live
    </span>
  </div>
);

/* ─── Inline styles ───
   ✅ All animations use -webkit- prefixes
   ✅ No mix-blend-mode on scanline
   ✅ arena-join-btn uses -webkit-transform                    */
const ArenaStyles = () => (
  <style>{`
    .arena-grid {
      background-image:
        linear-gradient(rgba(250,204,21,0.06) 1px, transparent 1px),
        linear-gradient(90deg, rgba(250,204,21,0.06) 1px, transparent 1px);
      background-size: 48px 48px;
      -webkit-mask-image: linear-gradient(to bottom, black 0%, black 60%, transparent 100%);
      mask-image: linear-gradient(to bottom, black 0%, black 60%, transparent 100%);
    }
    /* Scanline: NO mix-blend-mode (renders inverted/black in WebView) */
    .arena-scanline {
      background: repeating-linear-gradient(
        to bottom,
        rgba(255,255,255,0) 0,
        rgba(255,255,255,0) 3px,
        rgba(255,255,255,0.025) 4px
      );
    }
    @keyframes arena-pulse {
      0%,100% { opacity: 0.4; }
      50%     { opacity: 0.7; }
    }
    .arena-pulse {
      -webkit-animation: arena-pulse 3.5s ease-in-out infinite;
      animation: arena-pulse 3.5s ease-in-out infinite;
    }

    /* Join button — -webkit-transform for old WebView */
    .arena-join-btn {
      background: -webkit-linear-gradient(top, #fde047 0%, #facc15 60%, #ca8a04 100%);
      background: linear-gradient(180deg, #fde047 0%, #facc15 60%, #ca8a04 100%);
      color: #0b1738;
      border: 3px solid #0b1738;
      -webkit-box-shadow: 0 5px 0 #422006, 0 10px 20px -5px rgba(250,204,21,0.5);
      box-shadow: 0 5px 0 #422006, 0 10px 20px -5px rgba(250,204,21,0.5);
      -webkit-transition: -webkit-transform 0.18s ease, box-shadow 0.18s ease;
      transition: transform 0.18s ease, box-shadow 0.18s ease;
    }
    .arena-join-btn:not(:disabled):hover {
      -webkit-transform: translateY(2px);
      transform: translateY(2px);
      -webkit-box-shadow: 0 3px 0 #422006, 0 6px 14px -4px rgba(250,204,21,0.6);
      box-shadow: 0 3px 0 #422006, 0 6px 14px -4px rgba(250,204,21,0.6);
    }
    .arena-join-btn:not(:disabled):active {
      -webkit-transform: translateY(5px);
      transform: translateY(5px);
      -webkit-box-shadow: 0 0 0 #422006, 0 4px 8px -3px rgba(250,204,21,0.4);
      box-shadow: 0 0 0 #422006, 0 4px 8px -3px rgba(250,204,21,0.4);
    }

    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    @media (prefers-reduced-motion: reduce) {
      .arena-pulse { -webkit-animation: none !important; animation: none !important; }
    }
  `}</style>
);

export default LabArena;
