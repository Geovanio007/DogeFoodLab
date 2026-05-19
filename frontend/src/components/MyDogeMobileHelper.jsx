import React, { useEffect, useState, useCallback } from 'react';

/**
 * MyDogeMobileHelper
 *
 * Why this exists:
 *   The Tomo wallet registry exposes MyDoge as a *Chrome extension*
 *   (namespace `mydoge.ethereum`). It has no `mobile.getDeeplink`, no
 *   WalletConnect support, no Android/iOS install link. Tapping it on
 *   mobile crashes through to:
 *     throw new Error("MyDoge not supported")
 *   in `connectMobile()`.
 *
 *   However, the DogeOS SDK ALSO ships an embedded wallet which IS the
 *   official MyDoge-branded wallet — accessible via the modal's
 *   email / Google / X login buttons. That flow works perfectly on mobile.
 *
 * What this does:
 *   - Listens (capture phase) for clicks anywhere on the page.
 *   - If the user is on a touch / small-screen device AND the click hit
 *     the "MyDoge" wallet button inside the DogeOS connect modal, we
 *     short-circuit the SDK's broken mobile path and instead surface our
 *     own helper sheet that explains the situation and points users to
 *     the working flow (Email/Google login = the embedded MyDoge wallet)
 *     plus an "Install MyDoge" fallback link.
 *
 *   - The component renders no UI until it's needed, so there's zero
 *     impact on the rest of the app.
 */

const STORE_LINKS = {
  ios: 'https://apps.apple.com/app/dogecoin-crypto-wallet/id1600967876',
  android: 'https://play.google.com/store/apps/details?id=com.mydoge.android',
  chrome:
    'https://chromewebstore.google.com/detail/mydoge-dogecoin-wallet/mljponncmhdlacmjbophphkbgcgjdnff',
  homepage: 'https://www.mydoge.com/',
};

function isMobileLike() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(pointer: coarse)')?.matches) return true;
  if (typeof navigator !== 'undefined') {
    return /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent || '');
  }
  return false;
}

function detectPlatform() {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'other';
}

const MyDogeMobileHelper = () => {
  const [open, setOpen] = useState(false);
  const platform = detectPlatform();

  // Programmatically click the embedded-wallet Email button inside the
  // SDK's modal so the user goes straight to the working login flow.
  const openSocialLogin = useCallback(() => {
    setOpen(false);
    // Defer so React commits before we touch the modal DOM.
    setTimeout(() => {
      const dlg = document.querySelector('[role="dialog"]');
      if (!dlg) return;
      // Prefer the Google button (one tap), fall back to email input, then X.
      const buttons = Array.from(dlg.querySelectorAll('button'));
      const google = buttons.find((b) => /^Google$/i.test((b.textContent || '').trim()));
      if (google) { google.click(); return; }
      const email = dlg.querySelector('input[type="email"], input[placeholder*="email" i]');
      if (email) { email.focus(); email.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      const x = buttons.find((b) => /^(Twitter|X)$/i.test((b.textContent || '').trim()));
      if (x) x.click();
    }, 60);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const onClickCapture = (event) => {
      if (!isMobileLike()) return;
      const target = event.target;
      if (!target || !(target instanceof Element)) return;
      // Only act inside the DogeOS modal.
      const inDialog = target.closest('[role="dialog"]');
      if (!inDialog) return;
      // Find the wallet-button row (button or [role=button]).
      const btn = target.closest('button, [role="button"]');
      if (!btn) return;
      const label = (btn.textContent || '').trim();
      if (!/^MyDoge$/i.test(label)) return;

      // Intercept — prevent the SDK from running its broken mobile path.
      event.preventDefault();
      event.stopImmediatePropagation();
      setOpen(true);
    };

    document.addEventListener('click', onClickCapture, true);
    return () => document.removeEventListener('click', onClickCapture, true);
  }, []);

  if (!open) return null;

  const installHref =
    platform === 'ios'
      ? STORE_LINKS.ios
      : platform === 'android'
        ? STORE_LINKS.android
        : STORE_LINKS.homepage;

  return (
    <div
      data-testid="mydoge-mobile-helper"
      className="fixed inset-0 z-[10001] flex items-end sm:items-center justify-center p-3"
      onClick={() => setOpen(false)}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden
      />
      <div
        className="relative w-full max-w-md rounded-3xl overflow-hidden border-2 border-yellow-300/70 bg-gradient-to-br from-blue-700/95 via-indigo-800/95 to-purple-900/95 shadow-[0_30px_80px_-10px_rgba(56,189,248,0.55)] animate-mydoge-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />

        <button
          data-testid="mydoge-helper-close-btn"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white text-xl font-bold flex items-center justify-center transition-colors"
        >
          ×
        </button>

        <div className="relative p-5 sm:p-6 text-center">
          <img
            src="https://web3-assets.tomo.inc/assets/wallets/mydoge/wallet.svg"
            alt="MyDoge"
            className="w-16 h-16 mx-auto rounded-2xl bg-white p-1.5 shadow-lg"
          />
          <h3
            className="mt-3 text-white font-bold text-xl sm:text-2xl leading-tight"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            MyDoge on mobile
          </h3>
          <p className="mt-2 text-white/85 text-sm leading-snug">
            The classic MyDoge wallet is a desktop Chrome extension. On mobile,
            you can still get your MyDoge-powered wallet instantly — just sign in
            with Email or Google below.
          </p>

          <div className="mt-5 flex flex-col gap-2.5">
            <button
              data-testid="mydoge-helper-social-btn"
              onClick={openSocialLogin}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-blue-900 text-sm font-bold shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
            >
              Use Email / Google
              <span aria-hidden>→</span>
            </button>

            <a
              data-testid="mydoge-helper-install-link"
              href={installHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/20 transition-colors"
            >
              {platform === 'ios'
                ? 'Get MyDoge on the App Store'
                : platform === 'android'
                  ? 'Get MyDoge on Google Play'
                  : 'Get MyDoge'}
            </a>

            <button
              data-testid="mydoge-helper-cancel-btn"
              onClick={() => setOpen(false)}
              className="text-white/60 hover:text-white/80 text-xs font-medium underline-offset-2 hover:underline transition-colors pt-1"
            >
              Pick a different wallet
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes mydogeIn {
          0%   { transform: translateY(30px) scale(.96); opacity: 0; }
          70%  { transform: translateY(-3px) scale(1.01); opacity: 1; }
          100% { transform: translateY(0)    scale(1);    opacity: 1; }
        }
        .animate-mydoge-in { animation: mydogeIn .35s cubic-bezier(.2,.9,.3,1.15) both; }
        @media (prefers-reduced-motion: reduce) {
          .animate-mydoge-in { animation: none; }
        }
      `}</style>
    </div>
  );
};

export default MyDogeMobileHelper;
