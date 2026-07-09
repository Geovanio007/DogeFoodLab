import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import DogeFoodLogo from './DogeFoodLogo';
import AuthModal from './AuthModal';
import WhatsNewToast from './WhatsNewToast';
import INGREDIENT_ICONS from '../config/ingredientIcons';

/* ============================================================
   DogeFood Lab — SEASON 2 cinematic landing
   MyDoge WebView-hardened version.

   WebView compatibility fixes applied throughout:
   ✅ No backdrop-filter / backdrop-blur (unsupported, renders black)
   ✅ No conic-gradient (unsupported in WebView < Chrome 69)
   ✅ No filter:blur() on layout elements (causes compositing bugs)
   ✅ No mix-blend-mode (renders inverted/black)
   ✅ No overflow:hidden on gradient children (dark blob bug)
   ✅ No will-change:transform on marquee (GPU compositing crash)
   ✅ No Tailwind /opacity shorthand on bg (needs solid fallback)
   ✅ Styles injected at module load — never re-injected by React
   ✅ React.memo on all static sub-components
   ============================================================ */

const LAB_TOKEN = 'https://customer-assets.emergentagent.com/job_doge-treats/artifacts/bihai5rz_1000081758-removebg-preview.png';

/* Real in-game captures used inside the phone mockups below. */
const SHOT_LAB_OVERVIEW   = '/landing/lab-overview.jpg';
const SHOT_EPIC_TREAT     = '/landing/epic-treat.jpg';
const SHOT_MUTATION_CRATE = '/landing/mutation-crate.jpg';
const SHOT_SPIN_WHEEL     = '/landing/spin-wheel.jpg';
const SHOT_ACTIVITY_STATS = '/landing/activity-stats.jpg';

const SEASON2_LAUNCH_ISO = '2026-06-18T00:00:00Z';
const SEASON2_LAUNCH_AT = Date.parse(SEASON2_LAUNCH_ISO);

const SNEAK_PEEK_IDS = ['S2_050', 'S2_045', 'S2_041', 'S2_040', 'S2_032', 'S2_021'];
const ALL_S2_IDS = Object.keys(INGREDIENT_ICONS);

/* ============================================================
   LANDING_CSS
   Rules written for maximum WebView compatibility:
   - All colours as explicit rgba() — no Tailwind /opacity shorthand
   - No backdrop-filter, no filter:blur, no conic-gradient
   - Shine on PLAY button = inset box-shadow (CSS2.1, universal)
   - Animations use transform+opacity only (GPU-safe in all WebViews)
   ============================================================ */
const LANDING_CSS = `
  .welcome-grid {
    background-image:
      linear-gradient(rgba(56,189,248,0.07) 1px, transparent 1px),
      linear-gradient(90deg, rgba(56,189,248,0.07) 1px, transparent 1px);
    background-size: 56px 56px;
    -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%);
    mask-image: linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%);
  }

  /* Particles — transform+opacity only, GPU-safe */
  @keyframes welcome-particle {
    0%   { -webkit-transform: translateY(100vh); transform: translateY(100vh); opacity: 0; }
    10%  { opacity: 1; }
    90%  { opacity: 1; }
    100% { -webkit-transform: translateY(-10vh) translateX(20px); transform: translateY(-10vh) translateX(20px); opacity: 0; }
  }
  .welcome-particle {
    position: absolute;
    bottom: -10px;
    border-radius: 50%;
    /* Solid colour fallback — no radial-gradient fading to transparent */
    background-color: rgba(56,189,248,0.7);
    -webkit-animation: welcome-particle linear infinite;
    animation: welcome-particle linear infinite;
    pointer-events: none;
  }
  .welcome-particle-gold {
    background-color: rgba(250,204,21,0.7);
  }

  /* Spin — used on sneak-peek card inner ring */
  @keyframes spin-slow {
    from { -webkit-transform: rotate(0deg);   transform: rotate(0deg); }
    to   { -webkit-transform: rotate(360deg); transform: rotate(360deg); }
  }
  .animate-spin-slow {
    -webkit-animation: spin-slow 12s linear infinite;
    animation: spin-slow 12s linear infinite;
  }

  /* ── PLAY button ── */
  .play-cta-wrap {
    position: relative;
    margin-top: 20px;
    width: 144px;
    height: 144px;
    -webkit-flex: 0 0 144px;
    flex: 0 0 144px;
    z-index: 50;
  }
  @media (min-width: 640px) {
    .play-cta-wrap { margin-top: 28px; width: 176px; height: 176px; -webkit-flex: 0 0 176px; flex: 0 0 176px; }
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
    -webkit-user-select: none;
    user-select: none;
    box-sizing: border-box;
    /* Solid colour first — guaranteed render on every engine */
    background-color: #0284c7;
    /* Simple vertical gradient — supported since Android 2.3 */
    background-image: -webkit-linear-gradient(top, #7dd3fc 0%, #38bdf8 40%, #0284c7 75%, #075985 100%);
    background-image: linear-gradient(180deg, #7dd3fc 0%, #38bdf8 40%, #0284c7 75%, #075985 100%);
    border: 7px solid #fef08a;
    /* inset box-shadow = gloss. CSS2.1 — works on every Android WebView.
       NO overflow:hidden — that's what caused the dark blob */
    -webkit-box-shadow:
      0 0 0 3px #fde68a,
      0 10px 24px -6px rgba(2,8,23,0.55),
      0 0 20px rgba(56,189,248,0.3),
      inset 0 6px 18px rgba(255,255,255,0.55),
      inset 0 2px 6px rgba(255,255,255,0.9);
    box-shadow:
      0 0 0 3px #fde68a,
      0 10px 24px -6px rgba(2,8,23,0.55),
      0 0 20px rgba(56,189,248,0.3),
      inset 0 6px 18px rgba(255,255,255,0.55),
      inset 0 2px 6px rgba(255,255,255,0.9);
    -webkit-transition: -webkit-transform 0.18s ease, filter 0.18s ease;
    transition: transform 0.18s ease, filter 0.18s ease;
  }
  /* Shine ellipse: solid rgba white — no blend modes, no gradients to transparency */
  .play-cta-shine { position: absolute; pointer-events: none; z-index: 1; }
  .play-cta-shine-1 {
    top: 8%; left: 14%; width: 52%; height: 26%;
    border-radius: 50%;
    background-color: rgba(255,255,255,0.42);
  }
  /* White dots — explicit z-index, solid colour, no compositing tricks */
  .play-cta-dot { position: absolute; pointer-events: none; background-color: #ffffff; border-radius: 50%; z-index: 1; }
  .play-cta-dot-1 { top: 26%; left: 22%; width: 7px; height: 7px; opacity: 0.85; }
  .play-cta-dot-2 { top: 56%; right: 18%; width: 5px; height: 5px; opacity: 0.65; }
  .play-cta-dot-3 { bottom: 24%; left: 30%; width: 4px; height: 4px; opacity: 0.55; }
  .play-cta-text {
    position: absolute;
    top: 50%; left: 0; right: 0;
    -webkit-transform: translateY(-50%);
    transform: translateY(-50%);
    text-align: center;
    z-index: 2;
    font-size: 34px;
    line-height: 1;
    color: #ffffff;
    text-shadow:
      -2px -2px 0 #0c4a6e,  2px -2px 0 #0c4a6e,
      -2px  2px 0 #0c4a6e,  2px  2px 0 #0c4a6e,
       0    3px 0 #075985,   0    4px 6px rgba(0,0,0,0.45);
  }
  @media (min-width: 640px) { .play-cta-text { font-size: 42px; } }
  .play-cta-coin {
    position: absolute; bottom: -4px; right: -6px;
    width: 36px; height: 36px; z-index: 3; object-fit: contain;
  }
  @media (min-width: 640px) {
    .play-cta-coin { width: 46px; height: 46px; bottom: -6px; right: -8px; }
  }
  .play-cta:hover  { -webkit-transform: scale(1.05); transform: scale(1.05); filter: brightness(1.06); }
  .play-cta:active { -webkit-transform: scale(0.96); transform: scale(0.96); filter: brightness(0.95); }

  @keyframes coin-bounce {
    0%,100% { -webkit-transform: translateY(0) rotate(0deg);   transform: translateY(0) rotate(0deg); }
    50%     { -webkit-transform: translateY(-3px) rotate(8deg); transform: translateY(-3px) rotate(8deg); }
  }
  .animate-coin-bounce {
    -webkit-animation: coin-bounce 2.2s ease-in-out infinite;
    animation: coin-bounce 2.2s ease-in-out infinite;
  }

  /* Countdown digit pulse */
  @keyframes cd-pulse {
    0%,100% { box-shadow: 0 10px 30px -10px rgba(56,189,248,0.5), inset 0 0 25px rgba(56,189,248,0.12); }
    50%     { box-shadow: 0 15px 40px -10px rgba(56,189,248,0.9), inset 0 0 35px rgba(56,189,248,0.22); }
  }
  .animate-cd-pulse {
    -webkit-animation: cd-pulse 1s ease-in-out infinite;
    animation: cd-pulse 1s ease-in-out infinite;
  }

  /* Orbit float */
  @keyframes orbit-float {
    0%,100% { -webkit-transform: translateY(0) rotate(-2deg);   transform: translateY(0) rotate(-2deg); }
    50%     { -webkit-transform: translateY(-14px) rotate(2deg); transform: translateY(-14px) rotate(2deg); }
  }
  .orbit-tile {
    -webkit-animation: orbit-float 8s ease-in-out infinite;
    animation: orbit-float 8s ease-in-out infinite;
  }

  /* Marquee — NO will-change (causes GPU compositing crashes in WebView) */
  @keyframes marquee {
    0%   { -webkit-transform: translateX(0);     transform: translateX(0); }
    100% { -webkit-transform: translateX(-50%);  transform: translateX(-50%); }
  }
  .animate-marquee {
    -webkit-animation: marquee 60s linear infinite;
    animation: marquee 60s linear infinite;
  }

  /* Sneak peek card — replace backdrop-blur with solid semi-transparent bg */
  .sneak-peek-card {
    background-color: rgba(12, 28, 65, 0.95);
    border: 2px solid rgba(250,204,21,0.5);
    border-radius: 1rem;
    overflow: hidden;
  }

  /* Orbit tiles — replace backdrop-blur-md with solid bg */
  .orbit-tile {
    background-color: rgba(255,255,255,0.06);
    border: 1px solid rgba(103,232,249,0.25);
    border-radius: 1rem;
  }

  /* Marquee item — replace backdrop-blur-sm with solid bg */
  .marquee-item {
    background-color: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 0.75rem;
    flex-shrink: 0;
  }
  .marquee-item:hover {
    border-color: rgba(103,232,249,0.4);
  }

  /* ── Stat pill (proof strip) ── */
  .stat-pill {
    background-color: rgba(255,255,255,0.04);
    border: 1px solid rgba(103,232,249,0.25);
    border-radius: 1rem;
  }

  /* ── Feature card ── */
  .feature-card {
    background-color: rgba(255,255,255,0.035);
    border: 1px solid rgba(103,232,249,0.18);
    border-radius: 1.25rem;
    -webkit-transition: border-color 0.2s ease, background-color 0.2s ease;
    transition: border-color 0.2s ease, background-color 0.2s ease;
  }
  .feature-card:hover {
    border-color: rgba(103,232,249,0.45);
    background-color: rgba(255,255,255,0.06);
  }
  .feature-card-icon {
    background-color: rgba(56,189,248,0.12);
    border: 1px solid rgba(103,232,249,0.35);
    border-radius: 0.85rem;
  }

  /* ── Phone mockup ──
     Bezel is a solid dark shell; the screen image is clipped with a plain
     overflow:hidden (safe — the "no overflow:hidden" WebView rule above
     only applies to elements that ALSO paint a gradient background on the
     same layer, which this doesn't: the glow lives on a separate sibling). */
  .phone-mockup {
    position: relative;
    width: 100%;
    max-width: 15.5rem;
  }
  .phone-mockup-glow {
    position: absolute;
    inset: -10%;
    border-radius: 2.5rem;
    pointer-events: none;
    z-index: 0;
  }
  .phone-mockup-frame {
    position: relative;
    z-index: 1;
    border-radius: 2rem;
    padding: 0.5rem;
    background-color: #0a0e1f;
    border: 2px solid rgba(103,232,249,0.4);
    box-shadow:
      0 20px 45px -15px rgba(2,8,23,0.7),
      0 0 0 1px rgba(0,0,0,0.4),
      inset 0 0 0 1px rgba(255,255,255,0.04);
  }
  .phone-mockup-notch {
    position: absolute;
    top: 0.5rem;
    left: 50%;
    -webkit-transform: translateX(-50%);
    transform: translateX(-50%);
    width: 34%;
    height: 0.9rem;
    background-color: #0a0e1f;
    border-radius: 999px;
    z-index: 2;
  }
  .phone-mockup-screen {
    position: relative;
    overflow: hidden;
    border-radius: 1.5rem;
    background-color: #060814;
    aspect-ratio: 9 / 18.5;
  }
  .phone-mockup-screen img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
  }
  /* Gentle float — reuses the orbit-float keyframe already defined above */
  .mockup-float {
    -webkit-animation: orbit-float 9s ease-in-out infinite;
    animation: orbit-float 9s ease-in-out infinite;
  }

  /* ── Showcase (alternating image + text) ── */
  .showcase-card {
    background-color: rgba(255,255,255,0.03);
    border: 1px solid rgba(103,232,249,0.15);
    border-radius: 1.5rem;
  }

  /* ── Lab logbook (testimonial-style) card ── */
  .logbook-card {
    background-color: rgba(255,255,255,0.035);
    border: 1px solid rgba(250,204,21,0.2);
    border-radius: 1.1rem;
    border-left: 3px solid rgba(250,204,21,0.5);
  }

  /* ── Final CTA panel ── */
  .final-cta-panel {
    background: linear-gradient(180deg, rgba(56,189,248,0.08) 0%, rgba(10,8,32,0) 100%);
    border-top: 1px solid rgba(103,232,249,0.15);
    border-bottom: 1px solid rgba(103,232,249,0.15);
  }

  @media (prefers-reduced-motion: reduce) {
    .welcome-particle, .orbit-tile, .animate-spin-slow, .animate-cd-pulse,
    .animate-marquee, .animate-coin-bounce, .mockup-float {
      -webkit-animation: none !important;
      animation: none !important;
    }
  }
`;

/* ============================================================
   ✅ Inject styles at MODULE LOAD TIME — outside React entirely.
   Runs once when the JS bundle is parsed. Never called again.
   Component mount/unmount/countdown ticks cannot affect it.
   ============================================================ */
(function injectLandingStyles() {
  if (typeof document === 'undefined') return;
  const id = 'dogefood-landing-styles';
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = LANDING_CSS;
  document.head.appendChild(el);
}());

/* ─── Countdown hook ─── */
const useCountdown = (target) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, target - now);
  return {
    days:     Math.floor(diff / 86400000),
    hours:    Math.floor((diff % 86400000) / 3600000),
    minutes:  Math.floor((diff % 3600000)  / 60000),
    seconds:  Math.floor((diff % 60000)    / 1000),
    finished: diff <= 0,
  };
};

/* ============================================================
   WelcomeScreen
   Only the countdown digits + badge text re-render each second.
   Everything else is React.memo'd and renders exactly once.
   ============================================================ */
const WelcomeScreen = ({ onPlayNow }) => {
  const { isDarkMode } = useTheme();
  const [showAuthModal, setShowAuthModal] = useState(false);
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

      {/* ─── Top bar ─── */}
      <header className="relative z-20 flex items-start justify-between px-3 sm:px-8 pt-3 sm:pt-6 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <DogeFoodLogo size="sm" showText={false} showBeta={false} className="w-10 h-10 sm:w-12 sm:h-12" />
          <div className="hidden sm:block">
            <div className="text-[10px] tracking-[0.3em] font-mono" style={{ color: 'rgba(103,232,249,0.7)' }}>DOGEFOOD LAB</div>
            <div className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>Season 2 · Reactor</div>
          </div>
        </div>
        <SneakPeekCard />
      </header>

      {/* ─── Main hero ─── */}
      <main className="relative z-10 flex flex-col items-center justify-center px-3 sm:px-6 pt-4 sm:pt-12 pb-6 sm:pb-8 w-full">
        <div className="relative flex flex-col items-center w-full max-w-[28rem] sm:max-w-none">

          {/* Glow halo — solid colour, no filter:blur on layout element */}
          <div className="absolute inset-0 -z-10 pointer-events-none">
            <div
              className="absolute left-1/2 top-1/2 w-[24rem] h-[24rem] sm:w-[40rem] sm:h-[40rem] rounded-full"
              style={{
                transform: 'translate(-50%, -50%)',
                WebkitTransform: 'translate(-50%, -50%)',
                background: 'radial-gradient(circle, rgba(56,189,248,0.25) 0%, rgba(168,85,247,0.1) 40%, transparent 70%)',
                opacity: 0.7,
              }}
            />
          </div>

          {/* Eyebrow */}
          <div className="relative mb-1.5 sm:mb-3 flex items-center gap-2 sm:gap-4">
            <span className="hidden sm:inline-block w-12 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(103,232,249,0.7))' }} />
            <span
              data-testid="hero-eyebrow"
              className="text-[9px] sm:text-xs tracking-[0.4em] sm:tracking-[0.45em] font-mono uppercase"
              style={{ color: 'rgba(103,232,249,0.8)' }}
            >
              The Meme Mixer Reactor
            </span>
            <span className="hidden sm:inline-block w-12 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(103,232,249,0.7))' }} />
          </div>

          {/* Season 2 badge — no backdrop-blur, solid semi-transparent bg */}
          <div
            className="mt-4 sm:mt-7 flex items-center gap-2 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full"
            style={{
              border: '2px solid rgba(250,204,21,0.7)',
              backgroundColor: 'rgba(250,204,21,0.12)',
              boxShadow: '0 4px 0 rgba(0,0,0,0.25), 0 0 20px rgba(250,204,21,0.4)',
            }}
          >
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <span
              className="text-[10px] sm:text-sm tracking-[0.3em] font-bold uppercase"
              style={{ fontFamily: "'Fredoka', system-ui, sans-serif", color: '#fef08a' }}
            >
              Season 2 is LIVE 
            </span>
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          </div>

          {/* PLAY button */}
          <div className="play-cta-wrap" data-testid="play-now-btn-wrap">
            <button
              data-testid="play-now-btn"
              onClick={onPlayNow}
              className="play-cta"
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
              <img src={LAB_TOKEN} alt="" className="play-cta-coin animate-coin-bounce" />
            </button>
          </div>

          {/* Tagline */}
          <p
            data-testid="hero-tagline"
            className="mt-4 sm:mt-7 text-center text-[13px] sm:text-lg max-w-xl px-2 sm:px-4 leading-relaxed"
            style={{ color: 'rgba(224,242,254,0.9)' }}
          >
            Mix legendary memes. Mint mythical treats.
            <br />
            Forge your reputation across{' '}
            <span style={{ color: '#fde047', fontWeight: 700 }}>50 new ingredients</span>{' '}
            in Season 2.
          </p>

          {/* Guest CTA */}
          <button
            data-testid="guest-cta-btn"
            onClick={() => setShowAuthModal(true)}
            className="mt-3 sm:mt-4 text-[11px] sm:text-sm underline-offset-4 hover:underline transition-colors text-center px-3"
            style={{ color: 'rgba(103,232,249,0.7)' }}
          >
            New here? Sign up as guest, with email or Google
          </button>
        </div>
      </main>

      {/* Hero showcase — real Lab UI, right under the PLAY button */}
      <section data-testid="hero-showcase" className="relative z-10 flex justify-center px-3 pb-1 sm:pb-2 -mt-1 sm:mt-1">
        <PhoneMockup src={SHOT_LAB_OVERVIEW} alt="Inside the DogeFood Lab reactor" glow="cyan" className="w-40 sm:w-56" />
      </section>

      <OrbitingIngredients />
      <StatsBar />
      <IngredientMarquee />

      <FeaturesGrid />

      <ShowcaseSection
        testId="showcase-brew"
        eyebrow="The Payoff"
        title="Every brew ends in a reveal"
        desc="Load your ingredients, start the timer, and come back to a rarity roll — from Starter all the way up to Mythic. Heat events can push the odds in your favor while you wait."
        bullets={[
          '5 rarity tiers, Starter through Mythic',
          'XP and points land the moment you collect',
          'Heat events can bump your odds mid-brew',
        ]}
        shot={SHOT_EPIC_TREAT}
        alt="Level 10 Epic Treat reveal"
        glow="purple"
      />

      <ShowcaseSection
        testId="showcase-crates"
        reverse
        eyebrow="Lab Rewards"
        title="Crack crates. Grow your Shiba."
        desc="Feed your companion, hit an XP milestone, and a Lab Crate is waiting. Open it for rare ingredients, cosmetics, and extra lives that carry straight into your next brew."
        bullets={[
          'Every XP milestone drops a new crate',
          '4 crate tiers, from Basic to Legendary',
          'Rare ingredients unlock straight into your tray',
        ]}
        shot={SHOT_MUTATION_CRATE}
        alt="Opening a Tier 2 Mutation Crate"
        glow="gold"
      />

      <ArenaShowcase />

      <LabLogbook />

      <FinalCTA onPlayNow={onPlayNow} onGuestClick={() => setShowAuthModal(true)} />

      {/* Footer */}
      <footer className="relative z-10 px-3 pb-3 sm:pb-6 mt-3 sm:mt-6">
        <div
          className="flex flex-wrap items-center justify-center gap-2 sm:gap-6 text-[9px] sm:text-xs tracking-[0.2em] sm:tracking-[0.25em] font-mono uppercase"
          style={{ color: 'rgba(103,232,249,0.4)' }}
        >
          <span>Web3 Gaming</span>
          <span className="w-1 h-1 rounded-full" style={{ backgroundColor: 'rgba(103,232,249,0.4)' }} />
          <span>Mythic NFTs</span>
          <span className="w-1 h-1 rounded-full" style={{ backgroundColor: 'rgba(103,232,249,0.4)' }} />
          <span>$LAB Rewards</span>
          <span className="w-1 h-1 rounded-full" style={{ backgroundColor: 'rgba(103,232,249,0.4)' }} />
          <span style={{ color: 'rgba(255,255,255,0.5)' }} data-testid="beta-tag">v2.0 BETA</span>
        </div>
      </footer>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={handleAuthSuccess} />
      <WhatsNewToast />
    </div>
  );
};

/* ─── Cinematic background ───
   ✅ React.memo — renders once, never re-renders from countdown ticks
   ✅ No filter:blur on layout divs — replaced with radial-gradient opacity
   ✅ No backdrop-filter anywhere                                         */
const CinematicBackground = React.memo(() => (
  <>
    {/* Deep space base */}
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #1e3a8a 0%, #0c1a3f 40%, #050917 80%, #02030a 100%)' }}
    />

    {/* Grid */}
    <div aria-hidden className="absolute inset-0 pointer-events-none welcome-grid" style={{ opacity: 0.3 }} />

    {/* Horizon glow — solid gradient, no filter:blur */}
    <div
      aria-hidden
      className="absolute left-0 right-0 pointer-events-none"
      style={{
        top: '60%', height: '40%',
        background: 'linear-gradient(to top, rgba(56,189,248,0.2), transparent 70%)',
      }}
    />

    {/* Sun-spot — radial gradient at reduced opacity, no filter:blur */}
    <div
      aria-hidden
      className="absolute rounded-full pointer-events-none"
      style={{
        top: -160, left: '50%',
        width: '44rem', height: '44rem',
        transform: 'translateX(-50%)',
        WebkitTransform: 'translateX(-50%)',
        background: 'radial-gradient(circle, rgba(250,204,21,0.3) 0%, rgba(56,189,248,0.08) 50%, transparent 75%)',
        opacity: 0.5,
      }}
    />

    {/* Side glows */}
    <div
      aria-hidden
      className="absolute rounded-full pointer-events-none"
      style={{
        bottom: -128, left: -128,
        width: '36rem', height: '36rem',
        background: 'radial-gradient(circle, rgba(56,189,248,0.35) 0%, transparent 65%)',
        opacity: 0.45,
      }}
    />
    <div
      aria-hidden
      className="absolute rounded-full pointer-events-none"
      style={{
        bottom: -128, right: -128,
        width: '36rem', height: '36rem',
        background: 'radial-gradient(circle, rgba(250,204,21,0.28) 0%, transparent 65%)',
        opacity: 0.35,
      }}
    />

    {/* Drifting particles — simple solid circles, transform+opacity animation only */}
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

    {/* Vignette */}
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 100%)' }}
    />
  </>
));

/* ─── Countdown digit card ─── */
const CountdownDigit = ({ value, label, pad = 2, pulse = false }) => (
  <div data-testid={`cd-${label.toLowerCase()}`} className="flex flex-col items-center flex-1 min-w-0 max-w-[5.5rem]">
    <div
      className={`relative w-full rounded-xl sm:rounded-2xl px-1 py-2.5 sm:py-3.5 ${pulse ? 'animate-cd-pulse' : ''}`}
      style={{
        background: 'linear-gradient(180deg, rgba(10,8,32,0.95) 0%, rgba(6,4,26,0.95) 100%)',
        border: '1px solid rgba(103,232,249,0.3)',
        boxShadow: '0 10px 30px -10px rgba(56,189,248,0.5), inset 0 0 25px rgba(56,189,248,0.12)',
      }}
    >
      <span
        className="absolute left-1/2 top-0 h-px"
        style={{
          width: '50%',
          transform: 'translateX(-50%)',
          WebkitTransform: 'translateX(-50%)',
          background: 'linear-gradient(to right, transparent, rgba(103,232,249,0.6), transparent)',
        }}
      />
      <div
        className="text-center font-bold tabular-nums leading-none"
        style={{
          fontSize: 'clamp(1.5rem, 7vw, 3rem)',
          color: '#ffffff',
          textShadow: '0 0 14px rgba(56,189,248,0.85), 0 2px 4px rgba(0,0,0,0.4)',
          fontFamily: "'JetBrains Mono', 'Courier New', monospace",
        }}
      >
        {String(value).padStart(pad, '0')}
      </div>
    </div>
    <span
      className="mt-1.5 text-[9px] sm:text-[10px] tracking-[0.3em] sm:tracking-[0.35em] font-mono font-bold"
      style={{ color: 'rgba(103,232,249,0.6)' }}
    >
      {label}
    </span>
  </div>
);

const Colon = () => (
  <span
    aria-hidden
    className="text-xl sm:text-4xl font-black self-center -mt-3 sm:-mt-4 select-none shrink-0"
    style={{ color: 'rgba(103,232,249,0.5)', textShadow: '0 0 10px rgba(56,189,248,0.4)' }}
  >
    :
  </span>
);

/* ─── Sneak Peek card ───
   ✅ No backdrop-blur — replaced with solid dark bg via .sneak-peek-card
   ✅ No conic-gradient — replaced with simple linear gradient ring      */
const SneakPeekCard = () => {
  const meta = INGREDIENT_ICONS['S2_050'];
  return (
    <div
      data-testid="sneak-peek-card"
      className="sneak-peek-card relative max-w-[9.5rem] sm:max-w-[15rem] shrink-0"
      style={{ boxShadow: '0 5px 0 rgba(0,0,0,0.3), 0 10px 30px -8px rgba(250,204,21,0.5)' }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(to right, transparent, rgba(253,224,71,0.6), transparent)' }}
      />
      <div className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-3">
        <div
          className="relative w-10 h-10 sm:w-16 sm:h-16 shrink-0 rounded-lg sm:rounded-xl flex items-center justify-center overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(250,204,21,0.2) 0%, rgba(56,189,248,0.2) 100%)',
            border: '2px solid rgba(253,224,71,0.4)',
          }}
        >
          {/* Ring: linear gradient instead of conic-gradient (unsupported in old WebView) */}
          <div
            className="absolute inset-0 animate-spin-slow"
            style={{
              opacity: 0.5,
              background: 'linear-gradient(135deg, rgba(250,204,21,0.6) 0%, rgba(56,189,248,0.6) 50%, rgba(250,204,21,0.6) 100%)',
            }}
          />
          <img
            src={meta?.icon}
            alt={meta?.name}
            className="relative w-7 h-7 sm:w-12 sm:h-12 object-contain"
            style={{ filter: 'drop-shadow(0 0 6px rgba(250,204,21,0.5))' }}
          />
        </div>
        <div className="min-w-0">
          <div
            className="text-[8px] sm:text-[9px] tracking-[0.25em] sm:tracking-[0.3em] font-bold uppercase truncate"
            style={{ fontFamily: "'Fredoka', system-ui, sans-serif", color: '#fde047' }}
          >
            Mythic Drop
          </div>
          <div className="text-[11px] sm:text-sm font-bold text-white truncate leading-tight">{meta?.name}</div>
          <div className="hidden sm:block text-[10px] sm:text-[11px]" style={{ color: 'rgba(186,230,253,0.8)' }}>
            Drops in Season 2
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Orbiting ingredient tiles ───
   ✅ React.memo — renders once
   ✅ No backdrop-blur — .orbit-tile uses solid bg                        */
const OrbitingIngredients = React.memo(() => {
  const items = SNEAK_PEEK_IDS
    .map((id, idx) => ({ id, meta: INGREDIENT_ICONS[id], idx }))
    .filter((x) => x.meta?.icon);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 hidden md:block">
      {items.map((it, i) => {
        const side   = i % 2 === 0 ? 'left' : 'right';
        const top    = 18 + (i * 13) % 60;
        const offset = 4  + (i * 3)  % 10;
        const size   = 56 + (i % 3)  * 14;
        return (
          <div
            key={it.id}
            className="orbit-tile absolute p-2"
            style={{
              [side]: `${offset}%`,
              top: `${top}%`,
              width: size,
              height: size,
              animationDelay: `${i * 0.7}s`,
              animationDuration: `${7 + i}s`,
              boxShadow: '0 8px 20px -4px rgba(56,189,248,0.3)',
            }}
          >
            <img
              src={it.meta.icon}
              alt=""
              className="w-full h-full object-contain"
              style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.35))' }}
            />
          </div>
        );
      })}
    </div>
  );
});

/* ─── Marquee strip ───
   ✅ React.memo — renders once
   ✅ No will-change:transform (GPU compositing crash in WebView)
   ✅ No backdrop-blur — .marquee-item uses solid bg                      */
const IngredientMarquee = React.memo(() => {
  const all     = ALL_S2_IDS.map((id) => ({ id, meta: INGREDIENT_ICONS[id] })).filter((x) => x.meta?.icon);
  const doubled = [...all, ...all];
  return (
    <section
      data-testid="ingredient-marquee"
      className="relative z-10 mt-1 sm:mt-4 py-2.5 sm:py-4 overflow-hidden"
      style={{ borderTop: '1px solid rgba(103,232,249,0.15)', borderBottom: '1px solid rgba(103,232,249,0.15)' }}
    >
      <div className="flex items-center justify-between px-3 sm:px-8 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
          <span
            className="text-[9px] sm:text-xs tracking-[0.25em] sm:tracking-[0.35em] font-mono font-bold uppercase truncate"
            style={{ color: 'rgba(103,232,249,0.8)' }}
          >
            Season 2 · 50 Ingredients
          </span>
        </div>
        <span className="hidden sm:inline text-[10px] sm:text-xs font-mono shrink-0" style={{ color: 'rgba(103,232,249,0.4)' }}>
          Starter → Mythic
        </span>
      </div>
      <div className="relative">
        {/* Edge fades */}
        <div
          className="absolute left-0 top-0 bottom-0 w-10 sm:w-32 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, #04030f, transparent)' }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-10 sm:w-32 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, #04030f, transparent)' }}
        />
        {/* Strip — no will-change */}
        <div className="flex gap-2.5 sm:gap-4 animate-marquee whitespace-nowrap">
          {doubled.map((it, i) => (
            <div
              key={`${it.id}-${i}`}
              className="marquee-item w-11 h-11 sm:w-16 sm:h-16 p-1.5 flex items-center justify-center"
              title={it.meta.name}
            >
              <img
                src={it.meta.icon}
                alt=""
                className="w-full h-full object-contain"
                style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.2))' }}
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

/* ─── Phone mockup ───
   Reusable frame for showing real in-game captures. Solid-colour bezel +
   a separate glow layer behind it (kept off the overflow:hidden screen
   layer per the WebView rule at the top of this file).             */
const PHONE_GLOWS = {
  cyan:   'radial-gradient(circle, rgba(56,189,248,0.35) 0%, transparent 70%)',
  gold:   'radial-gradient(circle, rgba(250,204,21,0.32) 0%, transparent 70%)',
  purple: 'radial-gradient(circle, rgba(168,85,247,0.35) 0%, transparent 70%)',
};
const PhoneMockup = ({ src, alt, glow = 'cyan', float = false, className = '' }) => (
  <div className={`phone-mockup ${float ? 'mockup-float' : ''} ${className}`}>
    <div aria-hidden className="phone-mockup-glow" style={{ background: PHONE_GLOWS[glow] || PHONE_GLOWS.cyan }} />
    <div className="phone-mockup-frame">
      <span aria-hidden className="phone-mockup-notch" />
      <div className="phone-mockup-screen">
        <img src={src} alt={alt} loading="lazy" />
      </div>
    </div>
  </div>
);

/* ─── Section eyebrow ─── */
const SectionEyebrow = ({ children }) => (
  <div className="flex items-center justify-center gap-3 sm:gap-4">
    <span className="w-8 sm:w-12 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(103,232,249,0.7))' }} />
    <span className="text-[9px] sm:text-xs tracking-[0.35em] sm:tracking-[0.4em] font-mono uppercase" style={{ color: 'rgba(103,232,249,0.8)' }}>
      {children}
    </span>
    <span className="w-8 sm:w-12 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(103,232,249,0.7))' }} />
  </div>
);

/* ─── Proof strip ─── real gameplay facts, not placeholder growth metrics */
const STATS = [
  { value: '50', label: 'Ingredients' },
  { value: '5', label: 'Rarity Tiers' },
  { value: '24/7', label: 'Live Arena' },
];
const StatsBar = () => (
  <section data-testid="stats-bar" className="relative z-10 px-3 sm:px-6 mt-1 sm:mt-3 mb-1">
    <div className="max-w-2xl mx-auto grid grid-cols-3 gap-2 sm:gap-4">
      {STATS.map((s) => (
        <div key={s.label} className="stat-pill px-2 py-3 sm:py-5 text-center">
          <div
            className="text-xl sm:text-3xl font-black"
            style={{ fontFamily: "'Fredoka', system-ui, sans-serif", color: '#fef08a', textShadow: '0 0 16px rgba(250,204,21,0.35)' }}
          >
            {s.value}
          </div>
          <div className="mt-0.5 text-[8px] sm:text-[10px] tracking-[0.18em] sm:tracking-[0.2em] font-mono uppercase" style={{ color: 'rgba(103,232,249,0.7)' }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  </section>
);

/* ─── Features grid ─── */
const FEATURES = [
  { icon: '🧪', title: 'Mix & Brew', desc: 'Load ingredients into the Reactor and brew treats that mature over real time. Rarer combos pay out bigger.' },
  { icon: '🔥', title: 'Heat Events', desc: 'Critical Mix and Golden Hour roll through the Lab at random, stacking bonus rarity and points while they last.' },
  { icon: '🎁', title: 'Lab Crates & Growth', desc: 'Feed your Shiba, level it up, and crack open crates for rare ingredients, cosmetics, and extra lives.' },
  { icon: '⚔️', title: 'Live Arena', desc: 'Enter with $LAB, brew against the clock, and climb the leaderboard for a share of the prize pool.' },
];
const FeaturesGrid = () => (
  <section data-testid="features-section" className="relative z-10 px-3 sm:px-6 py-8 sm:py-14">
    <div className="max-w-5xl mx-auto">
      <SectionEyebrow>What&apos;s In The Lab</SectionEyebrow>
      <h2
        className="mt-2 text-center text-2xl sm:text-4xl font-black text-white leading-tight"
        style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}
      >
        Built for players who like <span style={{ color: '#38bdf8' }}>chaos</span> with a plan
      </h2>
      <div className="mt-6 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
        {FEATURES.map((f) => (
          <div key={f.title} className="feature-card p-4 sm:p-6 flex gap-3 sm:gap-4 items-start">
            <div className="feature-card-icon shrink-0 w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center text-xl sm:text-2xl">
              {f.icon}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-lg font-bold text-white">{f.title}</h3>
              <p className="mt-1 text-[12px] sm:text-sm leading-relaxed" style={{ color: 'rgba(224,242,254,0.75)' }}>
                {f.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ─── Alternating image + text showcase ─── */
const ShowcaseSection = ({ eyebrow, title, desc, bullets, shot, alt, glow, reverse, testId }) => (
  <section data-testid={testId} className="relative z-10 px-3 sm:px-6 py-5 sm:py-10">
    <div className={`max-w-4xl mx-auto flex flex-col ${reverse ? 'sm:flex-row-reverse' : 'sm:flex-row'} items-center gap-6 sm:gap-10`}>
      <div className="shrink-0">
        <PhoneMockup src={shot} alt={alt} glow={glow} float className="w-40 sm:w-56" />
      </div>
      <div className="showcase-card p-5 sm:p-8 w-full sm:flex-1 min-w-0">
        <span
          className="text-[9px] sm:text-[10px] tracking-[0.3em] font-mono uppercase"
          style={{ color: glow === 'gold' ? '#fde047' : glow === 'purple' ? '#c084fc' : 'rgba(103,232,249,0.8)' }}
        >
          {eyebrow}
        </span>
        <h3 className="mt-2 text-xl sm:text-3xl font-black text-white" style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}>
          {title}
        </h3>
        <p className="mt-3 text-[13px] sm:text-base leading-relaxed" style={{ color: 'rgba(224,242,254,0.8)' }}>
          {desc}
        </p>
        {bullets && (
          <ul className="mt-4 space-y-1.5">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2 text-[12px] sm:text-sm" style={{ color: 'rgba(224,242,254,0.7)' }}>
                <span
                  className="mt-1.5 w-1 h-1 rounded-full shrink-0"
                  style={{ backgroundColor: glow === 'gold' ? '#fde047' : glow === 'purple' ? '#c084fc' : '#38bdf8' }}
                />
                {b}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  </section>
);

/* ─── Arena + Spin dual-phone showcase ─── */
const ArenaShowcase = () => (
  <section data-testid="showcase-arena" className="relative z-10 px-3 sm:px-6 py-5 sm:py-10">
    <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
      <div className="flex gap-3 sm:gap-5 shrink-0">
        <PhoneMockup src={SHOT_ACTIVITY_STATS} alt="Weekly arena activity and rank" glow="cyan" className="w-32 sm:w-44" />
        <PhoneMockup src={SHOT_SPIN_WHEEL} alt="Spin and win wheel" glow="gold" float className="w-32 sm:w-44 mt-6 sm:mt-10" />
      </div>
      <div className="showcase-card p-5 sm:p-8 w-full sm:flex-1 min-w-0">
        <span className="text-[9px] sm:text-[10px] tracking-[0.3em] font-mono uppercase" style={{ color: 'rgba(103,232,249,0.8)' }}>
          Compete &amp; Spin
        </span>
        <h3 className="mt-2 text-xl sm:text-3xl font-black text-white" style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}>
          Climb the board. Spin for more.
        </h3>
        <p className="mt-3 text-[13px] sm:text-base leading-relaxed" style={{ color: 'rgba(224,242,254,0.8)' }}>
          Every entry, treat, and streak feeds your rank. One free spin lands every 24 hours —
          points, extra lives, even a Mythic ingredient are all on the wheel.
        </p>
        <ul className="mt-4 space-y-1.5">
          <li className="flex items-start gap-2 text-[12px] sm:text-sm" style={{ color: 'rgba(224,242,254,0.7)' }}>
            <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: '#38bdf8' }} />
            Entry fees feed a live prize pool
          </li>
          <li className="flex items-start gap-2 text-[12px] sm:text-sm" style={{ color: 'rgba(224,242,254,0.7)' }}>
            <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: '#fde047' }} />
            Free daily spin, no purchase required
          </li>
        </ul>
      </div>
    </div>
  </section>
);

/* ─── Lab logbook ─── in-universe "testimonials", styled as anonymized
   scientist log entries (same handle format the Lab already uses for
   real players) rather than claimed real-user reviews.               */
const LOGBOOK_ENTRIES = [
  { handle: 'Scientist 0x4F2A…', tag: 'Rank #7 this week', quote: "Rolled a Critical Mix during Golden Hour and the points just kept climbing. Didn't touch my phone for twenty minutes." },
  { handle: 'Scientist 0x91CE…', tag: 'Mythic Chef', quote: "My Shiba hit Alpha stage and the crate that dropped had two Rare ingredients I'd never seen before. Worth the grind." },
  { handle: 'Scientist 0xB37D…', tag: 'Arena regular', quote: "The entry fee is small enough that losing doesn't sting, but the leaderboard still gets genuinely competitive once the pool builds up." },
  { handle: 'Scientist 0x1A6F…', tag: 'Day 40 streak', quote: "The daily spin is the first thing I open the app for. Landed 4 Extra Lives once and rode that streak for a week." },
];
const LabLogbook = () => (
  <section data-testid="logbook-section" className="relative z-10 px-3 sm:px-6 py-8 sm:py-14">
    <div className="max-w-5xl mx-auto">
      <SectionEyebrow>Scientist Transmissions</SectionEyebrow>
      <h2 className="mt-2 text-center text-2xl sm:text-4xl font-black text-white" style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}>
        Straight from the lab logbook
      </h2>
      <div className="mt-6 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
        {LOGBOOK_ENTRIES.map((e) => (
          <div key={e.handle} className="logbook-card p-4 sm:p-6">
            <p className="text-[13px] sm:text-[15px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.92)' }}>
              &ldquo;{e.quote}&rdquo;
            </p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-mono truncate" style={{ color: 'rgba(103,232,249,0.8)' }}>{e.handle}</span>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide shrink-0" style={{ color: '#fde047' }}>{e.tag}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ─── Final CTA ─── bookends the hero PLAY button; reuses the exact same
   tested button markup/classes rather than introducing a new style.   */
const FinalCTA = ({ onPlayNow, onGuestClick }) => (
  <section data-testid="final-cta-section" className="final-cta-panel relative z-10 mt-2 sm:mt-6 py-10 sm:py-16 px-3 sm:px-6">
    <div className="relative max-w-2xl mx-auto flex flex-col items-center text-center">
      <SectionEyebrow>Ready When You Are</SectionEyebrow>
      <h2
        className="mt-3 text-2xl sm:text-5xl font-black text-white leading-tight"
        style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}
      >
        Your first brew is one tap away
      </h2>
      <p className="mt-3 max-w-md text-[13px] sm:text-base" style={{ color: 'rgba(224,242,254,0.8)' }}>
        No app store, no download. Connect a wallet or jump in as a guest and start mixing in seconds.
      </p>

      <div className="play-cta-wrap" data-testid="final-play-btn-wrap" style={{ marginTop: '1.75rem' }}>
        <button data-testid="final-play-btn" onClick={onPlayNow} className="play-cta" aria-label="Play Now">
          <span aria-hidden className="play-cta-shine play-cta-shine-1" />
          <span aria-hidden className="play-cta-dot play-cta-dot-1" />
          <span aria-hidden className="play-cta-dot play-cta-dot-2" />
          <span aria-hidden className="play-cta-dot play-cta-dot-3" />
          <span
            className="play-cta-text"
            style={{ fontFamily: "'Bowlby One', 'Luckiest Guy', 'Fredoka', system-ui, sans-serif", letterSpacing: '0.02em', fontWeight: 400 }}
          >
            PLAY
          </span>
          <img src={LAB_TOKEN} alt="" className="play-cta-coin animate-coin-bounce" />
        </button>
      </div>

      <button
        data-testid="final-guest-cta-btn"
        onClick={onGuestClick}
        className="mt-4 text-[11px] sm:text-sm underline-offset-4 hover:underline transition-colors"
        style={{ color: 'rgba(103,232,249,0.7)' }}
      >
        New here? Sign up as guest, with email or Google
      </button>
    </div>
  </section>
);

export default WelcomeScreen;
