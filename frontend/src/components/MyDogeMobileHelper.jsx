import React, { useEffect, useState, useCallback } from 'react';
import { useWalletConnect } from '@dogeos/dogeos-sdk';

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

// ---------------------------------------------------------------------------
// Login-control discovery for the SDK's connect modal.
//
// The interceptor below swallows the tap on "MyDoge", so the SDK modal stays
// on its external-wallets sub-view (ModalView.WalletList). The Email / Google
// / X controls live on the modal's home view (ModalView.WalletHome), which is
// NOT in the DOM at that moment - so the helper has to get the modal back to
// its home view before it can point the user at them. The SDK's public API
// only exposes openModal()/closeModal() (no setView), so we try, in order:
// what's already on screen -> the modal's own back control -> closing and
// reopening the modal (which restarts it on its home view).
// ---------------------------------------------------------------------------

// Everything an element says to a user or to assistive tech. v4.0.0's
// HeroUI-based modal can render social buttons icon-only, so textContent
// alone may be empty - also read aria-label / title / img alt / svg title.
function labelOf(el) {
  if (!el) return '';
  const parts = [el.textContent, el.getAttribute?.('aria-label'), el.getAttribute?.('title')];
  el.querySelectorAll?.('img[alt], svg title').forEach((n) => {
    parts.push(n.getAttribute?.('alt') || n.textContent);
  });
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

function clickableIn(root) {
  return Array.from(root.querySelectorAll('button, [role="button"]'));
}

function openDialogs() {
  return Array.from(document.querySelectorAll('[role="dialog"]'));
}

// Email first, always: it works in every webview, whereas Google/X OAuth
// opens a popup window that embedded browsers like MyDoge's commonly block
// outright (not just refuse to authenticate - the popup never opens at all,
// landing on about:blank#blocked). Three shapes to handle:
//   1. The email input is already visible - focus it directly.
//   2. Email is behind its own reveal control ("Continue with Email" /
//      "Use Email" / an email icon button) - click that, then look again.
//   3. No email path exists at all - only then fall back to Google/X.
function findEmailInput(dlg) {
  return dlg.querySelector(
    'input[type="email"], input[placeholder*="email" i], input[name*="email" i]'
  );
}

function findEmailRevealButton(dlg) {
  return clickableIn(dlg).find((b) => {
    const label = labelOf(b);
    if (!/email/i.test(label)) return false;
    // Exclude anything that's actually a Google/X button that merely
    // mentions email in passing (aria descriptions sometimes do).
    if (/google|twitter/i.test(label)) return false;
    return true;
  });
}

function findLoginControl() {
  const dialogs = openDialogs();
  for (const dlg of dialogs) {
    const email = findEmailInput(dlg);
    if (email) return { kind: 'focus', el: email };
  }
  for (const dlg of dialogs) {
    const reveal = findEmailRevealButton(dlg);
    if (reveal) return { kind: 'reveal-email', el: reveal };
  }
  for (const dlg of dialogs) {
    const buttons = clickableIn(dlg);
    const google = buttons.find((b) => /google/i.test(labelOf(b)));
    if (google) return { kind: 'click', el: google, risky: true };
    const x = buttons.find((b) => /twitter/i.test(labelOf(b)) || /^x$/i.test(labelOf(b)));
    if (x) return { kind: 'click', el: x, risky: true };
  }
  return null;
}

function findBackButton() {
  for (const dlg of openDialogs()) {
    const back = clickableIn(dlg).find((b) => /\bback\b/i.test(labelOf(b)));
    if (back) return back;
  }
  return null;
}

// Plain string on purpose: the in-app debug console prints objects as
// "[object Object]", which is what made earlier failures undiagnosable.
function describeDialogs() {
  const dialogs = openDialogs();
  if (!dialogs.length) return 'no [role=dialog] element in the DOM';
  return dialogs
    .map((dlg, i) => {
      const labels = clickableIn(dlg)
        .map((b) => labelOf(b) || '(no label)')
        .slice(0, 12)
        .join(' | ');
      return `dialog${i}: ${labels || 'no buttons'}${dlg.querySelector('input') ? ' [has input]' : ''}`;
    })
    .join(' // ');
}

function waitFor(fn, timeout = 2500, interval = 100) {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      const found = fn();
      if (found) return resolve(found);
      if (Date.now() - start >= timeout) return resolve(null);
      setTimeout(tick, interval);
    };
    tick();
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function actOn(control) {
  if (control.kind === 'focus') {
    control.el.focus();
    control.el.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  } else {
    control.el.click();
  }
}

const MyDogeMobileHelper = () => {
  const [open, setOpen] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const { openModal, closeModal } = useWalletConnect();
  const platform = detectPlatform();

  // Take the user to the SDK's working embedded-wallet login (Email / Google
  // / X). See the discovery helpers above for why this isn't a one-liner.
  const openSocialLogin = useCallback(async () => {
    setOpen(false);
    await sleep(60); // let React unmount this sheet first

    const locate = async () => {
      // 1) Maybe the controls are already on the screen the SDK is showing.
      let control = findLoginControl();

      // 2) Step the modal back to its home view via its own back control.
      if (!control) {
        const back = findBackButton();
        if (back) {
          back.click();
          control = await waitFor(findLoginControl, 1500);
        }
      }

      // 3) Last resort, public API only: closing + reopening restarts the
      //    modal on its home view.
      if (!control) {
        closeModal();
        await sleep(250);
        openModal();
        control = await waitFor(findLoginControl, 3000);
      }
      return control;
    };

    let control = await locate();

    // Email is behind its own reveal control on this screen - click it,
    // then look again for the real input that should now be visible.
    // Re-run the full locate() (not just a re-check) in case revealing email
    // also changed which dialog/view is current.
    if (control?.kind === 'reveal-email') {
      control.el.click();
      const revealed = await waitFor(() => {
        for (const dlg of openDialogs()) {
          const email = findEmailInput(dlg);
          if (email) return { kind: 'focus', el: email };
        }
        return null;
      }, 1500);
      control = revealed || control;
    }

    if (control && control.kind !== 'reveal-email') {
      if (control.risky) {
        // Google/X open a popup window - MyDoge's webview commonly blocks
        // that outright (about:blank#blocked) rather than just failing to
        // authenticate. Still try it (it's all that's on offer at this
        // point), but say so up front instead of leaving a silent dead end.
        console.warn(
          `[mydoge-helper] No email option found, falling back to a social button that may be ` +
          `blocked by this webview's popup blocker. ${describeDialogs()}`
        );
      }
      actOn(control);
      return;
    }

    console.warn(`[mydoge-helper] Email/Google login control not found. ${describeDialogs()}`);
  }, [openModal, closeModal]);

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
      // Contains-match, not exact - v4.0.0's wallet list (HeroUI-based) may
      // render extra badge text ("Recommended"/"Installed"/etc.) inside the
      // same button, which would silently break an exact `=== 'MyDoge'`
      // match and let the click fall through uncaught to the SDK's broken
      // mobile path. Safe to broaden - nothing else would contain "mydoge".
      if (!/mydoge/i.test(label)) return;

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
          {imgFailed ? (
            <div
              aria-hidden
              className="w-16 h-16 mx-auto rounded-2xl bg-white shadow-lg flex items-center justify-center text-3xl"
            >
              🐕
            </div>
          ) : (
            <img
              src="https://web3-assets.tomo.inc/assets/wallets/mydoge/wallet.svg"
              alt="MyDoge"
              onError={() => setImgFailed(true)}
              className="w-16 h-16 mx-auto rounded-2xl bg-white p-1.5 shadow-lg"
            />
          )}
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
