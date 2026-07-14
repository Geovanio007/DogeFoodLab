import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Flame, TrendingUp, Trophy, Clock, Sparkles } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

/* ============================================================
   DogeFood Lab — LAB SURGE
   Free daily crash-chart mini-game. No stake, no loss — ride the
   multiplier, cash out for bonus Points, or let it crash and still
   keep a small floor payout. One free run every 24h.

   MyDoge WebView-hardened, following the same rules LabArena.jsx
   established:
   ✅ No backdrop-filter / backdrop-blur
   ✅ No filter:blur() on layout elements
   ✅ No mix-blend-mode
   ✅ All custom animations carry -webkit- prefixes
   ============================================================ */

// Must mirror the backend's _lab_surge_multiplier_at() exactly —
// same formula, same constants — so the number a player sees when
// they tap Cash Out closely matches what the server independently
// re-derives from its own clock.
const TIME_CONSTANT = 12.0;
const MAX_MULTIPLIER = 50.0;
const multiplierAt = (elapsedSeconds) => {
  const raw = Math.exp(Math.max(0, elapsedSeconds) / TIME_CONSTANT);
  return Math.round(Math.min(raw, MAX_MULTIPLIER) * 100) / 100;
};

const fmtX = (v) => `${v.toFixed(2)}x`;

const formatHM = (totalHours) => {
  const h = Math.floor(totalHours);
  const m = Math.round((totalHours - h) * 60);
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
};

/* ─── Points coin icon — same SVG as PointsSwapWidget.jsx so the
   currency reads consistently everywhere it appears ─── */
const PointsCoinIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="16" fill="url(#surge-coin-grad)" />
    <circle cx="16" cy="16" r="13" fill="url(#surge-coin-inner)" />
    <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
    <path d="M9 9.5 A9 9 0 0 1 23 9.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <text x="16" y="21" textAnchor="middle" fill="rgba(255,255,255,0.95)" fontSize="11" fontWeight="800" fontFamily="system-ui">P</text>
    <defs>
      <linearGradient id="surge-coin-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#facc15" />
        <stop offset="50%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="surge-coin-inner" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
    </defs>
  </svg>
);

/* ─── Live candle chart — plain divs, no SVG filters, no blend modes.
   Height scales against the highest value seen so far this run, so
   the chart keeps "filling the frame" as the multiplier climbs. ─── */
const CandleChart = ({ candles, phase }) => {
  const maxVal = Math.max(1.4, ...candles.map((c) => c.value));
  return (
    <div className="relative h-40 sm:h-48 rounded-xl bg-[#0b0f1a] border border-white/[0.06] overflow-hidden px-2 pb-2 pt-3">
      <div className="ls-grid absolute inset-0 pointer-events-none" />
      <div className="relative h-full flex items-end gap-[3px]">
        {candles.map((c, i) => {
          const heightPct = Math.max(4, (c.value / maxVal) * 100);
          const isLast = i === candles.length - 1;
          return (
            <div
              key={c.id}
              className="flex-1 min-w-[3px] rounded-sm ls-candle"
              style={{
                height: `${heightPct}%`,
                background: c.up ? '#22c55e' : '#ef4444',
                opacity: isLast ? 1 : 0.85,
                boxShadow: isLast && phase === 'running' ? `0 0 10px ${c.up ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)'}` : 'none',
              }}
            />
          );
        })}
      </div>
      {phase === 'crashed' && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#3f0d0d] ls-crash-flash">
          <span className="text-red-300 font-black text-lg tracking-wide">RUGGED</span>
        </div>
      )}
    </div>
  );
};

/* ─── Stat strip — adapted from a per-round arcade stat bar to a
   once-a-day cadence: personal-best framing instead of "last 100". ─── */
const StatStrip = ({ history, bestMultiplier }) => {
  const tiers = [2, 10, 25, 50];
  const counts = tiers.map((t) => history.filter((h) => h.won && h.multiplier >= t).length);
  return (
    <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
      <div className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
        <Trophy className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-[11px] font-bold text-white">{bestMultiplier ? fmtX(bestMultiplier) : '—'}</span>
        <span className="text-[9px] text-slate-500">best</span>
      </div>
      {tiers.map((t, i) => (
        <div key={t} className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
          <span className="text-[10px] font-bold text-amber-300">{t}x</span>
          <span className="text-[11px] font-bold text-white">{counts[i]}</span>
        </div>
      ))}
      <div className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
        <span className="text-[9px] text-slate-500">runs</span>
        <span className="text-[11px] font-bold text-white">{history.length}</span>
      </div>
    </div>
  );
};

const LabSurge = ({ playerAddress = 'GUEST_USER' }) => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('loading'); // loading | ready | cooldown | running | result
  const [status, setStatus] = useState(null);
  const [runId, setRunId] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [liveMultiplier, setLiveMultiplier] = useState(1.0);
  const [candles, setCandles] = useState([]);
  const [result, setResult] = useState(null); // { won, multiplier, points_awarded }
  const [busy, setBusy] = useState(false);

  const tickRef = useRef(null);
  const peekRef = useRef(null);
  const tickCountRef = useRef(0);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/lab-surge/status/${playerAddress}`);
      if (!res.ok) return;
      const data = await res.json();
      setStatus(data);
      if (data.active_run_id) {
        // A run was left open — jump straight into it so it can resolve
        setRunId(data.active_run_id);
        setPhase('running');
      } else {
        setPhase(data.can_play ? 'ready' : 'cooldown');
      }
    } catch (e) {
      console.warn('[LabSurge] status fetch failed:', e?.message || e);
      setPhase('ready');
    }
  }, [playerAddress]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const stopTimers = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (peekRef.current) clearInterval(peekRef.current);
    tickRef.current = null;
    peekRef.current = null;
  }, []);

  useEffect(() => () => stopTimers(), [stopTimers]);

  const finishRun = useCallback((status_, payload) => {
    stopTimers();
    setResult(payload);
    setPhase(status_ === 'cashed_out' ? 'result-won' : 'result-crashed');
    loadStatus();
  }, [stopTimers, loadStatus]);

  const beginTicking = useCallback((startedAtIso, existingRunId) => {
    const startMs = new Date(startedAtIso).getTime();
    tickCountRef.current = 0;
    setCandles([{ id: 0, value: 1.0, up: true }]);

    tickRef.current = setInterval(() => {
      const elapsed = (Date.now() - startMs) / 1000;
      const m = multiplierAt(elapsed);
      setLiveMultiplier(m);
      tickCountRef.current += 1;
      if (tickCountRef.current % 4 === 0) {
        setCandles((prev) => {
          const jitter = m * (1 + (Math.random() - 0.5) * 0.06);
          const last = prev[prev.length - 1];
          const next = { id: prev.length, value: Math.max(1.0, jitter), up: jitter >= (last?.value || 1) };
          const arr = [...prev, next];
          return arr.length > 32 ? arr.slice(arr.length - 32) : arr;
        });
      }
    }, 100);

    peekRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/lab-surge/peek`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ run_id: existingRunId }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.crashed) {
          finishRun('crashed', { won: false, multiplier: data.crash_multiplier, points_awarded: data.points_awarded });
        }
      } catch (e) {
        console.warn('[LabSurge] peek failed (non-fatal):', e?.message || e);
      }
    }, 1300);
  }, [finishRun]);

  // Resume an already-active run (e.g. reloaded mid-flight)
  useEffect(() => {
    if (phase === 'running' && runId && !tickRef.current && status?.active_run_id === runId) {
      // We don't have the original started_at for a resumed run from /status,
      // so re-derive a safe start reference: assume "now" — worst case the
      // displayed number is briefly conservative until the next peek() syncs it.
      beginTicking(new Date().toISOString(), runId);
    }
  }, [phase, runId]);

  const handleStart = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/lab-surge/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_address: playerAddress }),
      });
      if (res.status === 429) {
        await loadStatus();
        setBusy(false);
        return;
      }
      if (!res.ok) throw new Error('start failed');
      const data = await res.json();
      setRunId(data.run_id);
      setStartedAt(data.started_at);
      setResult(null);
      setLiveMultiplier(1.0);
      setPhase('running');
      beginTicking(data.started_at, data.run_id);
    } catch (e) {
      console.warn('[LabSurge] start failed:', e?.message || e);
    } finally {
      setBusy(false);
    }
  };

  const handleCashout = async () => {
    if (busy || !runId) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/lab-surge/cashout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_id: runId }),
      });
      const data = await res.json();
      finishRun(data.status, data);
    } catch (e) {
      console.warn('[LabSurge] cashout failed:', e?.message || e);
    } finally {
      setBusy(false);
    }
  };

  const history = status?.history || [];
  const bestMultiplier = history.reduce((m, h) => (h.won && h.multiplier > m ? h.multiplier : m), 0);

  return (
    <div className="min-h-screen bg-[#0a0e17] text-white pb-8">
      <LabSurgeStyles />
      <div className="sticky top-0 z-20 bg-[#0a0e17]/95 border-b border-white/[0.06] px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/5">
          <ChevronLeft className="w-5 h-5 text-slate-300" />
        </button>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center">
          <TrendingUp className="w-4.5 h-4.5 text-[#3f1d00]" />
        </div>
        <div className="flex-1">
          <h1 className="text-base font-black leading-none">Lab Surge</h1>
          <p className="text-[10px] text-slate-500 mt-0.5">Free daily run · no risk, ever</p>
        </div>
        <Flame className="w-4 h-4 text-orange-400 ls-pulse" />
      </div>

      <div className="px-4 pt-4 max-w-md mx-auto">
        {status && <StatStrip history={history} bestMultiplier={bestMultiplier} />}

        <div className="mt-3">
          <CandleChart candles={candles.length ? candles : [{ id: 0, value: 1, up: true }]} phase={phase === 'result-crashed' ? 'crashed' : phase} />
        </div>

        <div className="mt-4 text-center">
          {(phase === 'running') && (
            <div className={`text-5xl font-black tabular-nums ${liveMultiplier >= 2 ? 'text-emerald-400' : 'text-white'}`}
              style={{ textShadow: '0 0 24px rgba(250,204,21,0.25)' }}>
              {fmtX(liveMultiplier)}
            </div>
          )}
          {phase !== 'running' && (
            <div className="text-5xl font-black tabular-nums text-slate-700">1.00x</div>
          )}
        </div>

        <div className="mt-5">
          {phase === 'loading' && (
            <div className="h-14 rounded-2xl bg-white/5 animate-pulse" />
          )}

          {phase === 'ready' && (
            <button onClick={handleStart} disabled={busy} className="w-full ls-start-btn rounded-2xl py-4 font-black text-lg disabled:opacity-60">
              {busy ? 'Starting…' : 'Start Free Surge'}
            </button>
          )}

          {phase === 'cooldown' && (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] py-4 px-4 text-center">
              <Clock className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
              <p className="text-sm font-bold text-slate-300">Already ran the surge today</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Next free run in {status?.hours_remaining != null ? formatHM(status.hours_remaining) : '—'}
              </p>
            </div>
          )}

          {phase === 'running' && (
            <button onClick={handleCashout} disabled={busy} className="w-full ls-cashout-btn rounded-2xl py-4 font-black text-lg disabled:opacity-60">
              {busy ? 'Cashing out…' : `Cash Out · +${Math.round(10 * liveMultiplier)} Points`}
            </button>
          )}

          {(phase === 'result-won' || phase === 'result-crashed') && result && (
            <div className={`rounded-2xl border p-4 text-center ${phase === 'result-won' ? 'border-emerald-500/30 bg-emerald-500/[0.06]' : 'border-red-500/25 bg-red-500/[0.05]'}`}>
              {phase === 'result-won' ? (
                <>
                  <Sparkles className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
                  <p className="text-sm text-slate-300">Cashed out at <span className="font-bold text-white">{fmtX(result.multiplier)}</span></p>
                  <div className="flex items-center justify-center gap-1.5 mt-1.5">
                    <PointsCoinIcon size={20} />
                    <span className="text-2xl font-black text-emerald-400">+{result.points_awarded}</span>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-300">Crashed at <span className="font-bold text-red-300">{fmtX(result.multiplier)}</span></p>
                  <div className="flex items-center justify-center gap-1.5 mt-1.5">
                    <PointsCoinIcon size={20} />
                    <span className="text-2xl font-black text-slate-300">+{result.points_awarded}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Floor payout — you never lose what you didn't have to lose</p>
                </>
              )}
              <p className="text-[11px] text-slate-500 mt-3">Come back in 24h for another free run</p>
            </div>
          )}
        </div>

        <p className="text-[10px] text-slate-600 text-center mt-5 leading-relaxed">
          Lab Surge is 100% free to play — nothing is ever deducted from your
          balance. One run every 24 hours; cash out any time before it crashes
          to bank a bigger reward, or let it ride for a shot at more.
        </p>
      </div>
    </div>
  );
};

/* ─── Inline styles ───
   ✅ All animations use -webkit- prefixes
   ✅ No mix-blend-mode, no backdrop-filter, no filter:blur()          */
const LabSurgeStyles = () => (
  <style>{`
    .ls-grid {
      background-image:
        linear-gradient(rgba(250,204,21,0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(250,204,21,0.05) 1px, transparent 1px);
      background-size: 24px 24px;
    }
    @keyframes ls-pulse {
      0%,100% { opacity: 0.55; }
      50%     { opacity: 1; }
    }
    .ls-pulse {
      -webkit-animation: ls-pulse 2s ease-in-out infinite;
      animation: ls-pulse 2s ease-in-out infinite;
    }
    @keyframes ls-candle-in {
      0%   { -webkit-transform: scaleY(0.6); transform: scaleY(0.6); opacity: 0.4; }
      100% { -webkit-transform: scaleY(1);   transform: scaleY(1);   opacity: 1; }
    }
    .ls-candle {
      -webkit-transform-origin: bottom;
      transform-origin: bottom;
      -webkit-animation: ls-candle-in 220ms ease-out;
      animation: ls-candle-in 220ms ease-out;
      -webkit-transition: height 180ms ease, box-shadow 180ms ease;
      transition: height 180ms ease, box-shadow 180ms ease;
    }
    @keyframes ls-crash-flash {
      0%   { opacity: 0; }
      15%  { opacity: 1; }
      100% { opacity: 0.92; }
    }
    .ls-crash-flash {
      -webkit-animation: ls-crash-flash 380ms ease-out;
      animation: ls-crash-flash 380ms ease-out;
    }
    .ls-start-btn {
      background: -webkit-linear-gradient(top, #fde047 0%, #facc15 60%, #ca8a04 100%);
      background: linear-gradient(180deg, #fde047 0%, #facc15 60%, #ca8a04 100%);
      color: #0b1738;
      border: 3px solid #0b1738;
      -webkit-box-shadow: 0 5px 0 #422006, 0 10px 20px -5px rgba(250,204,21,0.5);
      box-shadow: 0 5px 0 #422006, 0 10px 20px -5px rgba(250,204,21,0.5);
      -webkit-transition: -webkit-transform 0.18s ease, box-shadow 0.18s ease;
      transition: transform 0.18s ease, box-shadow 0.18s ease;
    }
    .ls-start-btn:not(:disabled):active {
      -webkit-transform: translateY(4px);
      transform: translateY(4px);
      -webkit-box-shadow: 0 1px 0 #422006, 0 4px 10px -4px rgba(250,204,21,0.5);
      box-shadow: 0 1px 0 #422006, 0 4px 10px -4px rgba(250,204,21,0.5);
    }
    .ls-cashout-btn {
      background: -webkit-linear-gradient(top, #4ade80 0%, #22c55e 60%, #15803d 100%);
      background: linear-gradient(180deg, #4ade80 0%, #22c55e 60%, #15803d 100%);
      color: #05260f;
      border: 3px solid #05260f;
      -webkit-box-shadow: 0 5px 0 #052e16, 0 10px 24px -5px rgba(34,197,94,0.55);
      box-shadow: 0 5px 0 #052e16, 0 10px 24px -5px rgba(34,197,94,0.55);
      -webkit-animation: ls-pulse 1.4s ease-in-out infinite;
      animation: ls-pulse 1.4s ease-in-out infinite;
      -webkit-transition: -webkit-transform 0.15s ease, box-shadow 0.15s ease;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .ls-cashout-btn:not(:disabled):active {
      -webkit-transform: translateY(4px);
      transform: translateY(4px);
    }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    @media (prefers-reduced-motion: reduce) {
      .ls-pulse, .ls-candle, .ls-crash-flash, .ls-cashout-btn {
        -webkit-animation: none !important; animation: none !important;
      }
    }
  `}</style>
);

export default LabSurge;
