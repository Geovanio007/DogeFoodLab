import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowDownUp, Info, Zap, Clock, ChevronDown, AlertCircle, CheckCircle } from 'lucide-react';

/* ============================================================
   DogeFood Lab — Points ↔ $LAB Swap Widget
   Uniswap-inspired swap interface, styled to match MainMenu's
   dark #0d1117 / #151b28 palette.

   Conversion rate: 100 pts = 1 $LAB (matches PointsToBlockchain)
   Token coming soon — swap button shows "Coming Soon" state with
   a clean animated preview so users understand the mechanic now.
   ============================================================ */

const LAB_TOKEN_IMG = 'https://customer-assets.emergentagent.com/job_doge-treats/artifacts/bihai5rz_1000081758-removebg-preview.png';
const CONVERSION_RATE = 100; // points per 1 $LAB
const MIN_CONVERT = 100;     // minimum points to convert
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

/* ─── Coin icon for POINTS (professional SVG, no external dep) ─── */
const PointsCoinIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="16" fill="url(#coin-grad)" />
    <circle cx="16" cy="16" r="13" fill="url(#coin-inner)" />
    <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
    {/* Shine arc */}
    <path d="M9 9.5 A9 9 0 0 1 23 9.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    {/* "P" for Points */}
    <text x="16" y="21" textAnchor="middle" fill="rgba(255,255,255,0.95)" fontSize="11" fontWeight="800" fontFamily="system-ui">P</text>
    <defs>
      <linearGradient id="coin-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#facc15" />
        <stop offset="50%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="coin-inner" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
    </defs>
  </svg>
);

/* ─── Token selector button ─── */
const TokenButton = ({ img, symbol, isImg, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1.5 bg-[#0d1117] hover:bg-[#1a2035] border border-white/[0.08] rounded-xl px-2.5 py-1.5 transition-colors shrink-0"
    style={{ minWidth: 90 }}
  >
    <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center shrink-0"
         style={{ background: isImg ? 'transparent' : 'none' }}>
      {isImg
        ? <img src={img} alt={symbol} className="w-7 h-7 object-contain" />
        : img
      }
    </div>
    <span className="text-sm font-bold text-white">{symbol}</span>
    <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-0.5" />
  </button>
);

/* ─── Rate pill ─── */
const RatePill = ({ rate }) => (
  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/[0.06] bg-[#0d1117] text-[11px] text-slate-400 font-mono">
    <Zap className="w-3 h-3 text-yellow-400" />
    <span>1 $LAB = {rate.toLocaleString()} PTS</span>
  </div>
);

/* ─── Coming soon badge ─── */
const ComingSoonBadge = () => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
    <Clock className="w-2.5 h-2.5" /> Season 2 end
  </span>
);

/* ══════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════ */
const PointsSwapWidget = ({ playerPoints = 0, isLoggedIn = false, effectiveAddress = null }) => {
  const [inputAmount, setInputAmount] = useState('');
  const [flipped, setFlipped] = useState(false); // false = PTS→LAB, true = LAB→PTS
  const [showInfo, setShowInfo] = useState(false);
  const [swapState, setSwapState] = useState('idle'); // idle | preview | coming_soon
  const inputRef = useRef(null);

  /* Derived */
  const ptsToParsed  = parseFloat(inputAmount) || 0;
  const outputAmount = flipped
    ? (ptsToParsed * CONVERSION_RATE).toFixed(0)
    : (ptsToParsed / CONVERSION_RATE).toFixed(4);

  const displayOutput = flipped
    ? parseInt(outputAmount).toLocaleString()
    : parseFloat(outputAmount) < 0.0001 && ptsToParsed > 0
      ? '< 0.0001'
      : parseFloat(outputAmount).toLocaleString(undefined, { maximumFractionDigits: 4 });

  const maxInput = flipped ? undefined : playerPoints;
  const tooLow   = !flipped && ptsToParsed > 0 && ptsToParsed < MIN_CONVERT;
  const tooHigh  = !flipped && ptsToParsed > playerPoints;
  const hasError = tooLow || tooHigh;
  const canSwap  = isLoggedIn && ptsToParsed > 0 && !hasError;

  const fromSymbol = flipped ? '$LAB' : 'POINTS';
  const toSymbol   = flipped ? 'POINTS' : '$LAB';

  const handleFlip = () => {
    setFlipped(f => !f);
    setInputAmount('');
    setSwapState('idle');
  };

  const handleMax = () => {
    if (!flipped) setInputAmount(String(playerPoints));
  };

  const handleInput = (v) => {
    // Only allow numbers and one decimal
    const clean = v.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
    setInputAmount(clean);
    setSwapState('idle');
  };

  const handleSwap = () => {
    if (!canSwap) return;
    setSwapState('coming_soon');
  };

  /* Label helpers */
  const btnLabel = () => {
    if (!isLoggedIn)      return 'Connect to Swap';
    if (!inputAmount)     return 'Enter Amount';
    if (tooLow)           return `Min ${MIN_CONVERT.toLocaleString()} PTS`;
    if (tooHigh)          return 'Insufficient Points';
    return 'Preview Swap →';
  };

  return (
    <div
      className="bg-[#151b28] rounded-xl border border-white/[0.06] overflow-hidden"
      data-testid="points-swap-widget"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <ArrowDownUp className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-bold text-white">Convert Points</span>
          <ComingSoonBadge />
        </div>
        <div className="flex items-center gap-2">
          <RatePill rate={CONVERSION_RATE} />
          <button
            onClick={() => setShowInfo(i => !i)}
            className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center transition-colors"
          >
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* ── Info drawer ── */}
      {showInfo && (
        <div className="px-4 py-3 bg-sky-500/[0.06] border-b border-sky-500/10 text-[11px] text-slate-400 space-y-1 leading-relaxed">
          <p>🪙 <strong className="text-slate-300">Rate:</strong> {CONVERSION_RATE} POINTS = 1 $LAB token</p>
          <p>⏳ <strong className="text-slate-300">When:</strong> Conversion opens at Season 2 end — points are safely stored until then</p>
          <p>⛓ <strong className="text-slate-300">How:</strong> Merkle-proof claim — tokens land directly in your wallet, no middlemen</p>
          <p>🔒 <strong className="text-slate-300">Min:</strong> {MIN_CONVERT.toLocaleString()} POINTS per swap</p>
        </div>
      )}

      <div className="p-3 sm:p-4 space-y-2">

        {/* ── FROM box ── */}
        <div
          className="rounded-2xl bg-[#0d1117] border border-white/[0.06] p-3 sm:p-4 group focus-within:border-yellow-400/30 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-slate-500 font-medium">You pay</span>
            {isLoggedIn && !flipped && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">
                  Balance: <span className="text-slate-300 font-mono">{playerPoints.toLocaleString()} PTS</span>
                </span>
                <button
                  onClick={handleMax}
                  className="text-[10px] font-bold text-yellow-400 hover:text-yellow-300 px-1.5 py-0.5 rounded bg-yellow-400/10 hover:bg-yellow-400/15 transition-colors border border-yellow-400/20"
                >
                  MAX
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={inputAmount}
              onChange={e => handleInput(e.target.value)}
              placeholder="0"
              className="flex-1 bg-transparent text-2xl font-bold text-white placeholder-white/20 outline-none min-w-0 tabular-nums"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            />
            <TokenButton
              img={flipped ? <img src={LAB_TOKEN_IMG} alt="$LAB" className="w-7 h-7 object-contain" /> : <PointsCoinIcon size={28} />}
              symbol={fromSymbol}
              isImg={false}
              onClick={() => {}}
            />
          </div>
          {/* USD-style sub-label */}
          {ptsToParsed > 0 && (
            <div className="mt-1 text-[11px] text-slate-600 font-mono">
              {flipped
                ? `≈ ${(ptsToParsed * CONVERSION_RATE).toLocaleString()} points`
                : `≈ ${(ptsToParsed / CONVERSION_RATE).toFixed(2)} $LAB`
              }
            </div>
          )}
        </div>

        {/* ── Flip button ── */}
        <div className="flex justify-center -my-1 relative z-10">
          <button
            onClick={handleFlip}
            className="w-9 h-9 rounded-xl bg-[#151b28] hover:bg-[#1a2035] border border-white/[0.08] flex items-center justify-center transition-all hover:scale-110 hover:border-yellow-400/30 group shadow-md"
          >
            <ArrowDownUp className="w-4 h-4 text-slate-400 group-hover:text-yellow-400 transition-colors" />
          </button>
        </div>

        {/* ── TO box ── */}
        <div className="rounded-2xl bg-[#0d1117] border border-white/[0.06] p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-slate-500 font-medium">You receive</span>
            <span className="text-[11px] text-slate-500">Estimated</span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="flex-1 text-2xl font-bold tabular-nums min-w-0 truncate"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: ptsToParsed > 0 && !hasError ? '#ffffff' : 'rgba(255,255,255,0.2)',
              }}
            >
              {ptsToParsed > 0 && !hasError ? displayOutput : '0'}
            </span>
            <TokenButton
              img={flipped
                ? <PointsCoinIcon size={28} />
                : <img src={LAB_TOKEN_IMG} alt="$LAB" className="w-7 h-7 object-contain" />
              }
              symbol={toSymbol}
              isImg={false}
              onClick={() => {}}
            />
          </div>
          {/* Receive hint */}
          {ptsToParsed > 0 && !hasError && !flipped && (
            <div className="mt-1 text-[11px] text-emerald-500/70 font-mono">
              Unlocks at Season 2 end ✓
            </div>
          )}
        </div>

        {/* ── Error message ── */}
        {hasError && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {tooLow && <span>Minimum conversion is {MIN_CONVERT.toLocaleString()} POINTS (1 $LAB)</span>}
            {tooHigh && <span>You only have {playerPoints.toLocaleString()} POINTS available</span>}
          </div>
        )}

        {/* ── Route / details row ── */}
        {ptsToParsed > 0 && !hasError && (
          <div className="flex items-center justify-between px-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400/60" />
              Route: Off-chain → $LAB (DogeOS chain)
            </span>
            <span className="font-mono">Fee: 0%</span>
          </div>
        )}

        {/* ── Swap button ── */}
        {swapState === 'coming_soon' ? (
          <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/25 p-4 text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-amber-400 font-bold text-sm">
              <Clock className="w-4 h-4" />
              Swap queued for Season 2 end
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Your <span className="text-yellow-300 font-mono font-bold">{ptsToParsed.toLocaleString()} PTS</span> will convert to{' '}
              <span className="text-yellow-300 font-mono font-bold">{parseFloat(outputAmount).toFixed(4)} $LAB</span>{' '}
              when the token launches. Points are safely stored on-chain until then.
            </p>
            <button
              onClick={() => setSwapState('idle')}
              className="text-[11px] text-slate-500 hover:text-white underline underline-offset-2 transition-colors"
            >
              Edit amount
            </button>
          </div>
        ) : (
          <button
            onClick={handleSwap}
            disabled={!canSwap}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all relative overflow-hidden group
              ${canSwap
                ? 'text-[#0b1738] cursor-pointer hover:scale-[1.01] hover:-translate-y-0.5 active:scale-[0.99]'
                : 'bg-white/[0.05] border border-white/[0.06] text-slate-500 cursor-not-allowed'
              }`}
            style={canSwap ? {
              background: 'linear-gradient(135deg, #fef08a 0%, #fde047 40%, #facc15 100%)',
              boxShadow: '0 4px 20px rgba(254,240,138,0.35), inset 0 1px 0 rgba(255,255,255,0.3)',
            } : {}}
          >
            {canSwap && (
              <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
            )}
            <span className="relative flex items-center justify-center gap-2">
              {!isLoggedIn && <span>🔒</span>}
              {btnLabel()}
            </span>
          </button>
        )}

        {/* ── Disclaimer ── */}
        <p className="text-center text-[10px] text-slate-600 leading-relaxed">
          Conversion opens at Season 2 end · Rate subject to final tokenomics · No fees
        </p>
      </div>
    </div>
  );
};

export default PointsSwapWidget;
