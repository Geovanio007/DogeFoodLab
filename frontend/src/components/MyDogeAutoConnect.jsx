import { useEffect, useRef } from 'react';
import { useAccount, useConnect } from 'wagmi';

/**
 * MyDogeAutoConnect
 *
 * The game is native on the MyDoge wallet — when a visitor opens the app
 * inside the MyDoge in-app browser (iOS / Android) or has the MyDoge
 * Chrome extension installed on desktop, MyDoge injects a provider on
 * `window.mydoge.ethereum` (and usually mirrors it on `window.ethereum`).
 *
 * This component auto-detects that provider on mount and triggers a
 * silent wagmi connection so the user lands in the menu already
 * connected, without any modal popup.
 *
 * It does nothing in environments where MyDoge isn't present (graceful
 * fallback to manual connect via the "Connect Wallet" CTA).
 *
 * Idempotent: runs at most once per page load, no-ops after first
 * successful connect.
 */

function detectMyDogeProvider() {
  if (typeof window === 'undefined') return null;
  // Direct namespace injected by MyDoge mobile / extension.
  if (window.mydoge?.ethereum) return window.mydoge.ethereum;
  // Some installs only mirror onto window.ethereum and tag the provider.
  const eth = window.ethereum;
  if (!eth) return null;
  if (eth.isMyDoge) return eth;
  if (Array.isArray(eth.providers)) {
    const md = eth.providers.find((p) => p && p.isMyDoge);
    if (md) return md;
  }
  return null;
}

function detectMyDogeWebview() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /MyDoge|mydoge/i.test(ua);
}

const MyDogeAutoConnect = () => {
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    if (isConnected) return;

    const provider = detectMyDogeProvider();
    const inWebview = detectMyDogeWebview();
    if (!provider && !inWebview) return;

    attempted.current = true;

    // Prefer the injected wagmi connector (which uses window.ethereum).
    const injectedConn =
      connectors.find((c) => c.id === 'injected') || connectors[0];
    if (!injectedConn) return;

    // First, ask MyDoge to expose accounts so wagmi's injected connector
    // picks them up. Some webviews require an explicit `eth_requestAccounts`
    // before any auto-connect attempt succeeds.
    (async () => {
      try {
        if (provider?.request) {
          await provider.request({ method: 'eth_requestAccounts' });
        }
      } catch (e) {
        // User rejected or provider unavailable — fall through to manual.
        console.warn('[MyDogeAutoConnect] eth_requestAccounts failed:', e?.message || e);
        return;
      }
      try {
        connect({ connector: injectedConn });
        console.info('[MyDogeAutoConnect] connect() dispatched on injected connector');
      } catch (e) {
        console.warn('[MyDogeAutoConnect] connect() threw:', e?.message || e);
      }
    })();
  }, [isConnected, connect, connectors]);

  return null;
};

export default MyDogeAutoConnect;
