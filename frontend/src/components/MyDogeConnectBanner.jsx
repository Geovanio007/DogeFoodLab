import React, { useEffect, useState } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { detectMyDogeWallet } from '../lib/detectMyDoge';

/**
 * MyDogeConnectBanner
 *
 * Top-of-screen banner that surfaces a prominent "Connect MyDoge Wallet"
 * CTA whenever the app is opened inside the MyDoge in-app browser (or
 * any context that exposes a MyDoge-flagged EIP-1193 provider).
 *
 * Why this exists:
 *   The DogeOS SDK's modal works well for picking *which* wallet to
 *   connect, but inside the MyDoge webview there's exactly one obvious
 *   answer — the user's already-installed MyDoge wallet. Showing the
 *   modal there is friction; a single-tap banner matches the UX of
 *   other dApps designed for MyDoge mobile.
 *
 *   Crucially, the actual `eth_requestAccounts` call here happens
 *   inside a user-gesture (button click), which is what MyDoge's
 *   webview requires. The previous silent-on-mount auto-connect was
 *   what crashed the app on real devices.
 *
 * Render rules:
 *   - hidden when not in MyDoge webview
 *   - hidden once `isConnected === true`
 *   - hidden after user explicitly dismisses (with a "Not now" link)
 */
const STORAGE_KEY = 'dogefood_mydoge_banner_dismissed';

const MyDogeConnectBanner = () => {
  const { isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isConnected) { setVisible(false); return; }
    try {
      if (window.localStorage?.getItem(STORAGE_KEY) === '1') return;
    } catch (_) { /* ignore */ }
    const { inMyDoge } = detectMyDogeWallet();
    if (!inMyDoge) return;
    // Wait longer than the auto-connect's expected resolution time so
    // we don't double-prompt — the banner is purely a fallback for when
    // the user rejected MyDoge's native sheet or the auto-trigger
    // didn't fire (e.g. provider injected late).
    const t = setTimeout(() => setVisible(true), 1800);
    return () => clearTimeout(t);
  }, [isConnected]);

  const handleConnect = async () => {
    setError('');
    const { provider } = detectMyDogeWallet();
    if (!provider) {
      setError('MyDoge provider not found. Please reopen this page in the MyDoge app.');
      return;
    }
    try {
      // User gesture — safe to prompt for accounts here.
      await provider.request({ method: 'eth_requestAccounts' });
    } catch (e) {
      const msg = (e && e.message) || 'Connection request was rejected.';
      setError(msg);
      return;
    }
    const injectedConn =
      connectors.find((c) => c.id === 'injected') || connectors[0];
    if (!injectedConn) {
      setError('Wallet connector unavailable.');
      return;
    }
    try {
      connect({ connector: injectedConn });
    } catch (e) {
      setError((e && e.message) || 'Failed to wire wallet into the app.');
    }
  };

  const dismiss = () => {
    try { window.localStorage?.setItem(STORAGE_KEY, '1'); } catch (_) { /* ignore */ }
    setVisible(false);
  };

  if (!visible || isConnected) return null;

  return (
    <div
      data-testid="mydoge-connect-banner"
      className="fixed top-0 inset-x-0 z-[9999] flex justify-center px-3 pt-3 pointer-events-none"
    >
      <div className="pointer-events-auto w-full max-w-md rounded-2xl overflow-hidden border-2 border-yellow-300/80 bg-gradient-to-br from-blue-700/95 via-indigo-800/95 to-purple-900/95 shadow-[0_20px_60px_-10px_rgba(56,189,248,0.55)] animate-banner-in">
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-3 p-3 sm:p-4">
          <img
            src="https://web3-assets.tomo.inc/assets/wallets/mydoge/wallet.svg"
            alt="MyDoge"
            className="w-12 h-12 shrink-0 rounded-xl bg-white p-1 shadow-md"
          />
          <div className="flex-1 min-w-0">
            <h4
              className="text-white font-bold text-sm sm:text-base leading-tight"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Connect your MyDoge wallet
            </h4>
            <p className="text-white/80 text-[11px] sm:text-xs leading-snug mt-0.5">
              One tap signs you in and unlocks $LAB rewards.
            </p>
            {error ? (
              <p className="text-red-300 text-[11px] mt-1 break-words">{error}</p>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-1">
            <button
              data-testid="mydoge-banner-connect-btn"
              onClick={handleConnect}
              disabled={isPending}
              className="px-3 py-1.5 rounded-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 text-blue-900 text-xs font-bold shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 whitespace-nowrap"
            >
              {isPending ? 'Connecting…' : 'Connect'}
            </button>
            <button
              data-testid="mydoge-banner-dismiss-btn"
              onClick={dismiss}
              className="text-white/60 hover:text-white/80 text-[10px] font-medium underline-offset-2 hover:underline"
            >
              Not now
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bannerIn {
          0%   { transform: translateY(-22px) scale(.96); opacity: 0; }
          70%  { transform: translateY(2px)   scale(1.01); opacity: 1; }
          100% { transform: translateY(0)     scale(1);    opacity: 1; }
        }
        .animate-banner-in { animation: bannerIn .42s cubic-bezier(.2,.9,.3,1.15) both; }
        @media (prefers-reduced-motion: reduce) { .animate-banner-in { animation: none; } }
      `}</style>
    </div>
  );
};

export default MyDogeConnectBanner;
