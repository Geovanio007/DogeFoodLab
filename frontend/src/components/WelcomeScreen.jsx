import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import DogeFoodLogo from './DogeFoodLogo';
import AuthModal from './AuthModal';
import WhatsNewToast from './WhatsNewToast';
import INGREDIENT_ICONS from '../config/ingredientIcons';

/* ============================================================
   DogeFood Lab — SEASON 2 cinematic landing
   Inspired by AAA crypto-game hero pages (Chumbi-style),
   reimagined for a neon meme-science laboratory.
   ============================================================ */

const LAB_TOKEN = 'https://customer-assets.emergentagent.com/job_doge-treats/artifacts/bihai5rz_1000081758-removebg-preview.png';
const SHIBA_SCIENTIST = 'https://customer-assets.emergentagent.com/job_doge-treats/artifacts/uvrqvytu_1000081756-removebg-preview.png';

// Persist a stable Season 2 launch date in localStorage (14 days from first visit)
const SEASON2_KEY = 'dogefood_s2_launch_at';
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const getSeason2Launch = () => {
  try {
    const stored = localStorage.getItem(SEASON2_KEY);
    if (stored) return parseInt(stored, 10);
    const launch = Date.now() + FOURTEEN_DAYS_MS;
    localStorage.setItem(SEASON2_KEY, String(launch));
    return launch;
  } catch {
    return Date.now() + FOURTEEN_DAYS_MS;
  }
};

const useCountdown = (target) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds, finished: diff <= 0 };
};

// 6 hand-picked Season 2 ingredients for the sneak-peek showcase
const SNEAK_PEEK_IDS = ['S2_050', 'S2_045', 'S2_041', 'S2_040', 'S2_032', 'S2_021'];
// All 50 for the marquee strip
const ALL_S2_IDS = Object.keys(INGREDIENT_ICONS);

const WelcomeScreen = ({ onPlayNow }) => {
  const { isDarkMode } = useTheme();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const season2At = useMemo(getSeason2Launch, []);
  const cd = useCountdown(season2At);

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    onPlayNow();
  };

  return (
    <div
      data-testid="welcome-screen"
      className="relative min-h-screen w-full overflow-hidden bg-[#04030f] text-white"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <CinematicBackground />

      {/* ─── Top bar: brand + sneak-peek card ─── */}
      <header className="relative z-20 flex items-start justify-between px-4 sm:px-8 pt-4 sm:pt-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <DogeFoodLogo size="sm" showText={false} showBeta={false} className="w-10 h-10 sm:w-12 sm:h-12" />
          <div className="hidden sm:block">
            <div className="text-[10px] tracking-[0.3em] font-mono text-cyan-300/70">DOGEFOOD LAB</div>
            <div className="text-xs font-bold text-white/90">Season 2 · Reactor</div>
          </div>
        </div>

        <SneakPeekCard />
      </header>

      {/* ─── Main hero ─── */}
      <main className="relative z-10 flex flex-col items-center justify-center px-4 sm:px-6 pt-6 sm:pt-12 pb-8">
        {/* Reactor glow halo behind logo */}
        <div className="relative flex flex-col items-center">
          <div className="absolute inset-0 -z-10 pointer-events-none">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] h-[28rem] sm:w-[40rem] sm:h-[40rem] rounded-full opacity-60"
                 style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.35), rgba(168,85,247,0.18) 40%, transparent 70%)', filter: 'blur(40px)' }} />
          </div>

          {/* Title wordmark */}
          <div className="relative mb-2 sm:mb-3 flex items-center gap-2 sm:gap-4">
            <span className="hidden sm:inline-block w-12 h-px bg-gradient-to-r from-transparent to-cyan-400/70" />
            <span data-testid="hero-eyebrow" className="text-[10px] sm:text-xs tracking-[0.45em] font-mono text-cyan-300/80 uppercase">
              The Meme Mixer Reactor
            </span>
            <span className="hidden sm:inline-block w-12 h-px bg-gradient-to-l from-transparent to-cyan-400/70" />
          </div>

          <h1
            data-testid="hero-title"
            className="hero-title relative text-center font-black tracking-tight leading-[0.85] select-none"
            style={{
              fontSize: 'clamp(3.25rem, 11vw, 8.5rem)',
              background: 'linear-gradient(180deg, #ffffff 0%, #e0f2fe 35%, #67e8f9 70%, #38bdf8 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              textShadow: '0 0 60px rgba(56,189,248,0.4)',
              fontFamily: "'Bebas Neue', 'Impact', system-ui, sans-serif",
              letterSpacing: '0.02em',
            }}
          >
            <span className="block">DOGEFOOD</span>
            <span className="block relative">
              LAB
              <span
                aria-hidden
                className="absolute inset-0 block animate-glitch-tint pointer-events-none"
                style={{
                  background: 'linear-gradient(180deg, transparent 0%, #ec4899 60%, #f59e0b 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  mixBlendMode: 'screen',
                  opacity: 0.65,
                }}
              >LAB</span>
            </span>
          </h1>

          {/* Season 2 incoming badge */}
          <div className="mt-4 sm:mt-6 flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full border border-pink-400/40 bg-pink-500/10 backdrop-blur">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
            <span className="text-[10px] sm:text-xs tracking-[0.3em] font-mono font-bold text-pink-200 uppercase">
              {cd.finished ? 'Season 2 is LIVE' : 'Season 2 incoming'}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
          </div>

          {/* Countdown */}
          {!cd.finished && (
            <div data-testid="season2-countdown" className="mt-5 sm:mt-7 flex items-center gap-2 sm:gap-3">
              <CountdownDigit value={cd.days}    label="DAYS" />
              <Colon />
              <CountdownDigit value={cd.hours}   label="HRS"  pad={2} />
              <Colon />
              <CountdownDigit value={cd.minutes} label="MIN"  pad={2} />
              <Colon />
              <CountdownDigit value={cd.seconds} label="SEC"  pad={2} pulse />
            </div>
          )}

          {/* Primary CTA — Play Now with token logos */}
          <button
            data-testid="play-now-btn"
            onClick={onPlayNow}
            className="play-cta group relative mt-7 sm:mt-9 inline-flex items-center justify-center cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/60"
            style={{ zIndex: 50 }}
          >
            {/* Outer animated ring */}
            <span aria-hidden className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-amber-400 opacity-70 blur-md group-hover:opacity-100 group-hover:blur-lg transition-all duration-300 animate-spin-slow" />
            {/* Solid pill */}
            <span aria-hidden className="absolute inset-0 rounded-full bg-gradient-to-b from-[#0c1230] via-[#0a0820] to-[#06041a] border border-cyan-300/40 shadow-[0_20px_60px_-10px_rgba(56,189,248,0.6)] group-hover:shadow-[0_25px_75px_-10px_rgba(236,72,153,0.65)] transition-shadow" />
            <span className="relative z-10 px-6 sm:px-10 py-4 sm:py-5 flex items-center gap-3 sm:gap-5">
              <img src={LAB_TOKEN} alt="LAB Token" className="w-9 h-9 sm:w-12 sm:h-12 object-contain drop-shadow-[0_0_10px_rgba(56,189,248,0.6)]" />
              <span
                className="text-2xl sm:text-4xl font-black tracking-wider"
                style={{
                  background: 'linear-gradient(180deg, #fef3c7 0%, #fbbf24 50%, #f59e0b 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  textShadow: '0 0 25px rgba(245,158,11,0.4)',
                  fontFamily: "'Bebas Neue', system-ui, sans-serif",
                  letterSpacing: '0.08em',
                }}
              >
                PLAY NOW
              </span>
              <img src={LAB_TOKEN} alt="LAB Token" className="w-9 h-9 sm:w-12 sm:h-12 object-contain drop-shadow-[0_0_10px_rgba(56,189,248,0.6)] animate-pulse" />
            </span>
          </button>

          {/* Tagline */}
          <p
            data-testid="hero-tagline"
            className="mt-5 sm:mt-7 text-center text-sm sm:text-lg text-cyan-100/80 max-w-xl px-4 leading-relaxed"
          >
            Mix legendary memes. Mint mythical treats.<br className="hidden sm:block" />
            Forge your reputation across <span className="text-fuchsia-300 font-semibold">50 new ingredients</span> in Season 2.
          </p>

          {/* Guest/Account secondary CTA */}
          <button
            data-testid="guest-cta-btn"
            onClick={() => setShowAuthModal(true)}
            className="mt-4 text-xs sm:text-sm text-cyan-200/70 hover:text-cyan-100 underline-offset-4 hover:underline transition-colors"
          >
            New here? Sign up as guest, with email or Google
          </button>
        </div>
      </main>

      {/* ─── Ingredient sneak-peek tiles (orbiting around the title) ─── */}
      <OrbitingIngredients />

      {/* ─── Marquee strip: all 50 ingredients ─── */}
      <IngredientMarquee />

      {/* ─── Footer tagline ─── */}
      <footer className="relative z-10 px-4 pb-4 sm:pb-6 mt-6">
        <div className="flex items-center justify-center gap-3 sm:gap-6 text-[10px] sm:text-xs tracking-[0.25em] font-mono text-cyan-300/40 uppercase">
          <span>Web3 Gaming</span>
          <span className="w-1 h-1 rounded-full bg-cyan-300/40" />
          <span>Mythic NFTs</span>
          <span className="w-1 h-1 rounded-full bg-cyan-300/40" />
          <span>$LAB Rewards</span>
        </div>
      </footer>

      {/* Beta badge — kept, smaller */}
      <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20">
        <span className="px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-mono font-bold tracking-[0.25em] bg-white/5 border border-white/15 text-white/70 uppercase">
          v2.0 · BETA
        </span>
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={handleAuthSuccess} />
      <WhatsNewToast />
      <LandingStyles />
    </div>
  );
};

/* ─── Cinematic background ─── */
const CinematicBackground = () => (
  <>
    {/* base radial gradient */}
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          'radial-gradient(ellipse at 50% 35%, #0c1230 0%, #060418 50%, #02010a 100%)',
      }}
    />
    {/* neon grid floor */}
    <div aria-hidden className="absolute inset-0 pointer-events-none welcome-grid opacity-40" />
    {/* scanlines */}
    <div aria-hidden className="absolute inset-0 pointer-events-none welcome-scanlines opacity-30 mix-blend-overlay" />
    {/* horizon glow */}
    <div
      aria-hidden
      className="absolute left-0 right-0 pointer-events-none"
      style={{
        top: '55%',
        height: '40%',
        background: 'linear-gradient(to top, rgba(56,189,248,0.18), transparent 60%)',
        filter: 'blur(20px)',
      }}
    />
    {/* aurora streaks */}
    <div aria-hidden className="absolute -top-32 -left-32 w-[40rem] h-[40rem] rounded-full pointer-events-none opacity-30"
         style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.55), transparent 60%)', filter: 'blur(60px)' }} />
    <div aria-hidden className="absolute -bottom-32 -right-32 w-[40rem] h-[40rem] rounded-full pointer-events-none opacity-30"
         style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.55), transparent 60%)', filter: 'blur(60px)' }} />

    {/* drifting particles */}
    {Array.from({ length: 28 }).map((_, i) => (
      <span
        key={i}
        aria-hidden
        className="welcome-particle"
        style={{
          left: `${(i * 37) % 100}%`,
          animationDelay: `${(i * 0.45) % 9}s`,
          animationDuration: `${10 + (i % 8)}s`,
          width: `${2 + (i % 3)}px`,
          height: `${2 + (i % 3)}px`,
          opacity: 0.4 + (i % 5) * 0.1,
        }}
      />
    ))}

    {/* vignette */}
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)' }}
    />
  </>
);

/* ─── Countdown digit card ─── */
const CountdownDigit = ({ value, label, pad = 2, pulse = false }) => {
  const display = String(value).padStart(pad, '0');
  return (
    <div
      data-testid={`cd-${label.toLowerCase()}`}
      className="flex flex-col items-center w-[3.75rem] sm:w-[5.25rem]"
    >
      <div className={`relative w-full rounded-xl sm:rounded-2xl bg-gradient-to-b from-[#0a0820]/95 to-[#06041a]/95 border border-cyan-400/30 px-2 py-2.5 sm:py-3.5 shadow-[0_10px_30px_-10px_rgba(56,189,248,0.5),inset_0_0_25px_rgba(56,189,248,0.12)] ${pulse ? 'animate-cd-pulse' : ''}`}>
        <span className="absolute left-1/2 top-0 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
        <div
          className="text-center font-bold tabular-nums leading-none"
          style={{
            fontSize: 'clamp(1.75rem, 5.5vw, 3rem)',
            color: '#67e8f9',
            textShadow: '0 0 14px rgba(56,189,248,0.85)',
            fontFamily: "'JetBrains Mono', 'Courier New', monospace",
          }}
        >
          {display}
        </div>
      </div>
      <span className="mt-1.5 text-[9px] sm:text-[10px] tracking-[0.35em] font-mono text-cyan-300/60 font-bold">
        {label}
      </span>
    </div>
  );
};

const Colon = () => (
  <span
    aria-hidden
    className="text-2xl sm:text-4xl font-black text-cyan-300/50 -translate-y-2.5 sm:-translate-y-3.5 select-none"
    style={{ textShadow: '0 0 10px rgba(56,189,248,0.4)' }}
  >
    :
  </span>
);

/* ─── Top-right "Sneak Peek" card (like Chumbi's mini-game card) ─── */
const SneakPeekCard = () => {
  const featuredId = 'S2_050'; // Godtier Shiba Serum
  const meta = INGREDIENT_ICONS[featuredId];
  return (
    <div
      data-testid="sneak-peek-card"
      className="relative max-w-[12rem] sm:max-w-[15rem] rounded-2xl overflow-hidden border border-cyan-400/30 bg-gradient-to-br from-[#0d0b2a]/90 to-[#06041a]/90 backdrop-blur-md shadow-[0_15px_40px_-10px_rgba(56,189,248,0.5)] hover:-translate-y-0.5 transition-transform"
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
      <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3">
        <div className="relative w-12 h-12 sm:w-16 sm:h-16 shrink-0 rounded-xl bg-gradient-to-br from-pink-500/20 via-fuchsia-500/15 to-purple-500/20 border border-pink-300/30 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 animate-spin-slow opacity-60" style={{ background: 'conic-gradient(from 0deg, rgba(236,72,153,0.5), transparent 40%, rgba(168,85,247,0.5), transparent 80%)' }} />
          <img src={meta?.icon} alt={meta?.name} className="relative w-9 h-9 sm:w-12 sm:h-12 object-contain drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
        </div>
        <div className="min-w-0">
          <div className="text-[8px] sm:text-[9px] tracking-[0.3em] font-mono text-pink-300 font-bold uppercase">Mythic Reveal</div>
          <div className="text-xs sm:text-sm font-bold text-white truncate">{meta?.name}</div>
          <div className="text-[10px] sm:text-[11px] text-cyan-200/70">Drops in Season 2</div>
        </div>
      </div>
    </div>
  );
};

/* ─── Orbiting ingredient tiles ─── */
const OrbitingIngredients = () => {
  const items = SNEAK_PEEK_IDS.map((id, idx) => ({
    id,
    meta: INGREDIENT_ICONS[id],
    idx,
  })).filter((x) => x.meta?.icon);

  // 3 visible on each side at sm+, hidden on mobile
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 hidden md:block">
      {items.map((it, i) => {
        const side = i % 2 === 0 ? 'left' : 'right';
        const top = 18 + (i * 13) % 60; // %
        const offset = 4 + (i * 3) % 10; // %
        const size = 56 + (i % 3) * 14;
        return (
          <div
            key={it.id}
            className="orbit-tile absolute rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-md p-2 shadow-[0_15px_40px_-10px_rgba(56,189,248,0.4)]"
            style={{
              [side]: `${offset}%`,
              top: `${top}%`,
              width: size,
              height: size,
              animationDelay: `${i * 0.7}s`,
              animationDuration: `${7 + i}s`,
            }}
          >
            <img src={it.meta.icon} alt="" className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]" />
          </div>
        );
      })}
    </div>
  );
};

/* ─── Continuous marquee strip of all Season 2 ingredients ─── */
const IngredientMarquee = () => {
  const all = ALL_S2_IDS.map((id) => ({ id, meta: INGREDIENT_ICONS[id] })).filter((x) => x.meta?.icon);
  const doubled = [...all, ...all]; // duplicate for seamless loop
  return (
    <section
      data-testid="ingredient-marquee"
      className="relative z-10 mt-2 sm:mt-4 py-3 sm:py-4 border-y border-cyan-400/15 bg-gradient-to-r from-transparent via-cyan-500/[0.04] to-transparent overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 sm:px-8 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[10px] sm:text-xs tracking-[0.35em] font-mono font-bold text-cyan-300/80 uppercase">
            Season 2 · 50 New Ingredients
          </span>
        </div>
        <span className="text-[10px] sm:text-xs font-mono text-cyan-300/40">
          Starter → Mythic
        </span>
      </div>
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 z-10 pointer-events-none bg-gradient-to-r from-[#04030f] to-transparent" />
        <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 z-10 pointer-events-none bg-gradient-to-l from-[#04030f] to-transparent" />
        <div className="flex gap-3 sm:gap-4 animate-marquee whitespace-nowrap will-change-transform">
          {doubled.map((it, i) => (
            <div
              key={`${it.id}-${i}`}
              className="shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-1.5 flex items-center justify-center hover:border-cyan-300/40 transition-colors"
              title={it.meta.name}
            >
              <img src={it.meta.icon} alt="" className="w-full h-full object-contain drop-shadow-[0_0_6px_rgba(255,255,255,0.25)]" loading="lazy" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─── Inline page styles ─── */
const LandingStyles = () => (
  <style>{`
    .welcome-grid {
      background-image:
        linear-gradient(rgba(56,189,248,0.07) 1px, transparent 1px),
        linear-gradient(90deg, rgba(56,189,248,0.07) 1px, transparent 1px);
      background-size: 56px 56px;
      mask-image: linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%);
      -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%);
    }
    .welcome-scanlines {
      background: repeating-linear-gradient(to bottom, rgba(255,255,255,0) 0, rgba(255,255,255,0) 3px, rgba(255,255,255,0.025) 4px);
    }
    @keyframes welcome-particle {
      0%   { transform: translateY(100vh) translateX(0); opacity: 0; }
      10%  { opacity: 1; }
      90%  { opacity: 1; }
      100% { transform: translateY(-10vh) translateX(20px); opacity: 0; }
    }
    .welcome-particle {
      position: absolute;
      bottom: -10px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(103,232,249,0.95), rgba(56,189,248,0.3) 60%, transparent 100%);
      box-shadow: 0 0 8px rgba(56,189,248,0.7);
      animation: welcome-particle linear infinite;
      pointer-events: none;
    }
    @keyframes spin-slow { from { transform: rotate(0); } to { transform: rotate(360deg); } }
    .animate-spin-slow { animation: spin-slow 12s linear infinite; }
    @keyframes cd-pulse {
      0%,100% { box-shadow: 0 10px 30px -10px rgba(56,189,248,0.5), inset 0 0 25px rgba(56,189,248,0.12); }
      50%     { box-shadow: 0 15px 40px -10px rgba(56,189,248,0.9), inset 0 0 35px rgba(56,189,248,0.22); }
    }
    .animate-cd-pulse { animation: cd-pulse 1s ease-in-out infinite; }
    @keyframes glitch-tint {
      0%,100% { transform: translate(0,0); opacity: 0.6; }
      45%     { transform: translate(2px,-1px); opacity: 0.75; }
      50%     { transform: translate(-2px,1px); opacity: 0.4; }
      55%     { transform: translate(0,0); opacity: 0.7; }
    }
    .animate-glitch-tint { animation: glitch-tint 4.5s ease-in-out infinite; }
    @keyframes orbit-float {
      0%,100% { transform: translateY(0) rotate(-2deg); }
      50%     { transform: translateY(-14px) rotate(2deg); }
    }
    .orbit-tile { animation: orbit-float 8s ease-in-out infinite; }
    @keyframes marquee {
      0%   { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    .animate-marquee { animation: marquee 60s linear infinite; }

    .hero-title { line-height: 0.85; }

    @media (prefers-reduced-motion: reduce) {
      .welcome-particle, .orbit-tile, .animate-spin-slow, .animate-cd-pulse, .animate-glitch-tint, .animate-marquee {
        animation: none !important;
      }
    }
  `}</style>
);

export default WelcomeScreen;
