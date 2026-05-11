import React, { useEffect, useState } from 'react';

/**
 * "What's New" toast — appears on first visit to celebrate the new
 * DogeOS wallet-connect rollout. Features two scientist Shiba Inus
 * clinking lab beakers in a celebratory toast.
 *
 * Visibility is gated by localStorage so it only shows once per
 * browser/version. Bump WHATS_NEW_VERSION to re-surface it for an
 * existing audience after a future update.
 */
const WHATS_NEW_VERSION = 'wallet-connect-1';
const STORAGE_KEY = 'dogefood_whats_new_seen';

const WhatsNewToast = () => {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (seen === WHATS_NEW_VERSION) return;
    } catch (_) {
      // localStorage may be unavailable (private mode) — still show toast.
    }
    const t = setTimeout(() => setVisible(true), 1400);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    setClosing(true);
    try {
      localStorage.setItem(STORAGE_KEY, WHATS_NEW_VERSION);
    } catch (_) {
      /* ignore */
    }
    setTimeout(() => setVisible(false), 280);
  };

  if (!visible) return null;

  return (
    <div
      data-testid="whats-new-toast"
      className={`fixed z-[10000] left-1/2 -translate-x-1/2 bottom-4 sm:bottom-6 sm:left-auto sm:translate-x-0 sm:right-6 w-[92vw] max-w-sm pointer-events-auto ${
        closing ? 'whats-new-leave' : 'whats-new-enter'
      }`}
    >
      <div className="relative rounded-2xl overflow-hidden border-2 border-yellow-300/70 bg-gradient-to-br from-blue-600/95 via-blue-700/95 to-indigo-800/95 backdrop-blur-md shadow-[0_20px_60px_-10px_rgba(56,189,248,0.45)]">
        {/* sheen */}
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />

        {/* Close */}
        <button
          data-testid="whats-new-close-btn"
          onClick={dismiss}
          aria-label="Dismiss what's new"
          className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white text-lg font-bold flex items-center justify-center transition-colors"
        >
          ×
        </button>

        <div className="relative flex items-stretch gap-3 p-3 sm:p-4">
          <div className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-white/10 ring-2 ring-yellow-300/50 shadow-inner">
            <img
              src="/shibas-toasting.png"
              alt="Two scientist shibas clinking lab beakers"
              className="w-full h-full object-cover animate-cheers"
              loading="lazy"
            />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-yellow-400/95 text-blue-900">
                What's New
              </span>
              <span className="text-yellow-300 text-sm">✨</span>
            </div>
            <h3
              className="text-white font-bold text-base sm:text-lg leading-tight"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Cheers! Wallet Connect is here
            </h3>
            <p className="text-white/90 text-xs sm:text-sm mt-1 leading-snug">
              Plug in your wallet via DogeOS to claim $LAB, mint treats and join VIP scientists.
            </p>
            <button
              data-testid="whats-new-dismiss-btn"
              onClick={dismiss}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-400 hover:bg-yellow-300 text-blue-900 text-xs font-bold shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
            >
              Got it
              <span aria-hidden>→</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes whatsNewIn {
          0%   { transform: translateY(32px) scale(.94); opacity: 0; }
          60%  { transform: translateY(-4px) scale(1.01); opacity: 1; }
          100% { transform: translateY(0)    scale(1);    opacity: 1; }
        }
        @keyframes whatsNewOut {
          to { transform: translateY(20px) scale(.96); opacity: 0; }
        }
        @keyframes cheers {
          0%, 100% { transform: rotate(0deg); }
          25%      { transform: rotate(-3deg); }
          50%      { transform: rotate(0deg); }
          75%      { transform: rotate(3deg); }
        }
        .whats-new-enter > div { animation: whatsNewIn .45s cubic-bezier(.2,.9,.3,1.15) both; }
        .whats-new-leave > div { animation: whatsNewOut .28s ease-in both; }
        .animate-cheers       { animation: cheers 2.6s ease-in-out infinite; transform-origin: 50% 80%; }
        @media (prefers-reduced-motion: reduce) {
          .whats-new-enter > div,
          .whats-new-leave > div,
          .animate-cheers { animation: none !important; }
        }
      `}</style>
    </div>
  );
};

export default WhatsNewToast;
