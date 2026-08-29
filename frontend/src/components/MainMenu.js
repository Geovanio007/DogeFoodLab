import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useEffectiveAccount } from '../hooks/useEffectiveAccount';
import DogeConnectButton from './DogeConnectButton';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useGame } from '../contexts/GameContext';
import { useNFTVerification } from '../hooks/useNFTVerification';
import { useTelegram } from '../contexts/TelegramContext';
import DogeFoodLogo from './DogeFoodLogo';
import MusicPlayer from './MusicPlayer';
import ThemeToggle from './ThemeToggle';
import { useMusic } from '../contexts/MusicContext';
import {
  Beaker, Trophy, Settings, Palette, Clock, User, Check, Edit2, X,
  Wallet, UserPlus, Crown, Store, Camera, Zap, ChevronRight,
  BookOpen, Activity, TrendingUp, Share2, Home, Star,
  ArrowRight, ChevronLeft, Users, MessageCircle, Send,
  Rocket, Reply, Smile, Swords, Gift, Target, Award, Gem, Flame, BarChart3, Newspaper
} from 'lucide-react';
import PointsSwapWidget from './PointsSwapWidget';
import MegaCrateSystem from './MegaCrateSystem';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const SEASON_2_END = new Date('2026-10-25T00:00:00Z').getTime(); // Season 2: Jun 17 – Oct 25 2026

// ─── Season Countdown ────────────────────────────────────────
const SeasonCountdown = ({ compact }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const calc = () => {
      const diff = SEASON_2_END - Date.now();
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      return {
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000)
      };
    };
    setTimeLeft(calc());
    const t = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(t);
  }, []);

  if (compact) {
    return (
      <span className="text-xs font-mono text-yellow-400 tabular-nums">
        {timeLeft.days}d {String(timeLeft.hours).padStart(2, '00')}h {String(timeLeft.minutes).padStart(2, '00')}m
      </span>
    );
  }

  return (
    <div className="flex gap-1.5">
      {[
        { val: timeLeft.days, label: 'D', color: 'text-yellow-400' },
        { val: String(timeLeft.hours).padStart(2, '0'), label: 'H', color: 'text-sky-400' },
        { val: String(timeLeft.minutes).padStart(2, '0'), label: 'M', color: 'text-sky-400' },
        { val: String(timeLeft.seconds).padStart(2, '0'), label: 'S', color: 'text-slate-400' }
      ].map((u, i) => (
        <div key={i} className="text-center">
          <div className="bg-[#0d1117] rounded px-1.5 py-0.5 min-w-[28px] border border-white/5">
            <span className={`text-xs font-bold tabular-nums ${u.color}`}>{u.val}</span>
          </div>
          <span className="text-[8px] text-white/30 uppercase">{u.label}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Player Ticker Carousel ───────────────────────────────────
// Baseline snapshot: saved once on first load, rolls forward every 24h.
// "Last seen" snapshot: updated every poll so % reflects live movement vs baseline.
const TICKER_BASELINE_KEY = 'dogefood_ticker_baseline';   // {timestamp, data: {addr: pts}}
const TICKER_SEEN_KEY     = 'dogefood_ticker_seen';       // {data: {addr: pts}} – no TTL
const TICKER_BASELINE_TTL = 24 * 60 * 60 * 1000;         // 24 h

const PlayerTickerCarousel = () => {
  const [tickerItems, setTickerItems] = useState([]);
  const trackRef = useRef(null);
  const animRef = useRef(null);
  const posRef = useRef(0);
  const isPausedRef = useRef(false);

  const buildTickerItems = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/leaderboard`);
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) return;

      const now = Date.now();

      // ── Baseline snapshot (the 24 h reference point) ──────────────────
      // Only reset when 24 h have elapsed; otherwise preserve it so %
      // keeps accumulating across page refreshes / 5-min polls.
      let baseline = {};
      try {
        const raw = localStorage.getItem(TICKER_BASELINE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (now - parsed.timestamp < TICKER_BASELINE_TTL) {
            // Still within 24 h window — keep using the saved baseline
            baseline = parsed.data || {};
          } else {
            // 24 h elapsed: roll the baseline forward using last-seen values
            // (not current values, so we don't lose any movement that just happened)
            let lastSeen = {};
            try {
              const seenRaw = localStorage.getItem(TICKER_SEEN_KEY);
              if (seenRaw) lastSeen = JSON.parse(seenRaw).data || {};
            } catch {}
            const fresh = {};
            data.forEach(p => { fresh[p.address] = lastSeen[p.address] ?? p.points; });
            localStorage.setItem(TICKER_BASELINE_KEY, JSON.stringify({ timestamp: now, data: fresh }));
            baseline = fresh;
          }
        } else {
          // Very first load — seed baseline with current points
          const fresh = {};
          data.forEach(p => { fresh[p.address] = p.points; });
          localStorage.setItem(TICKER_BASELINE_KEY, JSON.stringify({ timestamp: now, data: fresh }));
          baseline = fresh;
        }
      } catch {}

      // ── Update the "last seen" snapshot (no TTL — just current standings) ──
      try {
        const seen = {};
        data.forEach(p => { seen[p.address] = p.points; });
        localStorage.setItem(TICKER_SEEN_KEY, JSON.stringify({ data: seen }));
      } catch {}

      // ── Build ticker items using baseline for % calculation ────────────
      const items = data.slice(0, 20).map(player => {
        const prev = baseline[player.address];
        let pct = 0;
        let baselineWasZero = false;
        if (prev == null) {
          // Player not yet in baseline — show neutral
          pct = 0;
        } else if (prev > 0) {
          // Normal % change
          pct = ((player.points - prev) / prev) * 100;
        } else {
          // prev === 0: S2 fresh start — show absolute points gained, flag for renderer
          baselineWasZero = true;
          pct = player.points > 0 ? player.points : 0;
        }
        return {
          address: player.address,
          nickname: player.nickname || `Scientist #${player.rank}`,
          points: player.points,
          pct: Math.round(pct * 100) / 100,
          baselineWasZero,
          rank: player.rank,
        };
      });

      setTickerItems(items);
    } catch (e) {
      console.error('Ticker fetch error', e);
    }
  }, []);

  useEffect(() => {
    buildTickerItems();
    const iv = setInterval(buildTickerItems, 2 * 60 * 1000); // refresh every 2 min for more live feel
    return () => clearInterval(iv);
  }, [buildTickerItems]);

  // Smooth CSS animation ticker — no JS loop needed
  // Duplicate items so the loop is seamless
  const displayed = tickerItems.length > 0 ? [...tickerItems, ...tickerItems] : [];

  if (tickerItems.length === 0) return null;

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-white/[0.06] bg-[#0d1117]"
      style={{ height: '36px' }}
      onMouseEnter={() => {
        if (trackRef.current) trackRef.current.style.animationPlayState = 'paused';
      }}
      onMouseLeave={() => {
        if (trackRef.current) trackRef.current.style.animationPlayState = 'running';
      }}
    >
      {/* Left fade */}
      <div className="absolute left-0 top-0 bottom-0 w-10 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, #0d1117 0%, transparent 100%)' }} />

      {/* Label pill */}
      <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center">
        <div className="flex items-center gap-1.5 px-3 h-full bg-[#151b28] border-r border-white/[0.06]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">24h</span>
        </div>
      </div>

      {/* Scrolling track */}
      <div
        ref={trackRef}
        className="flex items-center h-full"
        style={{
          paddingLeft: '90px',
          width: 'max-content',
          animation: `ticker-scroll ${tickerItems.length * 4}s linear infinite`,
        }}
      >
        {displayed.map((item, i) => {
          const isUp = item.pct > 0;
          const isDown = item.pct < 0;
          const sign = isUp ? '+' : '';
          const pctColor = isUp ? '#34d399' : isDown ? '#f87171' : '#94a3b8';
          // When baseline was 0 (S2 fresh start), show "+Npts" instead of a % number
          const pctDisplay = item.baselineWasZero
            ? (item.pct > 0 ? `+${item.pct.toLocaleString()}pts` : '\u2014')
            : `${sign}${item.pct.toFixed(2)}%`;

          return (
            <div
              key={`${item.address}-${i}`}
              className="flex items-center gap-2 px-4 border-r border-white/[0.04] h-full whitespace-nowrap flex-shrink-0"
            >
              {/* Rank dot */}
              <span className="text-[10px] text-slate-600 tabular-nums">#{item.rank}</span>

              {/* Nickname */}
              <span className="text-[12px] font-semibold text-white">{item.nickname}</span>

              {/* Points */}
              <span className="text-[11px] text-slate-400 tabular-nums font-mono">
                {item.points.toLocaleString()}
              </span>

              {/* % change */}
              <span
                className="text-[11px] font-bold tabular-nums font-mono"
                style={{ color: pctColor }}
              >
                {pctDisplay}
              </span>

              {/* Arrow indicator */}
              {isUp && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 8V2M5 2L2 5M5 2L8 5" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {isDown && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 2V8M5 8L2 5M5 8L8 5" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          );
        })}
      </div>

      {/* Right fade */}
      <div className="absolute right-0 top-0 bottom-0 w-10 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, #0d1117 0%, transparent 100%)' }} />

      {/* Keyframe injection */}
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

// ─── Emoji Picker (simple) ───────────────────────────────────
const QUICK_EMOJIS = ['\u{1F600}','\u{1F602}','\u{1F525}','\u2764\uFE0F','\u{1F44D}','\u{1F44F}','\u{1F389}','\u{1F48E}','\u2728','\u{1F436}','\u{1F3C6}','\u{1F4AA}','\u{1F929}','\u{1F60E}','\u{1F680}','\u2B50','\u{1F49B}','\u{1F3AF}','\u{1FA84}','\u{1F3AE}'];

const EmojiPicker = ({ onSelect, onClose }) => (
  <div className="absolute bottom-full mb-2 left-0 bg-[#1a2035] border border-white/10 rounded-xl p-2 shadow-xl z-50" data-testid="emoji-picker">
    <div className="grid grid-cols-10 gap-1">
      {QUICK_EMOJIS.map((e) => (
        <button key={e} onClick={() => { onSelect(e); onClose(); }} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded text-base transition-colors">
          {e}
        </button>
      ))}
    </div>
  </div>
);

// ─── Live Chat Component ─────────────────────────────────────
// ─── Pack Leaders (Shiba pet XP leaderboard) ─────────────────────────────
// Renders the SAME pet artwork as the Lab's feeding screen (ShibaGrowth.jsx)
// — not an emoji stand-in — so a card here genuinely looks like the
// player's actual pet at its current stage: fur color, face shape, the lab
// goggles that unlock at Alpha, the crown at Mythic. Designed as a
// horizontal "trading card" strip rather than a table — it sits in a slim
// space above Live Chat and reads more like a mini trophy case.
const PACK_STAGES = [
  { name: 'Tiny Pup',    color: '#94a3b8', scale: 0.45, aura: null,         goggles: false, crown: false },
  { name: 'Young Pup',   color: '#60a5fa', scale: 0.58, aura: null,         goggles: false, crown: false },
  { name: 'Teen Shiba',  color: '#34d399', scale: 0.72, aura: null,         goggles: false, crown: false },
  { name: 'Adult Shiba', color: '#eab308', scale: 0.85, aura: 'rgba(234,179,8,0.35)',   goggles: false, crown: false },
  { name: 'Alpha Shiba', color: '#a78bfa', scale: 0.95, aura: 'rgba(167,139,250,0.45)', goggles: true,  crown: false },
  { name: 'Mythic Lab',  color: '#facc15', scale: 1.0,  aura: 'rgba(250,204,21,0.55)',  goggles: true,  crown: true  },
];
const PACK_STAGE_XP = [0, 150, 400, 800, 1500, 2800];

// A calm, static "portrait" rendering of the pet — same fur/face/body
// construction as the Lab's ShibaFace, just without the feeding/chewing
// animation states (those don't apply to a leaderboard thumbnail). Keeps
// the idle blink and a slow tail sway so it doesn't feel like a dead image.
const PackPetPortrait = ({ stageIndex, size = 64 }) => {
  const s = PACK_STAGES[stageIndex] ?? PACK_STAGES[0];
  const [blinkOpen, setBlinkOpen] = useState(true);
  const [tailAngle, setTailAngle] = useState(0);

  useEffect(() => {
    const blink = () => { setBlinkOpen(false); setTimeout(() => setBlinkOpen(true), 130); };
    const iv = setInterval(blink, 3200 + Math.random() * 2200);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    let frame, t = Math.random() * 10;
    const animate = () => { t += 0.045; setTailAngle(Math.sin(t) * 12); frame = requestAnimationFrame(animate); };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  const furColor = '#e0a868';
  const furDark = '#bc8748';
  const innerFur = '#fdf6e8';
  const px = size * (s.scale || 1);

  return (
    <div style={{ position: 'relative', filter: s.aura ? `drop-shadow(0 0 8px ${s.color}66)` : 'none' }}>
      {s.aura && (
        <div style={{
          position: 'absolute', inset: -10, borderRadius: '50%',
          background: `radial-gradient(circle, ${s.aura} 0%, transparent 70%)`,
          animation: 'aura-pulse 2.4s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}
      <svg width={px} height={px * 1.07} viewBox="0 0 140 150" style={{ overflow: 'visible' }}>
        {/* Tail */}
        <g transform={`translate(104, 96) rotate(${tailAngle})`} style={{ transformOrigin: '0 0' }}>
          <path d="M0 0 Q22 -16 27 -38 Q31 -54 21 -60 Q11 -64 6 -50 Q1 -34 0 -14 Z" fill={furColor} stroke={furDark} strokeWidth="1.2" />
          <path d="M3 -8 Q17 -20 20 -38 Q22 -48 16 -52" fill="none" stroke={innerFur} strokeWidth="3.5" opacity="0.75" strokeLinecap="round" />
        </g>
        {/* Back legs */}
        <ellipse cx="46" cy="132" rx="9" ry="11" fill="#cf9a5c" />
        <ellipse cx="94" cy="132" rx="9" ry="11" fill="#cf9a5c" />
        {/* Body */}
        <path d="M70 84 C 94 84, 106 102, 104 120 C 102 136, 88 144, 70 144 C 52 144, 38 136, 36 120 C 34 102, 46 84, 70 84 Z" fill={furColor} stroke={furDark} strokeWidth="1.2" />
        <path d="M53 104 Q70 95 87 104 Q89 124 70 138 Q51 124 53 104 Z" fill={innerFur} />
        {/* Front legs + cream socks */}
        <rect x="45" y="120" width="12" height="22" rx="6" fill={furColor} stroke={furDark} strokeWidth="1" />
        <rect x="83" y="120" width="12" height="22" rx="6" fill={furColor} stroke={furDark} strokeWidth="1" />
        <ellipse cx="51" cy="142" rx="7" ry="4.5" fill={innerFur} />
        <ellipse cx="89" cy="142" rx="7" ry="4.5" fill={innerFur} />
        {/* Ears — soft rounded tips */}
        <path d="M48 44 Q43 22 51 13 Q58 8 60 28 Q59 40 48 44 Z" fill={furColor} stroke={furDark} strokeWidth="1.2" />
        <path d="M50 40 Q47 25 52 18 Q56 15 57 28" fill={furDark} opacity="0.4" />
        <path d="M92 44 Q97 22 89 13 Q82 8 80 28 Q81 40 92 44 Z" fill={furColor} stroke={furDark} strokeWidth="1.2" />
        <path d="M90 40 Q93 25 88 18 Q84 15 83 28" fill={furDark} opacity="0.4" />
        {/* Head */}
        <path d="M70 28 C 91 28, 103 44, 102 62 C 101 76, 93 86, 80 90 L 60 90 C 47 86, 39 76, 38 62 C 37 44, 49 28, 70 28 Z" fill={furColor} stroke={furDark} strokeWidth="1.3" />
        {/* Urajiro cheeks */}
        <ellipse cx="52" cy="64" rx="13" ry="15" fill={innerFur} opacity="0.95" />
        <ellipse cx="88" cy="64" rx="13" ry="15" fill={innerFur} opacity="0.95" />
        <ellipse cx="55" cy="50" rx="4.5" ry="3" fill={innerFur} opacity="0.9" transform="rotate(-15 55 50)" />
        <ellipse cx="85" cy="50" rx="4.5" ry="3" fill={innerFur} opacity="0.9" transform="rotate(15 85 50)" />
        {/* Snout */}
        <path d="M55 70 Q70 64 85 70 Q86 82 78 90 L62 90 Q54 82 55 70 Z" fill={innerFur} />
        {/* Eyes — small, almond */}
        <ellipse cx="56" cy="58" rx="4.2" ry={blinkOpen ? 5.6 : 1.1} fill="#241509" transform="rotate(-10 56 58)" style={{ transition: 'ry 0.08s' }} />
        {blinkOpen && <ellipse cx="57.3" cy="55.5" rx="1.4" ry="1.7" fill="white" opacity="0.9" />}
        <ellipse cx="84" cy="58" rx="4.2" ry={blinkOpen ? 5.6 : 1.1} fill="#241509" transform="rotate(10 84 58)" style={{ transition: 'ry 0.08s' }} />
        {blinkOpen && <ellipse cx="82.7" cy="55.5" rx="1.4" ry="1.7" fill="white" opacity="0.9" />}
        {/* Nose */}
        <path d="M65 74 Q70 71.5 75 74 Q75 79.5 70 82 Q65 79.5 65 74 Z" fill="#2b1a0c" />
        <ellipse cx="67.5" cy="75" rx="1.6" ry="1" fill="rgba(255,255,255,0.35)" />
        {/* Content Shiba smile */}
        <path d="M64 85 Q70 88.5 76 85" fill="none" stroke="#8a5a2e" strokeWidth="1.5" strokeLinecap="round" />
        {/* Alpha+ lab goggles */}
        {s.goggles && (
          <g>
            <rect x="42" y="52" width="20" height="16" rx="8" fill="none" stroke={s.color} strokeWidth="2.5" opacity="0.8" />
            <rect x="78" y="52" width="20" height="16" rx="8" fill="none" stroke={s.color} strokeWidth="2.5" opacity="0.8" />
            <line x1="62" y1="60" x2="78" y2="60" stroke={s.color} strokeWidth="2" opacity="0.8" />
            <rect x="43" y="53" width="18" height="14" rx="7" fill={s.color} opacity="0.12" />
            <rect x="79" y="53" width="18" height="14" rx="7" fill={s.color} opacity="0.12" />
          </g>
        )}
        {/* Mythic crown */}
        {s.crown && (
          <g transform="translate(52, 10)">
            <polygon points="18,12 0,20 5,0 18,8 31,0 36,20" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
            <circle cx="5" cy="3" r="3" fill="#ef4444" />
            <circle cx="18" cy="0" r="3.5" fill="#a78bfa" />
            <circle cx="31" cy="3" r="3" fill="#34d399" />
          </g>
        )}
      </svg>
    </div>
  );
};

const PackLeaderCard = ({ pet, rank }) => {
  const stage = PACK_STAGES[pet.current_stage] ?? PACK_STAGES[0];
  const nextThreshold = PACK_STAGE_XP[pet.current_stage + 1];
  const prevThreshold = PACK_STAGE_XP[pet.current_stage] ?? 0;
  const progress = nextThreshold
    ? Math.min(100, Math.round(((pet.current_xp - prevThreshold) / (nextThreshold - prevThreshold)) * 100))
    : 100; // maxed out (Mythic Lab)
  const isTop = rank === 1;

  return (
    <div
      className="relative shrink-0 w-[124px] rounded-2xl overflow-hidden"
      data-testid={`pack-leader-card-${rank}`}
      style={{
        background: isTop
          ? 'linear-gradient(160deg, rgba(249,115,22,0.18) 0%, #151b28 65%)'
          : '#151b28',
        border: isTop ? '1px solid rgba(249,115,22,0.4)' : '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Rank badge */}
      <div
        className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black z-10"
        style={{
          background: isTop ? 'linear-gradient(135deg,#fde047,#eab308)' : 'rgba(255,255,255,0.08)',
          color: isTop ? '#1c1006' : '#94a3b8',
        }}
      >
        {rank}
      </div>

      {/* Pet portrait — real pet art, same as the Lab feeding screen */}
      <div
        className="flex items-center justify-center pt-3 pb-1 h-[78px]"
        style={{
          background: `radial-gradient(circle at 50% 35%, ${stage.color}1c, transparent 70%)`,
        }}
      >
        <PackPetPortrait stageIndex={pet.current_stage} size={58} />
      </div>

      <div className="px-2 pb-2 text-center">
        <div className="text-[10px] font-bold truncate" style={{ color: stage.color }}>
          {stage.name}
        </div>
        <div className="text-[11px] font-semibold text-white truncate mt-0.5" title={pet.owner_nickname}>
          {pet.owner_nickname}
        </div>
        <div className="text-[9px] text-slate-500 tabular-nums mt-0.5">
          {pet.current_xp.toLocaleString()} XP
        </div>

        {/* Progress toward next stage */}
        <div className="h-1 rounded-full bg-white/[0.06] mt-1.5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, background: stage.color }}
          />
        </div>
      </div>
    </div>
  );
};

const PackLeaders = () => {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchLeaders = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/shiba/leaderboard?limit=10`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setPets(data.pets || []);
        }
      } catch (e) { /* silent — this is a decorative widget, never block the menu */ }
      finally { if (!cancelled) setLoading(false); }
    };
    fetchLeaders();
    const interval = setInterval(fetchLeaders, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Nothing to show yet (no pets fed anywhere) — stay invisible rather
  // than show an empty shell above the chat.
  if (!loading && pets.length === 0) return null;

  return (
    <div className="bg-[#151b28] rounded-xl border border-white/[0.06] overflow-hidden" data-testid="pack-leaders-widget">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
        <span className="text-base leading-none">🐾</span>
        <span className="text-sm font-bold text-white flex-1">Pack Leaders</span>
        <span className="text-[9px] text-slate-500 uppercase tracking-wide">Top Shiba XP</span>
      </div>
      <div className="px-3 py-3 overflow-x-auto">
        {loading ? (
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="shrink-0 w-[124px] h-[124px] rounded-2xl bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex gap-2">
            {pets.map((pet, idx) => (
              <PackLeaderCard key={pet.owner || idx} pet={pet} rank={idx + 1} />
            ))}
          </div>
        )}
      </div>
      <style>{`
        @keyframes aura-pulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
};

// ─── Seasonal $LAB Emissions ─────────────────────────────────
// 20 seasons × 3 months = the game's full 5-year lifetime. The schedule
// is a smooth exponential taper (~3.4% less per season) anchored so
// Season 1 equals the live 20M $LAB pool shown on the Leaderboard, and
// the full 20-season run sums to exactly the 294M $LAB community
// allocation minted in LABToken.sol (70% of the 420M total supply) —
// every reward the game will ever pay out, accounted for. Early seasons
// pay the most so day-one players are rewarded for taking a chance on
// the game; the long gentle taper (instead of a hard drop-off) keeps
// rewards meaningful for players who join in year 3, 4, 5 — preserving
// long-term value instead of burning it all in the first few seasons.
const LAB_EMISSIONS = [
  20.0, 19.3, 18.7, 18.0, 17.4, 16.8, 16.3, 15.7, 15.2, 14.7,
  14.2, 13.7, 13.2, 12.8, 12.3, 11.9, 11.5, 11.1, 10.8, 10.4,
];
const LAB_EMISSIONS_CUMULATIVE = (() => {
  let running = 0;
  return LAB_EMISSIONS.map((v) => (running = +(running + v).toFixed(1)));
})();
const EMISSIONS_CURRENT_SEASON = 2;

// Same $LAB artwork PointsSwapWidget.jsx renders — keeping one source of truth
// for the token image instead of a hand-drawn stand-in.
const LAB_TOKEN_IMG = 'https://customer-assets.emergentagent.com/job_doge-treats/artifacts/bihai5rz_1000081758-removebg-preview.png';

const LabCoin = ({ size = 18, className = '' }) => (
  <img
    src={LAB_TOKEN_IMG}
    alt="$LAB"
    width={size}
    height={size}
    className={`inline-block object-contain ${className}`}
    style={{ width: size, height: size }}
  />
);

// Catmull-Rom → cubic Bezier smoothing so the curve reads as a modern,
// continuous line rather than jagged straight segments between seasons.
function buildEmissionPaths(points, baseY) {
  if (points.length < 2) return { line: '', area: '' };
  let line = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    line += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  const last = points[points.length - 1];
  const first = points[0];
  const area = `${line} L ${last.x.toFixed(2)},${baseY} L ${first.x.toFixed(2)},${baseY} Z`;
  return { line, area };
}

const SeasonEmissionsChart = () => {
  const [hoverIdx, setHoverIdx] = useState(null);
  const [view, setView] = useState('season'); // 'season' | 'cumulative'
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 150);
    return () => clearTimeout(t);
  }, []);

  const data = view === 'season' ? LAB_EMISSIONS : LAB_EMISSIONS_CUMULATIVE;
  const maxVal = view === 'season' ? 20 : 294;
  const W = 300, H = 150, PAD_L = 6, PAD_R = 6, PAD_T = 16, PAD_B = 8;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const points = data.map((v, i) => ({
    x: PAD_L + (i / (data.length - 1)) * plotW,
    y: PAD_T + (1 - v / maxVal) * plotH,
    v,
    season: i + 1,
  }));
  const baseY = PAD_T + plotH;
  const { line, area } = buildEmissionPaths(points, baseY);
  const active = hoverIdx !== null ? points[hoverIdx] : points[EMISSIONS_CURRENT_SEASON - 1];
  const bandW = plotW / data.length;

  return (
    <div className="flex flex-col h-full" data-testid="lab-emissions-chart">
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="flex items-center justify-between mb-1 gap-2">
          <div className="min-w-0">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider truncate">
              {hoverIdx === null ? `Season ${active.season} · Current` : view === 'season' ? `Season ${active.season}` : `Through Season ${active.season}`}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <LabCoin size={16} />
              <span className="text-lg font-black text-white">{active.v.toFixed(1)}M</span>
              <span className="text-[10px] text-amber-400/70 font-semibold">$LAB</span>
            </div>
          </div>
          <div className="flex bg-white/5 rounded-lg p-0.5 gap-0.5 shrink-0">
            <button
              onClick={() => setView('season')}
              className={`text-[9px] font-semibold px-2 py-1 rounded-md transition-colors ${view === 'season' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Per Season
            </button>
            <button
              onClick={() => setView('cumulative')}
              className={`text-[9px] font-semibold px-2 py-1 rounded-md transition-colors ${view === 'cumulative' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Total Paid
            </button>
          </div>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto mt-2" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="emissionFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#facc15" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
            </linearGradient>
            <clipPath id="currentSeasonCoinClip">
              <circle cx={points[EMISSIONS_CURRENT_SEASON - 1].x} cy={points[EMISSIONS_CURRENT_SEASON - 1].y} r="6.5" />
            </clipPath>
          </defs>

          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1={PAD_L} x2={W - PAD_R}
              y1={PAD_T + plotH * f} y2={PAD_T + plotH * f}
              stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1"
            />
          ))}

          <path
            d={area}
            fill="url(#emissionFill)"
            style={{ opacity: drawn ? 1 : 0, transition: 'opacity 900ms ease 200ms' }}
          />
          <path
            d={line}
            fill="none"
            stroke="#facc15"
            strokeWidth="2"
            strokeLinecap="round"
            style={{
              strokeDasharray: 1000,
              strokeDashoffset: drawn ? 0 : 1000,
              transition: 'stroke-dashoffset 1200ms ease',
            }}
          />

          {points.map((p, i) => {
            const isCurrent = i === EMISSIONS_CURRENT_SEASON - 1;
            const isHovered = hoverIdx === i;
            return (
              <g key={i}>
                {isCurrent && (
                  <circle
                    cx={p.x} cy={p.y} r="8"
                    fill="#facc15" fillOpacity="0.25"
                    className="animate-ping"
                    style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                  />
                )}
                {isCurrent ? (
                  <>
                    <circle cx={p.x} cy={p.y} r="7.5" fill="#151b28" stroke="#facc15" strokeWidth="1.5" />
                    <image
                      href={LAB_TOKEN_IMG}
                      xlinkHref={LAB_TOKEN_IMG}
                      x={p.x - 6.5} y={p.y - 6.5}
                      width="13" height="13"
                      clipPath="url(#currentSeasonCoinClip)"
                      preserveAspectRatio="xMidYMid slice"
                    />
                  </>
                ) : (
                  <circle
                    cx={p.x} cy={p.y}
                    r={isHovered ? 3.5 : 2}
                    fill="#151b28"
                    stroke="#facc15"
                    strokeWidth={isHovered ? 2 : 1.25}
                    style={{ transition: 'r 150ms ease' }}
                  />
                )}
                <rect
                  x={p.x - bandW / 2} y={PAD_T}
                  width={bandW} height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                  onTouchStart={() => setHoverIdx(i)}
                  style={{ cursor: 'pointer' }}
                />
              </g>
            );
          })}
        </svg>

        <div className="flex justify-between mt-1 px-1">
          <span className="text-[8px] text-slate-600">S1</span>
          <span className="text-[8px] text-slate-600">S10</span>
          <span className="text-[8px] text-slate-600">S20</span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
          <div className="bg-white/[0.03] rounded-lg py-1.5 px-1 border border-white/[0.05]">
            <div className="text-[11px] font-bold text-white">294M</div>
            <div className="text-[8px] text-slate-500">Total $LAB</div>
          </div>
          <div className="bg-white/[0.03] rounded-lg py-1.5 px-1 border border-white/[0.05]">
            <div className="text-[11px] font-bold text-white">20</div>
            <div className="text-[8px] text-slate-500">Seasons</div>
          </div>
          <div className="bg-amber-500/10 rounded-lg py-1.5 px-1 border border-amber-500/20">
            <div className="text-[11px] font-bold text-amber-300">Top 50</div>
            <div className="text-[8px] text-slate-500">Get Paid</div>
          </div>
        </div>

        <p className="text-[9px] text-slate-500 leading-relaxed mt-2.5 text-center">
          Rewards taper ~3.4% each season so early Scientists earn the most,
          while a long gentle tail keeps $LAB flowing for years to come.
        </p>
      </div>
    </div>
  );
};

// ─── Live Activity Table ─────────────────────────────────────
const LiveActivityTable = () => {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/activity/recent?limit=15`);
      if (res.ok) {
        const data = await res.json();
        setActivity(data.activity || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, 30000);
    return () => clearInterval(interval);
  }, [fetchActivity]);

  const rarityColor = {
  Common: 'text-slate-400', Uncommon: 'text-green-400', Rare: 'text-blue-400',
  Epic: 'text-purple-400', Legendary: 'text-yellow-400', Mythic: 'text-pink-400',
  Spin: 'text-yellow-300', Surge: 'text-sky-300'
};

const rarityBg = {
  Common: 'bg-slate-500/10', Uncommon: 'bg-green-500/10', Rare: 'bg-blue-500/10',
  Epic: 'bg-purple-500/10', Legendary: 'bg-yellow-500/10', Mythic: 'bg-pink-500/10',
  Spin: 'bg-yellow-500/20', Surge: 'bg-sky-500/15'
};

  const timeAgo = (iso) => {
    if (!iso) return '';
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div data-testid="live-activity-table">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[11px] text-slate-500 uppercase tracking-wider border-b border-white/5">
              <th className="px-4 py-3 font-medium">Treat</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">Time</th>
              <th className="px-4 py-3 font-medium">Scientist</th>
              <th className="px-4 py-3 font-medium">Rarity</th>
              <th className="px-4 py-3 font-medium text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {activity.map((item, idx) => (
              <tr key={idx} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg ${rarityBg[item.rarity] || 'bg-slate-500/10'} flex items-center justify-center shrink-0`}>
                      <Beaker className={`w-3.5 h-3.5 ${rarityColor[item.rarity] || 'text-slate-400'}`} />
                    </div>
                    <span className="text-xs text-white truncate max-w-[120px]">
  {item.activity_type === 'spin' ? '\u{1F3B0} ' : ''}{item.treat_name || 'Unnamed'}
</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 hidden sm:table-cell">
                  <span className="text-[11px] text-slate-500">{timeAgo(item.created_at)}</span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center shrink-0">
                      <User className="w-2.5 h-2.5 text-white" />
                    </div>
                    <span className="text-xs text-slate-300 truncate max-w-[100px]">{item.player_nickname}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`text-[11px] font-medium ${rarityColor[item.rarity] || 'text-slate-400'}`}>
                    {item.rarity}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className="text-xs font-bold text-emerald-400">+{item.points_reward}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {activity.length === 0 && (
        <div className="text-center py-8 text-slate-500 text-xs">No recent activity</div>
      )}
    </div>
  );
};

// ─── Navigation Items ────────────────────────────────────────
const navItems = [
  { path: '/', icon: Home, label: 'Home', color: 'text-sky-400', bgColor: 'bg-sky-500/10' },
  { path: '/lab', icon: Beaker, label: 'Lab', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', needsAuth: true },
  { path: '/nfts', icon: Palette, label: 'My Treats', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  { path: '/leaderboard', icon: Trophy, label: 'Leaderboard', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  { path: '/marketplace', icon: Store, label: 'Marketplace', color: 'text-sky-400', bgColor: 'bg-sky-500/10' },
  { path: '/tournament', icon: Crown, label: 'Tournament', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
  { path: '/settings', icon: Settings, label: 'Settings', color: 'text-slate-400', bgColor: 'bg-slate-500/10' },
];

// ─── Left Sidebar ────────────────────────────────────────────
const Sidebar = ({ onAuthRequired, onReferralClick }) => (
  <nav className="hidden lg:flex flex-col w-52 shrink-0 py-4" data-testid="menu-sidebar">
    <button
      onClick={onReferralClick}
      className="mx-3 mb-4 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 transition-all text-white text-sm font-semibold shadow-lg shadow-sky-500/20"
    >
      <Share2 className="w-4 h-4" />
      <span>Share & Earn</span>
    </button>

    <div className="space-y-0.5 px-2 flex-1">
      {navItems.map((item) => {
        const isActive = item.path === '/';
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={item.needsAuth ? onAuthRequired : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative
              ${isActive
                ? 'bg-white/[0.06] border-l-2 border-sky-400'
                : 'hover:bg-white/[0.04] border-l-2 border-transparent'
              }`}
            data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
          >
            <div className={`w-8 h-8 rounded-lg ${item.bgColor} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </div>
            <span className={`text-sm transition-colors ${isActive ? 'text-white font-semibold' : 'text-slate-400 group-hover:text-white'}`}>
              {item.label}
            </span>
          </Link>
        );
      })}

      <div className="my-3 mx-3 h-px bg-white/5" />

      <a
        href="/game-mechanisms.html"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-all group border-l-2 border-transparent"
      >
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <BookOpen className="w-4 h-4 text-indigo-400" />
        </div>
        <span className="text-sm text-slate-400 group-hover:text-white transition-colors">Game Guide</span>
      </a>
    </div>

    <div className="px-3 mt-4 mb-2 flex flex-col items-center">
      <DogeFoodLogo size="medium" showText={false} showBeta={false} />
      <div className="text-[10px] text-white mt-2 text-center">Built with love for the Dogecoin community</div>
    </div>
  </nav>
);

// ─── Mobile Navigation Strip ─────────────────────────────────
const MobileNavStrip = ({ onAuthRequired }) => (
  <div className="lg:hidden overflow-x-auto scrollbar-hide border-b border-white/[0.06] bg-[#0d1117]" data-testid="mobile-nav-strip">
    <div className="flex items-center gap-1 px-3 py-2 min-w-max">
      {navItems.map((item) => {
        const isActive = item.path === '/';
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={item.needsAuth ? onAuthRequired : undefined}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-nowrap transition-all shrink-0
              ${isActive ? 'bg-white/[0.06] border border-sky-500/20' : 'hover:bg-white/[0.04] border border-transparent'}`}
            data-testid={`mobile-nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
          >
            <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
            <span className={`text-[11px] ${isActive ? 'text-white font-semibold' : 'text-slate-400'}`}>{item.label}</span>
          </Link>
        );
      })}
      <a
        href="/game-mechanisms.html"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/[0.04] border border-transparent shrink-0"
      >
        <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
        <span className="text-[11px] text-slate-400">Guide</span>
      </a>
    </div>
  </div>
);

// ─── Promotional Banner Card ──────────────────────────────────
const PromoBanner = ({ icon: Icon, iconBg, title, subtitle, borderColor, gradientFrom, gradientTo, onClick, testId }) => (
  <button
    onClick={onClick}
    className={`relative overflow-hidden rounded-2xl p-4 border ${borderColor} bg-gradient-to-br ${gradientFrom} ${gradientTo} text-left w-full group hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-200 shadow-lg hover:shadow-xl`}
    style={{ boxShadow: '0 4px 15px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)' }}
    data-testid={testId}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.07] to-transparent rounded-2xl pointer-events-none" />
    <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/[0.04] rounded-full blur-2xl group-hover:bg-white/[0.08] transition-colors" />
    <div className="relative flex items-start gap-3">
      <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-lg`}
        style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
        <Icon className="w-5 h-5 text-white drop-shadow-md" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-white mb-0.5 tracking-wide uppercase drop-shadow-sm">{title}</h3>
        <p className="text-[11px] text-white/60 leading-relaxed">{subtitle}</p>
      </div>
      <div className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center shrink-0 group-hover:bg-white/15 transition-colors mt-0.5 backdrop-blur-sm"
        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }}>
        <ArrowRight className="w-4 h-4 text-white/70 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  </button>
);

// ─── Feature Card ─────────────────────────────────────────────
const FeatureCard = ({ icon: Icon, label, gradient, iconColor, borderColor, to, state, onClick, badge, testId }) => (
  <Link to={to} state={state} onClick={onClick} className="block group" data-testid={testId}>
    <div className={`relative overflow-hidden rounded-2xl border ${borderColor} bg-gradient-to-b ${gradient} p-4 sm:p-5 text-center hover:scale-[1.05] hover:-translate-y-1 transition-all duration-200`}
      style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/[0.05] to-transparent rounded-t-2xl pointer-events-none" />
      {badge && (
        <div className="absolute top-2 right-2 z-10">
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase backdrop-blur-sm border border-emerald-500/20">{badge}</span>
        </div>
      )}
      <div className={`relative w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-2.5 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-200 border border-white/10`}
        style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.3), inset 0 2px 0 rgba(255,255,255,0.1)' }}>
        <Icon className={`w-7 h-7 sm:w-8 sm:h-8 ${iconColor} drop-shadow-lg`} />
      </div>
      <h4 className="text-sm font-bold text-white drop-shadow-sm">{label}</h4>
    </div>
  </Link>
);

// ═══════════════════════════════════════════════════════════════
// MAIN MENU COMPONENT
// ═══════════════════════════════════════════════════════════════
/* ─── Spin Wheel CTA Bubble ─────────────────────────────────────────────────
   Floating corner widget that draws a mini version of the actual wheel.
   Tapping navigates to /lab where the real SpinWheel lives.
   ─────────────────────────────────────────────────────────────────────────── */
const WHEEL_COLORS = [
  '#3b82f6','#8b5cf6','#06b6d4','#fbbf24','#ef4444',
  '#10b981','#ec4899','#14b8a6','#a855f7','#f97316',
];

const SpinWheelCTA = () => {
  const navigate = useNavigate();
  const canvasRef = React.useRef(null);
  const [angle, setAngle] = React.useState(0);
  const rafRef = React.useRef(null);
  const [dismissed, setDismissed] = React.useState(false);

  // Slow-spin animation
  React.useEffect(() => {
    let a = 0;
    const tick = () => {
      a = (a + 0.4) % 360;
      setAngle(a);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Draw the mini wheel
  React.useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const size = 64, cx = size / 2, cy = size / 2, r = size / 2 - 3;
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    const n = WHEEL_COLORS.length;
    const slice = (2 * Math.PI) / n;
    const offset = (angle * Math.PI) / 180;

    WHEEL_COLORS.forEach((clr, i) => {
      const a0 = offset + i * slice;
      const a1 = a0 + slice;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a0, a1); ctx.closePath();
      ctx.fillStyle = clr; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 0.8; ctx.stroke();
    });

    // Outer ring
    ctx.beginPath(); ctx.arc(cx, cy, r + 1, 0, 2 * Math.PI);
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2;
    ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 8;
    ctx.stroke(); ctx.shadowBlur = 0;

    // Center hub
    ctx.beginPath(); ctx.arc(cx, cy, 12, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a'; ctx.fill();
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#38bdf8';
    ctx.font = '700 7px Inter,system-ui,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('SPIN', cx, cy);

    // Pointer arrow at top
    const px = cx, py = 3;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - 5, py - 6);
    ctx.lineTo(px + 5, py - 6);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 3;
    ctx.fill(); ctx.shadowBlur = 0;
  }, [angle]);

  if (dismissed) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 90,   // above the MusicPlayer bar
        right: 16,
        zIndex: 998,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        filter: 'drop-shadow(0 4px 16px rgba(56,189,248,0.4))',
        animation: 'ctaBounce 2.5s ease-in-out infinite',
      }}
    >
      <style>{`
        @keyframes ctaBounce {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
      `}</style>

      {/* Dismiss button */}
      <button
        onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
        style={{
          position: 'absolute', top: -8, right: -8,
          width: 18, height: 18, borderRadius: '50%',
          background: 'rgba(15,23,42,0.9)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.5)',
          fontSize: 10, lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 2,
        }}
        aria-label="Dismiss"
      >{'\u2715'}</button>

      {/* The wheel bubble */}
      <button
        onClick={() => navigate('/lab')}
        style={{
          position: 'relative',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          border: '2px solid rgba(56,189,248,0.5)',
          borderRadius: 20,
          padding: '10px 12px',
          cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          backdropFilter: 'blur(8px)',
          minWidth: 84,
        }}
        aria-label="Spin the Wheel"
      >
        <canvas ref={canvasRef} width={64} height={64} style={{ borderRadius: '50%' }} />
        <span style={{
          fontSize: 9, fontWeight: 800, color: '#38bdf8',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          lineHeight: 1, whiteSpace: 'nowrap',
        }}>
          Daily Spin!
        </span>
      </button>
    </div>
  );
};


/* ═══════════════════════════════════════════════════════════════════════════
   GAME WALKTHROUGH — shown on first visit, re-openable via "?" button
   ═══════════════════════════════════════════════════════════════════════════ */
const WALKTHROUGH_KEY = 'dogefood_walkthrough_v1_done';

const STEPS = [
  {
    emoji: '\u{1F9EA}',
    title: 'Welcome to DogeFood Lab!',
    color: '#38bdf8',
    badge: 'START HERE',
    badgeColor: 'rgba(56,189,248,0.2)',
    badgeText: '#38bdf8',
    description: "You're a Doge Scientist on a mission to craft legendary treats and climb the leaderboard. Here's everything you need to know to get started. Swipe through to master the Lab! \u{1F43E}",
    tips: [
      ' Create treats to earn Points & XP',
      ' Points \u2192 $LAB tokens at season end',
      ' Top 50 scientists earn token rewards',
    ],
  },
  {
    emoji: '\u2697\uFE0F',
    title: 'Step 1 \u2014 Create Treats in the Lab',
    color: '#facc15',
    badge: 'THE LAB',
    badgeColor: 'rgba(250,204,21,0.15)',
    badgeText: '#facc15',
    description: "Tap the Lab tab on the menu to open your Reactor Chamber. Select up to 5 ingredients from your inventory to craft a treat. Higher-tier ingredients unlock rarer treats.",
    tips: [
      ' Tap Lab \u2192 choose ingredients \u2192 Brew',
      '5 ingredients = best rarity chance',
      ' Mix Legendary/Mythic ingredients for top treats',
      ' New ingredients unlock as you level up',
    ],
  },
  {
    emoji: '\u23F3',
    title: 'Step 2 \u2014 Wait for the Timer',
    color: '#a855f7',
    badge: 'BREWING',
    badgeColor: 'rgba(168,85,247,0.15)',
    badgeText: '#a855f7',
    description: "Once you brew, your treat needs time to cook in the Reactor. The brewing timer counts down \u2014 higher rarity treats take longer. Watch for Heat Events in the Arena to cut brewing time by 50%!",
    tips: [
      ' Overclock Heat Event = 50% faster brewing',
      ' Come back when the timer hits 0:00',
      ' You can check the timer anytime in the Lab',
      ' Streak bonuses also reduce brew time',
    ],
  },
  {
    emoji: '\u{1F381}',
    title: 'Step 3 \u2014 Collect Your Treat',
    color: '#2dd4bf',
    badge: 'COLLECT',
    badgeColor: 'rgba(45,212,191,0.15)',
    badgeText: '#2dd4bf',
    description: "When the brew timer finishes, head back to the Lab and tap Collect. A cinematic reveal shows your treat's rarity and the Points + XP you earned. Rarer treats = more rewards!",
    tips: [
      ' Golden Hour Heat Event = Points \u00D72 on collect',
      ' Watch the cinematic reveal \u2014 it\u2019s rarity-based',
      ' Mythic treats earn 500\u20131000 points each',
      ' Keep a daily streak for XP bonuses',
    ],
  },
  {
    emoji: '\u{1F5BC}\uFE0F',
    title: 'Step 4 \u2014 View Your Collection',
    color: '#ec4899',
    badge: 'MY TREATS',
    badgeColor: 'rgba(236,72,153,0.15)',
    badgeText: '#ec4899',
    description: "Tap My Treats from the menu to see every treat you've ever crafted \u2014 your permanent NFT-style collection. S1 treats show their original art; S2 treats show their rarity image. You can also list treats for sale on the Marketplace.",
    tips: [
      ' Filter by rarity: Common \u2192 Mythic',
      ' Tap List for Sale to put a treat on market',
      ' S1 badge = Season 1 \u00B7 \u{1F7E2} S2 badge = Season 2',
      ' Your earned $LAB tokens show here too',
    ],
  },
  {
    emoji: '\u{1F3DF}\uFE0F',
    title: 'Step 5 \u2014 Join the Arena',
    color: '#f97316',
    badge: 'ARENA',
    badgeColor: 'rgba(249,115,22,0.15)',
    badgeText: '#f97316',
    description: "The Arena is a 24-hour competitive event. Pay the 50-point entry fee to join, then earn Arena Score by collecting treats during the session. The prize pool builds from entry fees \u2014 top players share it at settlement.",
    tips: [
      ' Entry fee: 50 pts \u2014 goes into the prize pool',
      ' Rank #1 wins 50% of the total pool',
      ' Predict the winner for a 3\u00D7 points payout',
      ' Arena Score = treats collected after joining',
    ],
  },
  {
    emoji: '\u{1F3B0}',
    title: 'Step 6 \u2014 Spin the Daily Wheel',
    color: '#06b6d4',
    badge: 'DAILY SPIN',
    badgeColor: 'rgba(6,182,212,0.15)',
    badgeText: '#06b6d4',
    description: "Once every 24 hours you get a free spin in the Lab. Land on bonus points, extra ingredient slots, XP boosts or rare ingredient drops. Tap the spinning wheel CTA on the main menu to go straight there!",
    tips: [
      ' Free once per day \u2014 don\u2019t miss it',
      ' Prizes: points, XP, extra brews, ingredients',
      ' Spin outcomes appear in the Live Activity feed',
      ' Tap the spinning bubble on the main menu',
    ],
  },
  {
    emoji: '\u{1F3C6}',
    title: 'Step 7 \u2014 Check the Leaderboard',
    color: '#fbbf24',
    badge: 'LEADERBOARD',
    badgeColor: 'rgba(251,191,36,0.15)',
    badgeText: '#fbbf24',
    description: "The Leaderboard ranks all scientists by total Points. Top 50 players earn $LAB token rewards at season end \u2014 the higher your rank, the larger your share. Tap any player's name to see their Stats Card.",
    tips: [
      ' Rank 1 earns the largest $LAB allocation',
      ' Tap a player \u2192 Stats Card shows their breakdown',
      ' Your current rank and points show at the top',
      ' Rankings reset at the start of each new season',
    ],
  },
];

const WalkthroughModal = ({ onClose }) => {
  const [step, setStep] = React.useState(0);
  const navigate = useNavigate();
  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const goTo = (route) => { onClose(); navigate(route); };

  const ROUTE_MAP = {
    'THE LAB':     '/lab',
    'MY TREATS':   '/my-treats',
    'ARENA':       '/arena',
    'LEADERBOARD': '/leaderboard',
    'DAILY SPIN':  '/lab',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(4,3,15,0.92)',
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'linear-gradient(160deg, #0f1623 0%, #080c14 100%)',
        border: `1px solid ${s.color}44`,
        borderRadius: 24,
        boxShadow: `0 0 60px ${s.color}22, 0 20px 60px rgba(0,0,0,0.7)`,
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Progress bar */}
        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)' }}>
          <div style={{
            height: '100%',
            width: `${((step + 1) / STEPS.length) * 100}%`,
            background: `linear-gradient(90deg, ${s.color}, ${s.color}99)`,
            transition: 'width 0.4s ease',
            borderRadius: 99,
          }} />
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 14,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '50%', width: 30, height: 30,
            color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
            fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >{'\u2715'}</button>

        <div style={{ padding: '24px 24px 20px' }}>
          {/* Step counter */}
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.2em',
            color: 'rgba(255,255,255,0.3)', marginBottom: 12,
            textTransform: 'uppercase',
          }}>
            {step + 1} of {STEPS.length}
          </div>

          {/* Emoji + badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, flexShrink: 0,
              background: `${s.color}18`,
              border: `1px solid ${s.color}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28,
              boxShadow: `0 0 24px ${s.color}22`,
            }}>{s.emoji}</div>
            <div>
              <div style={{
                display: 'inline-block',
                background: s.badgeColor, color: s.badgeText,
                fontSize: 9, fontWeight: 800, letterSpacing: '0.18em',
                padding: '3px 10px', borderRadius: 99,
                border: `1px solid ${s.color}44`,
                marginBottom: 5, textTransform: 'uppercase',
              }}>
                {ROUTE_MAP[s.badge] ? (
                  <span
                    style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: `${s.badgeText}66` }}
                    onClick={() => goTo(ROUTE_MAP[s.badge])}
                  >{s.badge} {'\u2197'}</span>
                ) : s.badge}
              </div>
              <h2 style={{
                fontSize: 15, fontWeight: 800, color: '#e2e8f0',
                lineHeight: 1.25, margin: 0,
              }}>{s.title}</h2>
            </div>
          </div>

          {/* Description */}
          <p style={{
            fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6,
            marginBottom: 16,
          }}>{s.description}</p>

          {/* Tips */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12, padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: 6,
            marginBottom: 20,
          }}>
            {s.tips.map((tip, i) => (
              <div key={i} style={{
                fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4,
              }}>{tip}</div>
            ))}
          </div>

          {/* Nav */}
          <div style={{ display: 'flex', gap: 10 }}>
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                style={{
                  flex: 1, padding: '11px 0',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, color: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600,
                }}
              >{'\u2190'} Back</button>
            )}
            <button
              onClick={() => {
                if (isLast) { onClose(); }
                else { setStep(s => s + 1); }
              }}
              style={{
                flex: 2, padding: '11px 0',
                background: `linear-gradient(135deg, ${s.color}33, ${s.color}22)`,
                border: `1px solid ${s.color}66`,
                borderRadius: 12, color: s.color,
                cursor: 'pointer', fontSize: 13, fontWeight: 800,
                letterSpacing: '0.04em',
                boxShadow: `0 0 16px ${s.color}22`,
              }}
            >{isLast ? '\u{1F680} Start Playing!' : 'Next \u2192'}</button>
          </div>

          {/* Skip */}
          {!isLast && (
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button
                onClick={onClose}
                style={{
                  background: 'none', border: 'none',
                  color: 'rgba(255,255,255,0.25)', fontSize: 11,
                  cursor: 'pointer', textDecoration: 'underline',
                }}
              >Skip walkthrough</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DISCLAIMER_SECTIONS = [
  {
    title: '1. Entertainment Purposes Only',
    body: [
      'DogeFood Lab is a blockchain-enabled social gaming experience created primarily for entertainment, creativity, and community engagement.',
      'All gameplay systems, mechanics, rewards, treats, NFTs, and progression features are designed for fun purposes only and should not be interpreted as financial products, investment opportunities, or guaranteed income systems.',
      'The game is intended to provide an enjoyable and interactive experience within the DogeFood ecosystem.',
    ],
  },
  {
    title: '2. No Guaranteed Value of $LAB Token',
    body: [
      'While players may collect, claim, hold, or interact with the $LAB token within the DogeFood Lab ecosystem, DogeFood Lab and its team make absolutely no guarantees regarding:',
    ],
    list: ['Current or future market value', 'Liquidity or tradability', 'Exchange listings', 'Profitability', 'Future utility', 'Price appreciation'],
    after: [
      'The $LAB token may fluctuate in value or hold no monetary value at any given time.',
      'Participation in DogeFood Lab should never be considered an expectation of financial return or profit.',
    ],
  },
  {
    title: '3. Not Financial or Investment Advice',
    body: ['Nothing within DogeFood Lab, including gameplay, rewards, announcements, token systems, NFTs, leaderboards, or community discussions, constitutes:'],
    list: ['Financial advice', 'Investment advice', 'Trading advice', 'Legal advice'],
    after: ['Users are solely responsible for conducting their own research and making their own independent decisions before interacting with any blockchain assets or third-party marketplaces.'],
  },
  {
    title: '4. Blockchain & Technical Risks',
    body: ['By participating in DogeFood Lab, users acknowledge the inherent risks associated with blockchain technology, including but not limited to:'],
    list: ['Wallet vulnerabilities', 'Smart contract risks', 'Network congestion', 'Failed transactions', 'Token volatility', 'Third-party platform failures', 'Loss of access to wallets or private keys'],
    after: ['DogeFood Lab cannot guarantee uninterrupted functionality and shall not be held responsible for losses resulting from blockchain or technical issues beyond our control.'],
  },
  {
    title: '5. User Responsibility',
    body: ['Users are responsible for:'],
    list: ['Securing their wallets and private keys', 'Understanding blockchain transactions', 'Complying with local laws and regulations', 'Using the platform responsibly'],
    after: ['Participation in DogeFood Lab is voluntary and entirely at the user\u2019s own risk.'],
  },
  {
    title: '6. No Guarantees of Earnings',
    body: [
      'DogeFood Lab is designed as a fun-first gaming ecosystem.',
      'Any rewards, points, treats, NFTs, or tokens earned through gameplay are part of the entertainment experience and should not be viewed as employment, salary, passive income, or guaranteed earnings.',
      'Gameplay outcomes and reward systems may change, reset, rebalance, or be removed at any time as the game evolves.',
    ],
  },
  {
    title: '7. Third-Party Platforms',
    body: [
      'DogeFood Lab may integrate with or reference third-party wallets, marketplaces, blockchain networks, social platforms, or services.',
      'We are not responsible for the functionality, security, policies, or availability of third-party services.',
      'Users interact with third-party platforms at their own discretion and risk.',
    ],
  },
  {
    title: '8. Changes to the Game',
    body: ['DogeFood Lab reserves the right to modify, suspend, rebalance, or discontinue any aspect of the game, including:'],
    list: ['Gameplay mechanics', 'Reward systems', 'NFTs', 'Tokens', 'Seasons', 'Features', 'Access methods'],
    after: ['Changes may occur without prior notice.'],
  },
  {
    title: '9. Acceptance of Disclaimer',
    body: [
      'By using DogeFood Lab, you confirm that you understand and accept this disclaimer and acknowledge that DogeFood Lab is fundamentally a community entertainment game experience built around fun, creativity, and experimentation within the Dogecoin ecosystem.',
    ],
  },
];

const DisclaimerModal = ({ onClose }) => {
  return (
    <div
      data-testid="disclaimer-modal"
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(4,3,15,0.92)',
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: '100%', maxWidth: 480, maxHeight: '85vh',
        background: 'linear-gradient(160deg, #0f1623 0%, #080c14 100%)',
        border: '1px solid rgba(56,189,248,0.25)',
        borderRadius: 24,
        boxShadow: '0 0 60px rgba(56,189,248,0.12), 0 20px 60px rgba(0,0,0,0.7)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          position: 'relative', padding: '20px 24px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            data-testid="disclaimer-close-button"
            aria-label="Close disclaimer"
            style={{
              position: 'absolute', top: 14, right: 14,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '50%', width: 30, height: 30,
              color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
              fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >{'\u2715'}</button>
          <h2 style={{
            margin: 0, fontSize: 19, fontWeight: 900, color: '#e2e8f0',
            paddingRight: 36,
          }}>
            DogeFood Lab {'\u2014'} User Disclaimer
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(148,163,184,0.7)' }}>
            Last Updated: June 2026
          </p>
        </div>

        {/* Scrollable body */}
        <div style={{
          padding: '18px 24px 24px',
          overflowY: 'auto',
          color: 'rgba(226,232,240,0.85)',
          fontSize: 13,
          lineHeight: 1.6,
        }}>
          <p style={{ margin: '0 0 10px' }}>
            Welcome to DogeFood Lab. Before participating in the game, claiming rewards, interacting with blockchain features, or using any related services, please carefully read and understand the following disclaimer.
          </p>
          <p style={{ margin: '0 0 20px', color: 'rgba(226,232,240,0.95)', fontWeight: 600 }}>
            By accessing or using DogeFood Lab, you acknowledge and agree to the terms below.
          </p>

          {DISCLAIMER_SECTIONS.map((section, idx) => (
            <div key={idx} style={{
              marginBottom: idx === DISCLAIMER_SECTIONS.length - 1 ? 0 : 20,
              paddingBottom: idx === DISCLAIMER_SECTIONS.length - 1 ? 0 : 16,
              borderBottom: idx === DISCLAIMER_SECTIONS.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
            }}>
              <h3 style={{
                margin: '0 0 8px', fontSize: 13.5, fontWeight: 800,
                color: '#7dd3fc', letterSpacing: '0.01em',
              }}>
                {section.title}
              </h3>
              {section.body.map((p, i) => (
                <p key={i} style={{ margin: '0 0 8px' }}>{p}</p>
              ))}
              {section.list && (
                <ul style={{ margin: '0 0 8px', paddingLeft: 18, listStyle: 'disc' }}>
                  {section.list.map((item, i) => (
                    <li key={i} style={{ margin: '0 0 4px' }}>{item}</li>
                  ))}
                </ul>
              )}
              {section.after && section.after.map((p, i) => (
                <p key={i} style={{ margin: '0 0 8px' }}>{p}</p>
              ))}
            </div>
          ))}

          <p style={{
            margin: '20px 0 0', textAlign: 'center', fontSize: 13, fontWeight: 800,
            color: '#fbbf24', letterSpacing: '0.01em',
          }}>
            Play for fun. Experiment responsibly. Feed the meme.
          </p>
        </div>

        {/* Footer action */}
        <div style={{
          padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            data-testid="disclaimer-acknowledge-button"
            style={{
              width: '100%', padding: '12px', borderRadius: 14,
              background: 'linear-gradient(135deg,#0ea5e9,#3b82f6,#8b5cf6)',
              border: 'none', color: '#fff', fontWeight: 800, fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};

const MENU_RARITY_COLORS = {
  Starter:   'text-amber-400',
  Common:    'text-gray-400',
  Uncommon:  'text-teal-400',
  Rare:      'text-blue-400',
  Epic:      'text-purple-400',
  Legendary: 'text-yellow-400',
  Mythic:    'text-pink-400',
};

// ─── Interactive 7-Day Activity Line Chart (SVG, no extra deps) ──
const ActivityLineChart = ({ daily, metric }) => {
  const [hover, setHover] = useState(null);

  const points = React.useMemo(() => {
    const entries = Object.entries(daily || {})
      .sort(([a], [b]) => new Date(a) - new Date(b));
    return entries.map(([day, data]) => ({
      day,
      value: Number(data?.[metric] || 0),
    }));
  }, [daily, metric]);

  if (!points.length) {
    return (
      <div className="h-32 flex items-center justify-center text-[11px] text-slate-500">
        No activity yet - go craft some treats!
      </div>
    );
  }

  const W = 320, H = 120, PAD_X = 14, PAD_TOP = 14, PAD_BOTTOM = 22;
  const maxV = Math.max(...points.map(p => p.value), 1);
  const stepX = points.length > 1 ? (W - PAD_X * 2) / (points.length - 1) : 0;
  const plotH = H - PAD_TOP - PAD_BOTTOM;

  const coords = points.map((p, i) => ({
    ...p,
    x: PAD_X + i * stepX,
    y: PAD_TOP + (plotH - (p.value / maxV) * plotH),
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${H - PAD_BOTTOM} L ${coords[0].x.toFixed(1)} ${H - PAD_BOTTOM} Z`;

  const METRIC_COLORS = { points: '#38bdf8', treats: '#fbbf24', xp: '#a78bfa' };
  const color = METRIC_COLORS[metric] || '#38bdf8';

  const dayLabel = (day) => {
    const d = new Date(day + 'T12:00:00');
    return d.toLocaleDateString('en', { weekday: 'short' }).slice(0, 1);
  };
  const isToday = (day) => new Date().toDateString() === new Date(day + 'T12:00:00').toDateString();

  return (
    <div className="relative w-full" data-testid="menu-activity-chart">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`menu-area-${metric}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* gridlines */}
        {[0.25, 0.5, 0.75].map((g) => (
          <line
            key={g}
            x1={PAD_X} x2={W - PAD_X}
            y1={PAD_TOP + plotH * g} y2={PAD_TOP + plotH * g}
            stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1"
          />
        ))}

        <path d={areaPath} fill={`url(#menu-area-${metric})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {coords.map((c, i) => (
          <g key={c.day}>
            {/* invisible wide hit area for easy hover/tap */}
            <rect
              x={c.x - Math.max(stepX / 2, 12)} y={0}
              width={Math.max(stepX, 24)} height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => setHover(hover === i ? null : i)}
              style={{ cursor: 'pointer' }}
            />
            <circle
              cx={c.x} cy={c.y}
              r={hover === i ? 5 : 3.5}
              fill={isToday(c.day) ? '#fde047' : color}
              stroke="#0d1117" strokeWidth="2"
            />
            <text
              x={c.x} y={H - 6}
              textAnchor="middle"
              fontSize="9"
              fill={isToday(c.day) ? '#fde047' : '#64748b'}
              fontWeight={isToday(c.day) ? 700 : 400}
            >
              {isToday(c.day) ? '\u2022' : dayLabel(c.day)}
            </text>
          </g>
        ))}
      </svg>

      {hover !== null && (
        <div
          className="absolute -translate-x-1/2 -translate-y-full pointer-events-none px-2 py-1 rounded-md bg-[#0d1117] border border-white/10 shadow-lg whitespace-nowrap"
          style={{
            left: `${(coords[hover].x / W) * 100}%`,
            top: `${(coords[hover].y / H) * 100}%`,
          }}
        >
          <div className="text-[9px] text-slate-400">
            {new Date(coords[hover].day + 'T12:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
          <div className="text-xs font-bold" style={{ color }}>
            {coords[hover].value.toLocaleString()} <span className="text-slate-400 font-normal">{metric}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Menu Player Stats Card (shown under the Scientist card) ─────
const MenuPlayerStats = ({ address, isLoggedIn }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metric, setMetric] = useState('points');

  useEffect(() => {
    if (!isLoggedIn || !address || address === 'GUEST_USER') {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${BACKEND_URL}/api/player-stats/${address}`);
        if (!res.ok) throw new Error('Failed to load your stats');
        const data = await res.json();
        if (!cancelled) setStats(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchStats();
    return () => { cancelled = true; };
  }, [address, isLoggedIn]);

  if (!isLoggedIn) return null;

  const METRICS = [
    { key: 'points', label: 'Points', icon: TrendingUp, color: 'text-sky-400', active: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
    { key: 'treats', label: 'Treats', icon: Beaker, color: 'text-yellow-400', active: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
    { key: 'xp', label: 'XP', icon: Zap, color: 'text-purple-400', active: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  ];

  return (
    <div className="bg-[#151b28] rounded-xl border border-white/[0.06] overflow-hidden" data-testid="menu-player-stats-card">
      <div className="h-0.5 bg-gradient-to-r from-sky-400 via-purple-400 to-yellow-400" />
      <div className="p-3 sm:p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500/20 to-purple-500/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-tight">Your Activity</div>
              <div className="text-[9px] text-slate-500 uppercase tracking-widest">Last 7 Days</div>
            </div>
          </div>
          {stats?.rank && (
            <div className="flex items-center gap-1.5 bg-[#0d1117] rounded-lg px-2.5 py-1.5 border border-yellow-500/20">
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-sm font-black text-white">#{stats.rank}</span>
              <span className="text-[9px] text-slate-500">/ {stats.total_players}</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="h-40 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-sky-500/30 border-t-sky-400 rounded-full animate-spin" />
            <span className="text-[11px] text-slate-500">Loading your stats{'\u2026'}</span>
          </div>
        ) : error ? (
          <div className="h-24 flex items-center justify-center text-[11px] text-red-400" data-testid="menu-player-stats-error">{error}</div>
        ) : stats ? (
          <>
            {/* Arena Activity */}
            <div className="flex items-center gap-1.5 mb-2">
              <Swords className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-[10px] font-semibold text-white uppercase tracking-wide">Arena</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 mb-3">
              <div className="text-center p-2 rounded-lg bg-gradient-to-br from-emerald-900/40 to-green-900/30 border border-emerald-500/20" data-testid="stat-arena-wins">
                <div className="text-base font-black text-emerald-400">{stats.arena?.wins ?? 0}</div>
                <div className="text-[8px] text-emerald-300/70 uppercase">Wins</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-gradient-to-br from-rose-900/40 to-red-900/30 border border-rose-500/20" data-testid="stat-arena-losses">
                <div className="text-base font-black text-rose-400">{stats.arena?.losses ?? 0}</div>
                <div className="text-[8px] text-rose-300/70 uppercase">Losses</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-[#0d1117] border border-white/[0.06]" data-testid="stat-arena-winrate">
                <div className="text-base font-black text-sky-400">{stats.arena?.win_rate ?? 0}%</div>
                <div className="text-[8px] text-slate-400 uppercase">Win Rate</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-[#0d1117] border border-white/[0.06]" data-testid="stat-arena-participation">
                <div className="text-base font-black text-white">{stats.arena?.participations ?? 0}</div>
                <div className="text-[8px] text-slate-400 uppercase">Entries</div>
              </div>
            </div>

            {/* Bonuses */}
            <div className="flex items-center gap-1.5 mb-2">
              <Gift className="w-3.5 h-3.5 text-pink-400" />
              <span className="text-[10px] font-semibold text-white uppercase tracking-wide">Bonuses Earned</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              <div className="text-center p-2 rounded-lg bg-gradient-to-br from-pink-900/40 to-fuchsia-900/30 border border-pink-500/20" data-testid="stat-bonus-total">
                <div className="text-base font-black text-pink-400">+{(stats.bonuses?.total ?? 0).toLocaleString()}</div>
                <div className="text-[8px] text-pink-300/70 uppercase">Total Bonus</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-[#0d1117] border border-white/[0.06]" data-testid="stat-bonus-kernel">
                <div className="text-base font-black text-amber-400">+{(stats.bonuses?.kernel_bonus_total ?? 0).toLocaleString()}</div>
                <div className="text-[8px] text-slate-400 uppercase">Kernel</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-[#0d1117] border border-white/[0.06]" data-testid="stat-bonus-vip">
                <div className="text-base font-black text-yellow-400">+{(stats.bonuses?.vip_bonus ?? 0).toLocaleString()}</div>
                <div className="text-[8px] text-slate-400 uppercase">VIP</div>
              </div>
            </div>

            {/* Core stats */}
            <div className="grid grid-cols-4 gap-1.5 mb-3">
              <div className="text-center p-2 rounded-lg bg-[#0d1117] border border-white/[0.06]" data-testid="stat-treats">
                <div className="text-base font-black text-white">{stats.stats?.treats_created ?? 0}</div>
                <div className="text-[8px] text-slate-400 uppercase">Treats</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-[#0d1117] border border-white/[0.06]" data-testid="stat-points-7d">
                <div className="text-base font-black text-green-400">{(stats.stats?.points_earned ?? 0).toLocaleString()}</div>
                <div className="text-[8px] text-slate-400 uppercase">7d Pts</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-[#0d1117] border border-white/[0.06]" data-testid="stat-xp-7d">
                <div className="text-base font-black text-blue-400">{(stats.stats?.xp_gained ?? 0).toLocaleString()}</div>
                <div className="text-[8px] text-slate-400 uppercase">7d XP</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-[#0d1117] border border-white/[0.06]" data-testid="stat-recipes">
                <div className="text-base font-black text-purple-400">{stats.stats?.unique_formulas ?? 0}</div>
                <div className="text-[8px] text-slate-400 uppercase">Recipes</div>
              </div>
            </div>

            {/* Streak + Best Rarity */}
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              <div className="bg-gradient-to-br from-orange-500/15 to-red-500/15 border border-orange-500/20 rounded-lg p-2 flex items-center gap-2" data-testid="stat-streak">
                <Flame className="w-4 h-4 text-orange-400 shrink-0" />
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-black text-white">{stats.streak?.current ?? 0}</span>
                    <span className="text-[9px] text-orange-300">day streak</span>
                  </div>
                  <div className="text-[9px] text-orange-400/80">{stats.streak?.title || 'New Chef'}</div>
                </div>
              </div>
              <div className="bg-[#0d1117] border border-white/[0.06] rounded-lg p-2 flex items-center gap-2" data-testid="stat-best-rarity">
                <Gem className="w-4 h-4 text-yellow-400 shrink-0" />
                <div>
                  <div className={`text-base font-black ${MENU_RARITY_COLORS[stats.stats?.best_rarity] || 'text-white'}`}>
                    {stats.stats?.best_rarity || 'None'}
                  </div>
                  <div className="text-[9px] text-slate-400">Best Find</div>
                </div>
              </div>
            </div>

            {/* Interactive Line Chart */}
            <div className="bg-[#0d1117] rounded-lg border border-white/[0.06] p-2.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-[10px] font-semibold text-white uppercase tracking-wide">Activity Trend</span>
                </div>
                <div className="flex items-center gap-1">
                  {METRICS.map((m) => {
                    const Icon = m.icon;
                    const isActive = metric === m.key;
                    return (
                      <button
                        key={m.key}
                        onClick={() => setMetric(m.key)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[9px] font-semibold transition-colors ${
                          isActive ? m.active : 'border-white/[0.06] text-slate-500 hover:text-slate-300'
                        }`}
                        data-testid={`chart-metric-${m.key}`}
                      >
                        <Icon className="w-3 h-3" />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <ActivityLineChart daily={stats.daily_breakdown} metric={metric} />
            </div>

            <div className="text-center text-[8px] text-slate-600 mt-2">Tap a point to inspect a day</div>
          </>
        ) : null}
      </div>
    </div>
  );
};

const MainMenu = ({ playerAddress: playerAddressProp } = {}) => {
  const { address, isConnected } = useEffectiveAccount();
  const { nftBalance, isNFTHolder, loading: nftLoading } = useNFTVerification();
  const { user, currentLevel, points, dispatch, loadPlayerData } = useGame();
  const { telegramUser, isTelegram } = useTelegram();
  const { showPlayer } = useMusic();
  const navigate = useNavigate();

  useEffect(() => { showPlayer(); }, [showPlayer]);

  const [showWalkthrough, setShowWalkthrough] = useState(() => {
    try { return !localStorage.getItem(WALKTHROUGH_KEY); }
    catch { return false; }
  });
  const closeWalkthrough = React.useCallback(() => {
    try { localStorage.setItem(WALKTHROUGH_KEY, '1'); } catch {}
    setShowWalkthrough(false);
  }, []);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showGuestSignup, setShowGuestSignup] = useState(false);
  const [guestUsername, setGuestUsername] = useState('');
  const [guestSignupError, setGuestSignupError] = useState('');
  const [guestSignupLoading, setGuestSignupLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [gameStats, setGameStats] = useState(null);
  const [happyHour, setHappyHour] = useState(null);
  const [activityTab, setActivityTab] = useState('live');

  const [guestUser, setGuestUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dogefood_player')); } catch { return null; }
  });
  const [playerLevel, setPlayerLevel] = useState(1);
  const [playerPoints, setPlayerPoints] = useState(0);
  const [profileLoaded, setProfileLoaded] = useState(false);  // true once first profile fetch completes

  const isLoggedIn = isConnected || guestUser || (isTelegram && telegramUser);
  // Prefer the address passed down from App.js (same value the Lab page uses,
  // built once as `TG_${telegramUser.id}` uppercase) so menu and Lab never disagree.
  // Only fall back to building it locally if MainMenu is ever rendered without the prop.
  const effectiveAddress = (playerAddressProp && playerAddressProp !== 'GUEST_USER')
    ? playerAddressProp
    : (address || guestUser?.guest_id || guestUser?.id || (telegramUser ? `TG_${telegramUser.id}` : null));
  const effectiveLevel = (isConnected && currentLevel) ? currentLevel : playerLevel;
  // Once the profile fetch has completed (profileLoaded=true), always use playerPoints
  // — even if it's 0. Only fall back to GameContext points before the first fetch.
  const effectivePoints = profileLoaded ? playerPoints : (points || 0);
  const isAuthenticated = isConnected || isTelegram || guestUser;

  const handleReferralClick = () => {
    navigate('/settings', { state: { tab: 'referral' } });
  };

  const loadGuestProfile = async (playerId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/player/${playerId}/profile`);
      if (res.ok) {
        const p = await res.json();
        if (!p.nickname) {
          console.warn('[Guest profile] fetch succeeded but no nickname came back for', playerId, p);
        }
        setUsername(p.nickname || '');
        setProfileImage(p.profile_image || null);
        setPlayerLevel(p.level || 1);
        setPlayerPoints(p.points || 0);
      } else {
        console.warn('[Guest profile] fetch failed:', playerId, res.status);
      }
    } catch (e) {
      console.error('[Guest profile] fetch threw:', playerId, e);
    } finally {
      // Always mark loaded, success or not — otherwise a failed/erroring
      // fetch leaves effectivePoints stuck reading the wrong fallback
      // indefinitely instead of just showing what we already have from
      // localStorage.
      setProfileLoaded(true);
    }
  };

  useEffect(() => {
    const load = () => {
      // A wallet connection fully supersedes a guest identity. Without
      // this guard, this effect — which used to run once on mount with
      // no awareness of wallet state — would read the leftover guest
      // record from localStorage and overwrite the correct wallet-linked
      // username/points with stale guest data. That's what was causing
      // points to disappear on the main menu, every session, for anyone
      // who started as a guest and later connected a wallet: this effect
      // reliably resolves (it's just a localStorage read) before wagmi
      // finishes confirming the wallet connection, so the guest data
      // "won" the race by default.
      if (isConnected && address) {
        try { localStorage.removeItem('dogefood_player'); } catch {}
        return;
      }
      try {
        const p = JSON.parse(localStorage.getItem('dogefood_player'));
        if (p) {
          setGuestUser(p);
          setUsername(p.username || '');
          const id = p.guest_id || p.id || p.address;
          if (id) loadGuestProfile(id);
        }
      } catch {}
    };
    load();
    const onStorage = (e) => { if (e.key === 'dogefood_player') load(); };
    const onReg = () => load();
    window.addEventListener('storage', onStorage);
    window.addEventListener('dogefood_player_registered', onReg);
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('dogefood_player_registered', onReg); };
  }, [isConnected, address]);

  useEffect(() => {
    if (isConnected && address) {
      fetch(`${BACKEND_URL}/api/player/${address}/profile`)
        .then(r => r.ok ? r.json() : null)
        .then(p => {
          if (p) {
            setUsername(p.nickname || '');
            setProfileImage(p.profile_image || null);
            setPlayerLevel(p.level || 1);
            setPlayerPoints(p.points || 0);
          }
        })
        .catch((e) => {
          console.warn('[Wallet profile] fetch failed:', address, e?.message || e);
        })
        .finally(() => {
          // Always mark loaded, success or not — mirrors loadGuestProfile's
          // own fallback, so a transient failure here can't leave stale
          // guest data (or the pre-fetch GameContext fallback) stuck on
          // screen indefinitely.
          setProfileLoaded(true);
        });
    }
  }, [isConnected, address]);

  useEffect(() => {
    if (!isTelegram || !telegramUser || !effectiveAddress) return;

    const fetchTgProfile = async () => {
      try {
        // Same endpoint + same address format the Lab page uses, so menu
        // and Lab can never disagree on points again.
        const res = await fetch(`${BACKEND_URL}/api/player/${effectiveAddress}`);
        if (!res.ok) {
          setProfileLoaded(true);
          return;
        }
        const p = await res.json();
        // p.points may be 0 legitimately — use nullish coalescing, not ||
        setUsername(p.nickname || telegramUser.first_name || '');
        setProfileImage(p.profile_image ?? null);
        setPlayerLevel(p.level ?? 1);
        setPlayerPoints(p.points ?? 0);
        setProfileLoaded(true);
      } catch {
        setProfileLoaded(true);
      }
    };

    // Fetch immediately
    fetchTgProfile();

    // Poll every 30 s to pick up points earned in the Lab
    const pollInterval = setInterval(fetchTgProfile, 30_000);

    // Also re-fetch instantly when the player navigates back to this page
    // Telegram mini-apps fire visibilitychange + focus when the user returns
    const onVisible = () => { if (document.visibilityState === 'visible') fetchTgProfile(); };
    const onFocus   = () => fetchTgProfile();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [isTelegram, telegramUser, effectiveAddress]);

  useEffect(() => {
    if (isConnected && address && !nftLoading) {
      dispatch({ type: 'SET_USER', payload: { address, isNFTHolder, nftBalance } });

      // If they were playing as a Guest before connecting, move that
      // progress onto the wallet address first, so loadPlayerData below
      // finds the real pet/points/etc. instead of treating them as new.
      let activeGuest = null;
      try { activeGuest = JSON.parse(localStorage.getItem('dogefood_player')); } catch {}

      if (activeGuest?.auth_type === 'guest' && activeGuest?.id) {
        fetch(`${BACKEND_URL}/api/players/link-guest-to-wallet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guest_player_id: activeGuest.id, wallet_address: address }),
        })
          .then((r) => r.json())
          .then((result) => {
            if (result?.merged) {
              console.log('✅ Guest progress linked to wallet:', result);
              // Only retire the guest identity on confirmed success — if
              // the merge didn't happen, keep it so nothing is lost and
              // it can be retried or investigated later.
              localStorage.removeItem('dogefood_player');
              setGuestUser(null);
            }
          })
          .catch(() => {})
          .finally(() => {
            loadPlayerData(address);
          });
      } else {
        loadPlayerData(address);
      }
    } else if (!isConnected) {
      dispatch({ type: 'SET_USER', payload: null });
    }
  }, [isConnected, address, isNFTHolder, nftBalance, nftLoading, dispatch, loadPlayerData]);

  useEffect(() => {
    Promise.all([
      fetch(`${BACKEND_URL}/api/stats`).then(r => r.ok ? r.json() : null),
      fetch(`${BACKEND_URL}/api/happy-hour/status`).then(r => r.ok ? r.json() : null)
    ]).then(([stats, hh]) => {
      if (stats) setGameStats(stats);
      if (hh) setHappyHour(hh);
    }).catch(() => {});
  }, []);

  const handleLabAccess = (e) => { if (!isAuthenticated) { e.preventDefault(); setShowAuthModal(true); } };

  const handleProfileImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.size > 2 * 1024 * 1024) { if (file) alert('Image must be less than 2MB'); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      setProfileImage(ev.target.result);
      try { await fetch(`${BACKEND_URL}/api/player/${effectiveAddress}/profile-image`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: ev.target.result }) }); } catch {}
    };
    reader.readAsDataURL(file);
  };

  const handleSaveUsername = async () => {
    if (!usernameInput.trim()) { setUsernameError('Username cannot be empty'); return; }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(usernameInput)) { setUsernameError('3-20 chars, alphanumeric + underscores'); return; }
    setSavingUsername(true); setUsernameError('');
    try {
      const r = await fetch(`${BACKEND_URL}/api/player/${effectiveAddress}/update-username?username=${encodeURIComponent(usernameInput)}`, { method: 'POST' });
      if (r.ok) {
        setUsername(usernameInput);
        setIsEditingUsername(false);
        // Re-fetch profile to keep points and level in sync
        try {
          const profileRes = await fetch(`${BACKEND_URL}/api/player/${effectiveAddress}`);
          if (profileRes.ok) {
            const p = await profileRes.json();
            setPlayerPoints(p.points ?? 0);
            setPlayerLevel(p.level ?? 1);
          }
        } catch {}
      }
      else { const d = await r.json(); setUsernameError(d.detail || 'Failed'); }
    } catch { setUsernameError('Failed to save'); }
    finally { setSavingUsername(false); }
  };

  const handleGuestSignup = async () => {
    if (!guestUsername || guestUsername.length < 3) { setGuestSignupError('Min 3 characters'); return; }
    if (guestUsername.length > 20) { setGuestSignupError('Max 20 characters'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(guestUsername)) { setGuestSignupError('Letters, numbers, underscores only'); return; }
    setGuestSignupLoading(true); setGuestSignupError('');
    try {
      const r = await fetch(`${BACKEND_URL}/api/players/guest-register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: guestUsername }) });
      const d = await r.json();
      if (!r.ok) { setGuestSignupError(d.detail || 'Failed'); setGuestSignupLoading(false); return; }
      localStorage.setItem('dogefood_player', JSON.stringify({ id: d.player_id, guest_id: d.guest_id, username: d.username, auth_type: 'guest' }));
      setGuestUser({ id: d.player_id, guest_id: d.guest_id, username: d.username, auth_type: 'guest' });
      window.dispatchEvent(new Event('dogefood_player_registered'));
      setShowAuthModal(false); setShowGuestSignup(false); setGuestSignupLoading(false);
      navigate('/lab');
    } catch { setGuestSignupError('Network error'); setGuestSignupLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0d1117]" data-testid="main-menu">

      {/* ─── Top Header ──────────────────────────────────── */}
      <header className="z-40 bg-[#0d1117] border-b border-white/[0.06]">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 h-[56px] flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <DogeFoodLogo size="small" showText={false} showBeta={false} className="shrink-0" />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            {gameStats && (
              <div className="hidden sm:flex items-center gap-3 bg-[#151b28] rounded-xl px-3 py-1.5 border border-white/[0.06]">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-xs font-semibold text-white">{gameStats.total_players}</span>
                </div>
                <div className="w-px h-4 bg-white/10" />
                <div className="flex items-center gap-1.5">
                  <Beaker className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-xs font-semibold text-white">{(gameStats.total_treats || 0).toLocaleString()}</span>
                </div>
              </div>
            )}

            {isLoggedIn && (
              <div className="flex items-center gap-1.5 bg-[#151b28] rounded-xl px-2.5 py-1.5 border border-white/[0.06]">
                {isNFTHolder && <Crown className="w-3.5 h-3.5 text-yellow-400" />}
                <span className="text-xs font-bold text-sky-400 tabular-nums">{(effectivePoints || 0).toLocaleString()}</span>
                <span className="text-[10px] text-slate-500">pts</span>
              </div>
            )}

            <ThemeToggle className="!p-1.5 !w-8 !h-8" />

            <DogeConnectButton>
              {({ account, chain, openAccountModal, openConnectModal, openChainModal, mounted, authenticationStatus }) => {
                const ready = mounted && authenticationStatus !== 'loading';
                const connected = ready && account && chain && (!authenticationStatus || authenticationStatus === 'authenticated');
                if (!ready) return <div style={{ opacity: 0, pointerEvents: 'none' }} />;
                if (!connected) return (
                  <button
                    onClick={() => { if (typeof openConnectModal === 'function') { openConnectModal(); } }}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold h-8 sm:h-9 px-3 sm:px-4 rounded-xl transition-colors"
                    data-testid="connect-wallet-btn"
                  >
                    <Wallet className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Connect</span>
                  </button>
                );
                if (chain.unsupported) return (
                  <button
                    onClick={() => { if (typeof openChainModal === 'function') { openChainModal(); } else if (typeof openAccountModal === 'function') { openAccountModal(); } }}
                    className="bg-red-500/20 text-red-400 text-xs font-semibold h-8 sm:h-9 px-3 rounded-xl border border-red-500/30"
                    data-testid="switch-network-btn"
                  >
                    Switch Network
                  </button>
                );
                return (
                  <button
                    onClick={openAccountModal}
                    className="flex items-center gap-1.5 bg-[#151b28] hover:bg-white/[0.06] border border-white/[0.06] text-white text-xs font-semibold h-8 sm:h-9 px-3 rounded-xl transition-colors"
                  >
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center">
                      <User className="w-2.5 h-2.5 text-white" />
                    </div>
                    <span className="font-mono text-slate-300 hidden sm:inline">{account.address.slice(0, 4)}...{account.address.slice(-3)}</span>
                  </button>
                );
              }}
            </DogeConnectButton>
          </div>
        </div>
      </header>

      <MobileNavStrip onAuthRequired={handleLabAccess} />

      <div className="max-w-[1600px] mx-auto flex">

        <Sidebar onAuthRequired={handleLabAccess} onReferralClick={handleReferralClick} />

        <main className="flex-1 min-w-0 px-3 sm:px-5 py-4 space-y-4 sm:space-y-5">

          {/* ── Player Points Ticker ── */}
          <PlayerTickerCarousel />
          
          {/* ── Crate Banner ── */}
          <div className="w-full overflow-hidden rounded-xl" data-testid="crate-banner-menu">
            <img
              src="/Cratebanner.png"
              alt="Crates"
              className="w-full h-auto block"
            />
          </div>
          
          {/* ── Mobile: Share & Earn + Quick Stats ── */}
          <div className="lg:hidden space-y-3">
            <button
              onClick={handleReferralClick}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 transition-all text-white text-sm font-semibold shadow-lg shadow-sky-500/20"
              data-testid="mobile-share-earn"
            >
              <Share2 className="w-4 h-4" />
              <span>Share & Earn</span>
            </button>
            {gameStats && (
              <div className="flex items-center gap-2 overflow-x-auto">
                <div className="flex items-center gap-1.5 bg-[#151b28] rounded-lg px-3 py-1.5 border border-white/[0.06] shrink-0">
                  <Users className="w-3 h-3 text-sky-400" />
                  <span className="text-[11px] font-semibold text-white">{gameStats.total_players}</span>
                  <span className="text-[9px] text-slate-500">players</span>
                </div>
                <div className="flex items-center gap-1.5 bg-[#151b28] rounded-lg px-3 py-1.5 border border-white/[0.06] shrink-0">
                  <Beaker className="w-3 h-3 text-yellow-400" />
                  <span className="text-[11px] font-semibold text-white">{(gameStats.total_treats || 0).toLocaleString()}</span>
                  <span className="text-[9px] text-slate-500">treats</span>
                </div>
                <div className="flex items-center gap-1.5 bg-[#151b28] rounded-lg px-3 py-1.5 border border-white/[0.06] shrink-0">
                  <Crown className="w-3 h-3 text-yellow-400" />
                  <span className="text-[11px] font-semibold text-white">{gameStats.nft_holders}</span>
                  <span className="text-[9px] text-slate-500">VIP</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Player Profile Card ── */}
          {isLoggedIn && (
            <div className="bg-[#151b28] rounded-xl border border-white/[0.06] overflow-hidden" data-testid="player-profile-card">
              <div className="h-0.5 bg-gradient-to-r from-yellow-400 via-sky-400 to-purple-400" />
              <div className="p-3 sm:p-4 flex items-center gap-3">
                <label htmlFor="profile-upload" className="cursor-pointer block relative group shrink-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-2 border-sky-500/20">
                    {profileImage ? (
                      <img src={profileImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-sky-600 to-indigo-700 flex items-center justify-center">
                        <User className="w-5 h-5 text-white/70" />
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-3.5 h-3.5 text-white" />
                  </div>
                  {isNFTHolder && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                      <Crown className="w-2.5 h-2.5 text-yellow-900" />
                    </div>
                  )}
                </label>
                <input id="profile-upload" type="file" accept="image/*" className="hidden" onChange={handleProfileImageUpload} />

                <div className="flex-1 min-w-0">
                  <div className="text-[9px] text-sky-400/70 uppercase tracking-widest font-semibold">Scientist</div>
                  {!isEditingUsername ? (
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm sm:text-base text-white truncate">{username || 'Set username'}</span>
                      <button onClick={() => { setUsernameInput(username); setIsEditingUsername(true); setUsernameError(''); }} className="p-0.5 hover:bg-white/10 rounded" title="Edit username">
                        <Edit2 className="w-3 h-3 text-sky-400/50" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Input value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} placeholder="Username" className="w-28 h-7 text-xs bg-[#0d1117] border-sky-400/30 text-white" maxLength={20} />
                      <Button size="sm" onClick={handleSaveUsername} disabled={savingUsername} className="bg-sky-500 h-7 px-2"><Check className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setIsEditingUsername(false)} className="h-7 px-1 text-white/50"><X className="w-3 h-3" /></Button>
                      {usernameError && <span className="text-[9px] text-red-400">{usernameError}</span>}
                    </div>
                  )}
                </div>

                <div className="hidden sm:flex items-center gap-3 bg-[#0d1117] rounded-xl px-4 py-2 border border-white/[0.06]">
                  <div className="text-center">
                    <div className="text-[9px] text-slate-500 uppercase">Level</div>
                    <div className="text-sm font-bold text-yellow-400">{effectiveLevel || 1}</div>
                  </div>
                  <div className="w-px h-6 bg-white/10" />
                  <div className="text-center">
                    <div className="text-[9px] text-slate-500 uppercase">Points</div>
                    <div className="text-sm font-bold text-sky-400 tabular-nums">{(effectivePoints || 0).toLocaleString()}</div>
                  </div>
                  {isNFTHolder && (
                    <>
                      <div className="w-px h-6 bg-white/10" />
                      <div className="text-center">
                        <Crown className="w-4 h-4 text-yellow-400 mx-auto" />
                        <div className="text-[9px] text-yellow-400 font-bold">VIP</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Player Stats / Activity Card (under the Scientist card) ── */}
          <MenuPlayerStats address={effectiveAddress} isLoggedIn={isLoggedIn} />

          {/* ── Three Promotional Banners ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <PromoBanner
              icon={Crown}
              iconBg="bg-gradient-to-br from-purple-500 to-indigo-600"
              title="VIP Club"
              subtitle="Hold DogeFood NFT for 500 bonus points & VIP status!"
              borderColor="border-purple-500/20"
              gradientFrom="from-purple-900/30"
              gradientTo="to-indigo-900/20"
              onClick={() => navigate('/nfts')}
              testId="promo-vip-club"
            />
            <PromoBanner
              icon={Trophy}
              iconBg="bg-gradient-to-br from-emerald-500 to-green-600"
              title="Leaderboard"
              subtitle="Become one of the top 50 scientists!"
              borderColor="border-emerald-500/20"
              gradientFrom="from-emerald-900/30"
              gradientTo="to-green-900/20"
              onClick={() => navigate('/leaderboard')}
              testId="promo-leaderboard"
            />
            <PromoBanner
              icon={UserPlus}
              iconBg="bg-gradient-to-br from-emerald-600 to-green-700"
              title="Refer & Earn"
              subtitle="Invite friends & earn bonus rewards together!"
              borderColor="border-emerald-600/20"
              gradientFrom="from-emerald-950/40"
              gradientTo="to-green-950/30"
              onClick={handleReferralClick}
              testId="promo-refer-earn"
            />
          </div>

          {/* ── Featured Banner (Lab CTA + Happy Hour) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link to="/lab" onClick={handleLabAccess}>
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2744] to-[#151b28] border border-sky-500/15 p-5 sm:p-6 hover:border-sky-400/30 hover:-translate-y-0.5 transition-all duration-200 group"
                style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)' }}
                data-testid="enter-lab-btn">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent rounded-2xl pointer-events-none" />
                <div className="absolute top-0 right-0 w-40 h-40 bg-sky-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-200"
                    style={{ boxShadow: '0 8px 24px rgba(234,179,8,0.3)' }}>
                    <Beaker className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-0.5">Enter the Lab</h3>
                    <p className="text-xs text-slate-400">Mix ingredients & create magical dogetreats</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-sky-400 font-medium flex items-center gap-1">
                        Start mixing <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            <div className={`relative overflow-hidden rounded-2xl p-5 sm:p-6 border transition-all duration-200 hover:-translate-y-0.5 ${
              happyHour?.active
                ? 'bg-gradient-to-br from-[#2a2a0d] to-[#1a1a08] border-yellow-500/20'
                : 'bg-gradient-to-br from-[#151b28] to-[#0d1117] border-white/[0.06]'
            }`}
              style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent rounded-2xl pointer-events-none" />
              <div className="relative flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  happyHour?.active ? 'bg-gradient-to-br from-yellow-400 to-yellow-500' : 'bg-gradient-to-br from-slate-600 to-slate-700'
                }`} style={{ boxShadow: happyHour?.active ? '0 8px 24px rgba(234,179,8,0.3)' : '0 4px 12px rgba(0,0,0,0.3)' }}>
                  <Clock className={`w-8 h-8 ${happyHour?.active ? 'text-white' : 'text-slate-300'} drop-shadow-md`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-lg font-bold text-white">Happy Hour</h3>
                    {happyHour?.active && (
                      <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold animate-pulse">LIVE</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">+25% bonus points daily at 15:00 UTC</p>
                  <div className="mt-2">
                    {happyHour?.active ? (
                      <span className="text-xs text-yellow-400 font-semibold">Bonus active now!</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span className="text-[10px] text-slate-500">Next: {happyHour?.start_hour_utc || 15}:00 UTC</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Feature Cards ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wide">Features</h2>
              </div>
              <Link to="/settings" className="text-[11px] text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1">
                See All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
              <FeatureCard icon={Beaker} label="Lab" gradient="from-yellow-500/20 to-yellow-600/10" iconColor="text-yellow-300" borderColor="border-yellow-500/15" to="/lab" onClick={handleLabAccess} testId="feature-lab" />
              <FeatureCard icon={Swords} label="Arena" gradient="from-slate-600/40 to-slate-900/25" iconColor="text-slate-200" borderColor="border-slate-500/30" to="/arena" badge="LIVE" testId="feature-arena" />
              <FeatureCard icon={Settings} label="Auto-Mix" gradient="from-sky-500/20 to-indigo-600/10" iconColor="text-sky-300" borderColor="border-sky-500/15" to="/settings" state={{ tab: 'auto-mixer' }} badge="AI" testId="feature-auto-mixer" />
              <FeatureCard icon={Palette} label="Treats" gradient="from-purple-500/20 to-pink-600/10" iconColor="text-purple-300" borderColor="border-purple-500/15" to="/nfts" testId="feature-treats" />
              <FeatureCard icon={Store} label="Market" gradient="from-sky-500/20 to-cyan-600/10" iconColor="text-sky-300" borderColor="border-sky-500/15" to="/marketplace" testId="feature-market" />
              <FeatureCard icon={Crown} label="Tourney" gradient="from-yellow-500/20 to-yellow-600/10" iconColor="text-yellow-300" borderColor="border-yellow-500/15" to="/tournament" testId="feature-tournament" />
              <FeatureCard icon={TrendingUp} label="Lab Surge" gradient="from-emerald-500/20 to-amber-500/10" iconColor="text-emerald-300" borderColor="border-emerald-500/20" to="/lab-surge" badge="NEW" testId="feature-lab-surge" />
              <FeatureCard icon={Newspaper} label="Lab Feed" gradient="from-slate-300/30 to-slate-400/15" iconColor="text-slate-100" borderColor="border-slate-300/30" to="/lab-feed" testId="feature-lab-feed" />
              <FeatureCard icon={Rocket} label="Launcher" gradient="from-fuchsia-500/20 to-violet-600/10" iconColor="text-fuchsia-300" borderColor="border-fuchsia-500/20" to="/lab-launcher" badge="NEW" testId="feature-lab-launcher" />
            </div>
          </div>

          {/* ── Points Swap Widget ── */}
          <PointsSwapWidget
            playerPoints={effectivePoints || 0}
            isLoggedIn={!!isLoggedIn}
            effectiveAddress={effectiveAddress}
          />

          {/* ── Live Activity Table ── */}
          <div className="bg-[#151b28] rounded-xl border border-white/[0.06] overflow-hidden">
            <div className="flex items-center gap-0 border-b border-white/[0.06]">
              {[
                { key: 'live', label: 'Live Activity', color: 'text-emerald-400' },
                { key: 'stats', label: 'Game Stats', color: 'text-sky-400' },
              ].map((tab) => (
                <button key={tab.key} onClick={() => setActivityTab(tab.key)}
                  className={`px-4 py-3 text-xs font-semibold transition-colors relative ${activityTab === tab.key ? `${tab.color}` : 'text-slate-500 hover:text-slate-300'}`}
                  data-testid={`activity-tab-${tab.key}`}>
                  <div className="flex items-center gap-1.5">
                    {tab.key === 'live' && (
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative rounded-full h-1.5 w-1.5 bg-emerald-500" />
                      </span>
                    )}
                    {tab.label}
                  </div>
                  {activityTab === tab.key && (
                    <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${tab.key === 'live' ? 'bg-emerald-400' : 'bg-sky-400'}`} />
                  )}
                </button>
              ))}
            </div>
            {activityTab === 'live' ? (
              <LiveActivityTable />
            ) : (
              <div className="p-4">
                {gameStats ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-[#0d1117] rounded-xl p-3 border border-white/[0.04] text-center">
                      <Users className="w-5 h-5 text-sky-400 mx-auto mb-1.5" />
                      <div className="text-lg font-bold text-white">{gameStats.total_players}</div>
                      <div className="text-[10px] text-slate-500">Total Players</div>
                    </div>
                    <div className="bg-[#0d1117] rounded-xl p-3 border border-white/[0.04] text-center">
                      <Crown className="w-5 h-5 text-yellow-400 mx-auto mb-1.5" />
                      <div className="text-lg font-bold text-yellow-400">{gameStats.nft_holders}</div>
                      <div className="text-[10px] text-slate-500">VIP Holders</div>
                    </div>
                    <div className="bg-[#0d1117] rounded-xl p-3 border border-white/[0.04] text-center">
                      <Beaker className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
                      <div className="text-lg font-bold text-emerald-400">{(gameStats.total_treats || 0).toLocaleString()}</div>
                      <div className="text-[10px] text-slate-500">Total Treats</div>
                    </div>
                    <div className="bg-[#0d1117] rounded-xl p-3 border border-white/[0.04] text-center">
                      <Clock className="w-5 h-5 text-purple-400 mx-auto mb-1.5" />
                      <div className="text-lg font-bold text-white"><SeasonCountdown compact /></div>
                      <div className="text-[10px] text-slate-500">Season Ends</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 text-xs">Loading stats...</div>
                )}
              </div>
            )}
          </div>

          {/* ── Pack Leaders (mobile) ── */}
          <div className="lg:hidden">
            <PackLeaders />
          </div>

          {/* ── Mobile Season Rewards Chart ── */}
          <div className="lg:hidden bg-[#151b28] rounded-xl border border-white/[0.06] overflow-hidden" data-testid="mobile-emissions-chart">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-bold text-white flex-1">Season Rewards</span>
              <LabCoin size={16} />
            </div>
            <div className="mx-3 mt-3 p-2.5 rounded-xl bg-gradient-to-br from-indigo-900/30 to-purple-900/20 border border-indigo-500/15">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shrink-0">
                  <span className="text-white font-black text-xs leading-none">S2</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Season 2 Ends</div>
                  <div className="text-[10px] text-indigo-300/70 mt-0.5"><SeasonCountdown compact /></div>
                </div>
              </div>
            </div>
            <div className="h-[350px] overflow-hidden">
              <SeasonEmissionsChart />
            </div>
          </div>

          <div className="lg:hidden py-4 flex flex-col items-center">
            <DogeFoodLogo size="medium" showText={false} showBeta={false} />
            <div className="text-[10px] text-white mt-2 text-center">Built with love for the Dogecoin community</div>
          </div>

          <div className="text-center py-6">
            <div className="text-[10px] text-white uppercase tracking-widest mb-3">Powered by</div>
            <img src="https://customer-assets.emergentagent.com/job_dogefoodlab/artifacts/ckey490s_20250812_154617.jpg" alt="DOGEOS" className="max-w-[220px] sm:max-w-[380px] mx-auto rounded-lg border border-white/10" />
          </div>
        </main>

        {/* RIGHT SIDEBAR — Season Rewards Chart (Desktop only) */}
        <aside className="hidden lg:flex flex-col w-80 shrink-0 border-l border-white/[0.06]" data-testid="emissions-sidebar">
          <div className="px-3 pt-3">
            <PackLeaders />
          </div>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-white flex-1">Season Rewards</span>
            <LabCoin size={16} />
          </div>
          <div className="mx-3 mt-3 p-3 rounded-xl bg-gradient-to-br from-indigo-900/30 to-purple-900/20 border border-indigo-500/15">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shrink-0">
                <span className="text-white font-black text-sm leading-none">S2</span>
              </div>
              <div>
                <div className="text-xs font-bold text-white">Season 2 Ends</div>
                <div className="text-[10px] text-indigo-300/70 mt-0.5"><SeasonCountdown compact /></div>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-hidden mt-2">
            <SeasonEmissionsChart />
          </div>
        </aside>
      </div>

      {/* ─── Social Links Footer ─── */}
      <footer
        data-testid="menu-social-footer"
        className="px-4 sm:px-6 mt-6 mb-4 pb-24 sm:pb-6 flex flex-col items-center gap-2.5"
      >
        <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-mono">
          Join the Pack
        </div>
        <div className="flex items-center gap-3">
          <a
            data-testid="social-twitter-link"
            href="https://x.com/DogeOsFoodNFT"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow DogeFood Lab on X (Twitter)"
            className="group w-11 h-11 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 flex items-center justify-center transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-6px_rgba(255,255,255,0.25)]"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 text-white/80 group-hover:text-white transition-colors"
              fill="currentColor"
              aria-hidden
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25h6.834l4.713 6.231 5.443-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
            </svg>
          </a>
          <a
            data-testid="social-telegram-link"
            href="https://t.me/DogeFoodonDogeOS"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Join DogeFood Lab on Telegram"
            className="group w-11 h-11 rounded-2xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/30 hover:border-sky-400/60 flex items-center justify-center transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-6px_rgba(56,189,248,0.45)]"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 text-sky-300 group-hover:text-sky-200 transition-colors"
              fill="currentColor"
              aria-hidden
            >
              <path d="M21.94 4.193 18.86 19.18c-.232 1.027-.84 1.282-1.7.799l-4.7-3.46-2.27 2.18c-.252.252-.462.462-.945.462l.336-4.768 8.683-7.847c.378-.336-.084-.523-.588-.187l-10.74 6.76-4.625-1.45c-1.005-.315-1.026-1.005.21-1.488L20.55 2.77c.84-.315 1.575.187 1.39 1.423Z" />
            </svg>
          </a>
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">
          @DogeOsFoodNFT {'\u00B7'} t.me/DogeFoodonDogeOS
        </div>
        <button
          onClick={() => setShowDisclaimer(true)}
          data-testid="open-disclaimer-button"
          className="text-[10px] text-slate-600 hover:text-slate-400 underline underline-offset-2 transition-colors mt-1"
        >
          Disclaimer
        </button>
      </footer>

      {showDisclaimer && <DisclaimerModal onClose={() => setShowDisclaimer(false)} />}


      <SpinWheelCTA />

      {/* Mega Lab Crate — recurring bonus for max-tier (Mythic Lab) Shiba owners */}
      <MegaCrateSystem
        playerAddress={effectiveAddress}
        onOpened={(data) => {
          // Best-effort optimistic bump so the points shown on this page
          // don't lag behind until the next full profile refetch.
          if (data?.points_granted) {
            setPlayerPoints(p => (p || 0) + data.points_granted);
          }
        }}
      />

      {/* Walkthrough "?" re-open button — bottom-left corner */}
      <button
        onClick={() => setShowWalkthrough(true)}
        title="Game Guide"
        style={{
          position: 'fixed', bottom: 90, left: 16, zIndex: 997,
          width: 38, height: 38, borderRadius: '50%',
          background: 'rgba(15,22,35,0.9)',
          border: '1.5px solid rgba(56,189,248,0.4)',
          color: '#38bdf8', fontSize: 16, fontWeight: 900,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(6px)',
          boxShadow: '0 2px 12px rgba(56,189,248,0.2)',
        }}
        aria-label="Open game guide"
      >?</button>

      {showWalkthrough && <WalkthroughModal onClose={closeWalkthrough} />}

      <MusicPlayer />

      {/* ─── Auth Modal ── */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" data-testid="auth-modal">
          <div className="bg-[#151b28] rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-white/[0.06] relative">
            <button onClick={() => { setShowAuthModal(false); setShowGuestSignup(false); }} className="absolute top-4 right-4 text-slate-400 hover:text-white" data-testid="auth-modal-close">
              <X className="w-5 h-5" />
            </button>
            {!showGuestSignup ? (
              <>
                <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"><Beaker className="w-7 h-7 text-white" /></div>
                <h3 className="text-lg font-bold text-white text-center mb-1">Join the Lab!</h3>
                <p className="text-slate-400 text-xs text-center mb-5">Connect wallet or sign up to start mixing</p>
                <div className="space-y-3">
                  <DogeConnectButton>
                    {({ openConnectModal }) => (
                      <button onClick={() => { setShowAuthModal(false); openConnectModal(); }} className="w-full py-2.5 px-4 rounded-xl bg-sky-600 text-white font-semibold hover:bg-sky-500 transition-colors flex items-center justify-center gap-2 text-sm" data-testid="auth-connect-wallet">
                        <Wallet className="w-4 h-4" /> Connect Wallet
                      </button>
                    )}
                  </DogeConnectButton>
                  <div className="flex items-center gap-3"><div className="flex-1 h-px bg-white/10" /><span className="text-slate-500 text-xs">or</span><div className="flex-1 h-px bg-white/10" /></div>
                  <button onClick={() => setShowGuestSignup(true)} className="w-full py-2.5 px-4 rounded-xl bg-[#0d1117] text-white font-semibold hover:bg-white/[0.06] transition-colors flex items-center justify-center gap-2 text-sm border border-white/[0.06]" data-testid="auth-guest-signup">
                    <UserPlus className="w-4 h-4" /> Sign Up as Guest
                  </button>
                </div>
              </>
            ) : (
              <>
                <button onClick={() => setShowGuestSignup(false)} className="text-slate-400 hover:text-white text-sm mb-3 flex items-center gap-1">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg"><UserPlus className="w-6 h-6 text-white" /></div>
                <h3 className="text-base font-bold text-white text-center mb-1">Guest Account</h3>
                <p className="text-slate-400 text-[11px] text-center mb-4">Choose a username to get started</p>
                <div className="space-y-3">
                  <div>
                    <Input type="text" placeholder="Username" value={guestUsername} onChange={(e) => setGuestUsername(e.target.value)} className="w-full bg-[#0d1117] border-white/10 text-white" maxLength={20} data-testid="guest-username-input" />
                    {guestSignupError && <p className="text-red-400 text-xs mt-1">{guestSignupError}</p>}
                  </div>
                  <button onClick={handleGuestSignup} disabled={guestSignupLoading || !guestUsername} className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm" data-testid="guest-create-btn">
                    {guestSignupLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check className="w-4 h-4" /> Create Account</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MainMenu;
