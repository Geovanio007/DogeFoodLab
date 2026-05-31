import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import DogeFoodLogo from './DogeFoodLogo';
import AuthModal from './AuthModal';
import WhatsNewToast from './WhatsNewToast';
import INGREDIENT_ICONS from '../config/ingredientIcons';

const LAB_TOKEN = 'https://customer-assets.emergentagent.com/job_doge-treats/artifacts/bihai5rz_1000081758-removebg-preview.png';
const SHIBA_SCIENTIST = 'https://customer-assets.emergentagent.com/job_doge-treats/artifacts/uvrqvytu_1000081756-removebg-preview.png';

const SEASON2_LAUNCH_ISO = '2026-06-11T00:00:00Z';
const SEASON2_LAUNCH_AT = Date.parse(SEASON2_LAUNCH_ISO);

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

const SNEAK_PEEK_IDS = ['S2_050', 'S2_045', 'S2_041', 'S2_040', 'S2_032', 'S2_021'];
const ALL_S2_IDS = Object.keys(INGREDIENT_ICONS);

// ✅ FIX: inject styles once on mount via useEffect, never re-inject on re-render
const useLandingStyles = () => {
  useEffect(() => {
    const id = 'dogefood-landing-styles';
    if (document.getElementById(id)) return; // already injected
    const el = document.createElement('style');
    el.id = id;
    el.textContent = LANDING_CSS;
    document.head.appendChild(el);
    return () => {
      // only clean up if you want styles removed when component unmounts
      // document.getElementById(id)?.remove();
    };
  }, []);
};

const WelcomeScreen = ({ onPlayNow }) => {
  const { isDarkMode } = useTheme();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const season2At = SEASON2_LAUNCH_AT;
  const cd = useCountdown(season2At);

  // ✅ FIX: inject styles once, not on every countdown tick
  useLandingStyles();

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

      <header className="relative z-20 flex items-start justify-between px-3 sm:px-8 pt-3 sm:pt-6 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <DogeFoodLogo size="sm" showText={false} showBeta={false} className="w-10 h-10 sm:w-12 sm:h-12" />
          <div className="hidden sm:block">
            <div className="text-[10px] tracking-[0.3em] font-mono text-cyan-300/70">DOGEFOOD LAB</div>
            <div className="text-xs font-bold text-white/90">Season 2 · Reactor</div>
          </div>
        </div>
        <SneakPeekCard />
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center px-3 sm:px-6 pt-4 sm:pt-12 pb-6 sm:pb-8 w-full">
        <div className="relative flex flex-col items-center w-full max-w-[28rem] sm:max-w-none">
          <div className="absolute inset-0 -z-10 pointer-events-none">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[24rem] h-[24rem] sm:w-[40rem] sm:h-[40rem] rounded-full opacity-60"
                 style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.35), rgba(168,85,247,0.18) 40%, transparent 70%)', filter: 'blur(40px)' }} />
          </div>

          <div className="relative mb-1.5 sm:mb-3 flex items-center gap-2 sm:gap-4">
            <span className="hidden sm:inline-block w-12 h-px bg-gradient-to-r from-transparent to-cyan-400/70" />
            <span data-testid="hero-eyebrow" className="text-[9px] sm:text-xs tracking-[0.4em] sm:tracking-[0.45em] font-mono text-cyan-300/80 uppercase">
              The Meme Mixer Reactor
            </span>
            <span className="hidden sm:inline-block w-12 h-px bg-gradient-to-l from-transparent to-cyan-400/70" />
          </div>

          <div className="mt-4 sm:mt-7 flex items-center gap-2 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full border-2 border-yellow-400/70 bg-yellow-400/10 backdrop-blur shadow-[0_4px_0_rgba(0,0,0,0.25),0_0_20px_rgba(250,204,21,0.4)]">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <span
              className="text-[10px] sm:text-sm tracking-[0.3em] font-bold text-yellow-200 uppercase"
              style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}
            >
              {cd.finished ? 'Season 2 is LIVE' : 'Season 2 incoming'}
            </span>
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          </div>

          {!cd.finished && (
            <div data-testid="season2-countdown" className="mt-4 sm:mt-7 flex items-stretch gap-1.5 sm:gap-3 w-full max-w-[26rem] sm:max-w-[28rem] px-1 sm:px-0">
              <CountdownDigit value={cd.days}    label="DAYS" />
              <Colon />
              <CountdownDigit value={cd.hours}   label="HRS"  pad={2} />
              <Colon />
              <CountdownDigit value={cd.minutes} label="MIN"  pad={2} />
              <Colon />
              <CountdownDigit value={cd.seconds} label="SEC"  pad={2} pulse />
            </div>
          )}

          <div className="play-cta-wrap" data-testid="play-now-btn-wrap">
            <button
              data-testid="play-now-btn"
              onClick={onPlayNow}
              className="play-cta group"
              aria-label="Play Now"
            >
              <span aria-hidden className="play-cta-shine play-cta-shine-1" />
              <span aria-hidden className="play-cta-dot play-cta-dot-1" />
              <span aria-hidden className="play-cta-dot play-cta-dot-2" />
              <span aria-hidden className="play-cta-dot play-cta-dot-3" />
              <span
                className="play-cta-text"
                style={{
                  fontFamily: "'Bowlby One', 'Luckiest Guy', 'Fredoka', system-ui, sans-serif",
                  letterSpacing: '0.02em',
                  fontWeight: 400,
                }}
              >
                PLAY
              </span>
              <img
                src={LAB_TOKEN}
                alt=""
                className="play-cta-coin animate-coin-bounce"
              />
            </button>
          </div>

          <p
            data-testid="hero-tagline"
            className="mt-4 sm:mt-7 text-center text-[13px] sm:text-lg text-sky-100/90 max-w-xl px-2 sm:px-4 leading-relaxed"
          >
            Mix legendary memes. Mint mythical treats.
            <br />
            Forge your reputation across <span className="text-yellow-300 font-bold">50 new ingredients</span> in Season 2.
          </p>

          <button
            data-testid="guest-cta-btn"
            onClick={() => setShowAuthModal(true)}
            className="mt-3 sm:mt-4 text-[11px] sm:text-sm text-cyan-200/70 hover:text-cyan-100 underline-offset-4 hover:underline transition-colors text-center px-3"
          >
            New here? Sign up as guest, with email or Google
          </button>
        </div>
      </main>

      <OrbitingIngredients />
      <IngredientMarquee />

      <footer className="relative z-10 px-3 pb-3 sm:pb-6 mt-3 sm:mt-6">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-6 text-[9px] sm:text-xs tracking-[0.2em] sm:tracking-[0.25em] font-mono text-cyan-300/40 uppercase">
          <span>Web3 Gaming</span>
          <span className="w-1 h-1 rounded-full bg-cyan-300/40" />
          <span>Mythic NFTs</span>
          <span className="w-1 h-1 rounded-full bg-cyan-300/40" />
          <span>$LAB Rewards</span>
          <span className="w-1 h-1 rounded-full bg-cyan-300/40" />
          <span className="text-white/50" data-testid="beta-tag">v2.0 BETA</span>
        </div>
      </footer>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={handleAuthSuccess} />
      <WhatsNewToast />
      {/* ✅ FIX: <LandingStyles /> removed from here — styles injected via useLandingStyles() hook above */}
    </div>
  );
};

/* ─── Cinematic background ─── */
const CinematicBackground = () => (
  <>
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          'radial-gradient(ellipse at 50% 30%, #1e3a8a 0%, #0c1a3f 40%, #050917 80%, #02030a 100%)',
      }}
    />
    <div aria-hidden className="absolute inset-0 pointer-events-none welcome-grid opacity-30" />
    <div
      aria-hidden
      className="absolute left-0 right-0 pointer-events-none"
      style={{
        top: '60%',
        height: '40%',
        background: 'linear-gradient(to top, rgba(56,189,248,0.28), transparent 70%)',
        filter: 'blur(20px)',
      }}
    />
    <div aria-hidden className="absolute -top-40 left-1/2 -translate-x-1/2 w-[44rem] h-[44rem] rounded-full pointer-events-none opacity-30"
         style={{ background: 'radial-gradient(circle, rgba(250,204,21,0.55), rgba(56,189,248,0.18) 50%, transparent 75%)', filter: 'blur(60px)' }} />
    <div aria-hidden className="absolute -bottom-32 -left-32 w-[36rem] h-[36rem] rounded-full pointer-events-none opacity-40"
         style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.55), transparent 65%)', filter: 'blur(60px)' }} />
    <div aria-hidden className="absolute -bottom-32 -right-32 w-[36rem] h-[36rem] rounded-full pointer-events-none opacity-30"
         style={{ background: 'radial-gradient(circle, rgba(250,204,21,0.45), transparent 65%)', filter: 'blur(60px)' }} />

    {Array.from({ length: 22 }).map((_, i) => (
      <span
        key={i}
        aria-hidden
        className={`welcome-particle ${i % 3 === 0 ? 'welcome-particle-gold' : ''}`}
        style={{
          left: `${(i * 37) % 100}%`,
          animationDelay: `${(i * 0.55) % 10}s`,
          animationDuration: `${12 + (i % 6)}s`,
          width: `${3 + (i % 3)}px`,
          height: `${3 + (i % 3)}px`,
          opacity: 0.5 + (i % 4) * 0.1,
        }}
      />
    ))}

    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 100%)' }}
    />
  </>
);

/* ─── Countdown digit card ─── */
const CountdownDigit = ({ value, label, pad = 2, pulse = false }) => {
  const display = String(value).padStart(pad, '0');
  return (
    <div
      data-testid={`cd-${label.toLowerCase()}`}
      className="flex flex-col items-center flex-1 min-w-0 max-w-[5.5rem]"
    >
      <div className={`relative w-full rounded-xl sm:rounded-2xl bg-gradient-to-b from-[#0a0820]/95 to-[#06041a]/95 border border-cyan-400/30 px-1 py-2.5 sm:py-3.5 shadow-[0_10px_30px_-10px_rgba(56,189,248,0.5),inset_0_0_25px_rgba(56,189,248,0.12)] ${pulse ? 'animate-cd-pulse' : ''}`}>
        <span className="absolute left-1/2 top-0 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
        <div
          className="text-center font-bold tabular-nums leading-none"
          style={{
            fontSize: 'clamp(1.5rem, 7vw, 3rem)',
            color: '#ffffff',
            textShadow: '0 0 14px rgba(56,189,248,0.85), 0 2px 4px rgba(0,0,0,0.4)',
            fontFamily: "'JetBrains Mono', 'Courier New', monospace",
          }}
        >
          {display}
        </div>
      </div>
      <span className="mt-1.5 text-[9px] sm:text-[10px] tracking-[0.3em] sm:tracking-[0.35em] font-mono text-cyan-300/60 font-bold">
        {label}
      </span>
    </div>
  );
};

const Colon = () => (
  <span
    aria-hidden
    className="text-xl sm:text-4xl font-black text-cyan-300/50 self-center -mt-3 sm:-mt-4 select-none shrink-0"
    style={{ textShadow: '0 0 10px rgba(56,189,248,0.4)' }}
  >
    :
  </span>
);

/* ─── Top-right "Sneak Peek" card ─── */
const SneakPeekCard = () => {
  const featuredId = 'S2_050';
  const meta = INGREDIENT_ICONS[featuredId];
  return (
    <div
      data-testid="sneak-peek-card"
      className="relative max-w-[9.5rem] sm:max-w-[15rem] rounded-xl sm:rounded-2xl overflow-hidden border-2 border-yellow-400/50 bg-gradient-to-br from-sky-900/90 to-[#06112e]/90 backdrop-blur-md shadow-[0_5px_0_rgba(0,0,0,0.3),0_10px_30px_-8px_rgba(250,204,21,0.5)] sm:shadow-[0_8px_0_rgba(0,0,0,0.35),0_15px_40px_-10px_rgba(250,204,21,0.5)] hover:-translate-y-0.5 transition-transform shrink-0"
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-300/60 to-transparent" />
      <div className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-3">
        <div className="relative w-10 h-10 sm:w-16 sm:h-16 shrink-0 rounded-lg sm:rounded-xl bg-gradient-to-br from-yellow-400/20 via-yellow-300/10 to-sky-500/20 border-2 border-yellow-300/40 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 animate-spin-slow opacity-60" style={{ background: 'conic-gradient(from 0deg, rgba(250,204,21,0.5), transparent 40%, rgba(56,189,248,0.5), transparent 80%)' }} />
          <img src={meta?.icon} alt={meta?.name} className="relative w-7 h-7 sm:w-12 sm:h-12 object-contain drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
        </div>
        <div className="min-w-0">
          <div className="text-[8px] sm:text-[9px] tracking-[0.25em] sm:tracking-[0.3em] font-bold text-yellow-300 uppercase truncate" style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}>
            Mythic Drop
          </div>
          <div className="text-[11px] sm:text-sm font-bold text-white truncate leading-tight">{meta?.name}</div>
          <div className="hidden sm:block text-[10px] sm:text-[11px] text-sky-200/80">Drops in Season 2</div>
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

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 hidden md:block">
      {items.map((it, i) => {
        const side = i % 2 === 0 ? 'left' : 'right';
        const top = 18 + (i * 13) % 60;
        const offset = 4 + (i * 3) % 10;
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

/* ─── Continuous marquee strip ─── */
const IngredientMarquee = () => {
  const all = ALL_S2_IDS.map((id) => ({ id, meta: INGREDIENT_ICONS[id] })).filter((x) => x.meta?.icon);
  const doubled = [...all, ...all];
  return (
    <section
      data-testid="ingredient-marquee"
      className="relative z-10 mt-1 sm:mt-4 py-2.5 sm:py-4 border-y border-cyan-400/15 bg-gradient-to-r from-transparent via-cyan-500/[0.04] to-transparent overflow-hidden"
    >
      <div className="flex items-center justify-between px-3 sm:px-8 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
          <span className="text-[9px] sm:text-xs tracking-[0.25em] sm:tracking-[0.35em] font-mono font-bold text-cyan-300/80 uppercase truncate">
            Season 2 · 50 Ingredients
          </span>
        </div>
        <span className="hidden sm:inline text-[10px] sm:text-xs font-mono text-cyan-300/40 shrink-0">
          Starter → Mythic
        </span>
      </div>
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-10 sm:w-32 z-10 pointer-events-none bg-gradient-to-r from-[#04030f] to-transparent" />
        <div className="absolute right-0 top-0 bottom-0 w-10 sm:w-32 z-10 pointer-events-none bg-gradient-to-l from-[#04030f] to-transparent" />
        <div className="flex gap-2.5 sm:gap-4 animate-marquee whitespace-nowrap will-change-transform">
          {doubled.map((it, i) => (
            <div
              key={`${it.id}-${i}`}
              className="shrink-0 w-11 h-11 sm:w-16 sm:h-16 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-1.5 flex items-center justify-center hover:border-cyan-300/40 transition-colors"
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

/* ─── All CSS as a plain string constant — never re-injected after mount ─── */
const LANDING_CSS = `
  .welcome-grid {
    background-image:
      linear-gradient(rgba(56,189,248,0.07) 1px, transparent 1px),
      linear-gradient(90deg, rgba(56,189,248,0.07) 1px, transparent 1px);
    background-size: 56px 56px;
    mask-image: linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%);
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
    background: radial-gradient(circle, rgba(186,230,253,0.95), rgba(56,189,248,0.3) 60%, transparent 100%);
    box-shadow: 0 0 8px rgba(56,189,248,0.7);
    animation: welcome-particle linear infinite;
    pointer-events: none;
  }
  .welcome-particle-gold {
    background: radial-gradient(circle, rgba(254,243,199,0.95), rgba(250,204,21,0.4) 60%, transparent 100%);
    box-shadow: 0 0 10px rgba(250,204,21,0.7);
  }
  @keyframes spin-slow { from { transform: rotate(0); } to { transform: rotate(360deg); } }
  .animate-spin-slow { animation: spin-slow 12s linear infinite; }
  .hero-word {
    font-weight: 400;
    position: relative;
    display: inline-block;
    -webkit-text-stroke: 3px #0b1738;
    paint-order: stroke fill;
    text-shadow:
      0 3px 0 #0b1738,
      0 6px 0 #0b1738,
      0 9px 0 #0b1738,
      0 11px 18px rgba(0,0,0,0.55),
      0 0 28px rgba(56,189,248,0.4);
  }
  .hero-tilt-1 { transform: rotate(-1.5deg); }
  .hero-tilt-2 { transform: rotate(1deg); }
  @media (min-width: 640px) {
    .hero-tilt-1 { transform: rotate(-2.5deg); }
    .hero-tilt-2 { transform: rotate(1.5deg); }
    .hero-word {
      -webkit-text-stroke: 5px #0b1738;
      text-shadow:
        0 4px 0 #0b1738,
        0 8px 0 #0b1738,
        0 12px 0 #0b1738,
        0 16px 0 #0b1738,
        0 18px 22px rgba(0,0,0,0.55),
        0 0 40px rgba(56,189,248,0.45);
    }
  }
  .hero-word-blue   { color: #38bdf8; }
  .hero-word-yellow { color: #facc15; }
  .hero-word::after {
    content: attr(data-text);
    position: absolute;
    inset: 0;
    pointer-events: none;
    -webkit-text-stroke: 0;
    text-shadow: none;
    color: transparent;
    background: linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 45%);
    -webkit-background-clip: text;
    background-clip: text;
    mix-blend-mode: screen;
  }
  @keyframes hero-wobble {
    0%,100% { transform: rotate(-2.5deg) translateY(0); }
    50%     { transform: rotate(-1.5deg) translateY(-4px); }
  }
  @keyframes hero-wobble-2 {
    0%,100% { transform: rotate(1.5deg) translateY(0); }
    50%     { transform: rotate(2.5deg) translateY(-3px); }
  }
  @media (min-width: 640px) {
    .hero-word-blue   { animation: hero-wobble   5s ease-in-out infinite; }
    .hero-word-yellow { animation: hero-wobble-2 5s ease-in-out infinite 0.25s; }
  }
  .play-cta-wrap {
    position: relative;
    margin-top: 20px;
    width: 144px;
    height: 144px;
    flex: 0 0 144px;
    z-index: 50;
  }
  @media (min-width: 640px) {
    .play-cta-wrap {
      margin-top: 28px;
      width: 176px;
      height: 176px;
      flex: 0 0 176px;
    }
  }
  .play-cta {
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    border-radius: 50%;
    cursor: pointer;
    outline: none;
    user-select: none;
    box-sizing: border-box;
    background: #0284c7;
    background-image: linear-gradient(180deg, #7dd3fc 0%, #38bdf8 40%, #0284c7 75%, #075985 100%);
    border: 7px solid #f59e0b;
    box-shadow:
      0 0 0 3px #b45309,
      0 10px 24px -6px rgba(2,8,23,0.55),
      0 0 24px rgba(56,189,248,0.35);
    transition: transform 0.18s ease, filter 0.18s ease;
    overflow: hidden;
  }
  .play-cta-shine {
    position: absolute;
    pointer-events: none;
  }
  .play-cta-shine-1 {
    top: 10%;
    left: 16%;
    width: 56%;
    height: 28%;
    border-radius: 50%;
    background: linear-gradient(180deg,
      rgba(255,255,255,0.8) 0%,
      rgba(255,255,255,0.35) 55%,
      rgba(255,255,255,0) 100%);
  }
  .play-cta-dot {
    position: absolute;
    pointer-events: none;
    background: #ffffff;
    border-radius: 50%;
  }
  .play-cta-dot-1 { top: 26%; left: 22%; width: 7px; height: 7px; opacity: 0.85; }
  .play-cta-dot-2 { top: 56%; right: 18%; width: 5px; height: 5px; opacity: 0.65; }
  .play-cta-dot-3 { bottom: 24%; left: 30%; width: 4px; height: 4px; opacity: 0.55; }
  .play-cta-text {
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    transform: translateY(-50%);
    text-align: center;
    z-index: 2;
    font-size: 34px;
    line-height: 1;
    color: #ffffff;
    text-shadow:
      -2px -2px 0 #0c4a6e,
       2px -2px 0 #0c4a6e,
      -2px  2px 0 #0c4a6e,
       2px  2px 0 #0c4a6e,
       0    3px 0 #075985,
       0    4px 6px rgba(0,0,0,0.45);
  }
  @media (min-width: 640px) {
    .play-cta-text { font-size: 42px; }
  }
  .play-cta-coin {
    position: absolute;
    bottom: -4px;
    right: -6px;
    width: 36px;
    height: 36px;
    z-index: 3;
    object-fit: contain;
  }
  @media (min-width: 640px) {
    .play-cta-coin { width: 46px; height: 46px; bottom: -6px; right: -8px; }
  }
  .play-cta:hover {
    transform: scale(1.05);
    filter: brightness(1.06);
  }
  .play-cta:active {
    transform: scale(0.96);
    filter: brightness(0.95);
  }
  @keyframes coin-bounce {
    0%,100% { transform: translateY(0) rotate(0); }
    50%     { transform: translateY(-3px) rotate(8deg); }
  }
  .animate-coin-bounce { animation: coin-bounce 2.2s ease-in-out infinite; }
  @keyframes cd-pulse {
    0%,100% { box-shadow: 0 10px 30px -10px rgba(56,189,248,0.5), inset 0 0 25px rgba(56,189,248,0.12); }
    50%     { box-shadow: 0 15px 40px -10px rgba(56,189,248,0.9), inset 0 0 35px rgba(56,189,248,0.22); }
  }
  .animate-cd-pulse { animation: cd-pulse 1s ease-in-out infinite; }
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
  @media (prefers-reduced-motion: reduce) {
    .welcome-particle, .orbit-tile, .animate-spin-slow, .animate-cd-pulse,
    .animate-marquee, .animate-coin-bounce,
    .hero-word-blue, .hero-word-yellow {
      animation: none !important;
    }
  }
`;

export default WelcomeScreen;
