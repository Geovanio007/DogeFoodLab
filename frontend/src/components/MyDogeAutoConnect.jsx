import { useEffect, useRef } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { useWalletConnect } from '@dogeos/dogeos-sdk';
import { detectMyDogeWallet } from '../lib/detectMyDoge';

/**
 * MyDogeAutoConnect
 *
 * When the app is opened inside the MyDoge in-app browser, we want the
 * SAME UX as other MyDoge-native dApps (Moar.finance, etc.): the wallet's
 * own native "wants to connect to your wallet" sheet should appear on
 * landing without any extra in-app banner.
 *
 * To trigger that sheet, we fire `eth_requestAccounts` on the injected
 * provider as soon as MyDoge is detected. The native sheet handles consent,
 * then we wire the approved address into wagmi via `connect({ injected })`.
 *
 * v4 note: the DogeOS SDK's own WalletConnectProvider probes available
 * wallet connectors (including the injected provider) as soon as it mounts
 * — see "Connectors" in the SDK config docs ("the provider loads wallet
 * choices automatically... handle a rejected request"). That probe and our
 * own eager `eth_requestAccounts` call both reach for the SAME injected
 * MyDoge provider, and most injected wallets reject a second concurrent
 * request outright. We now also gate on the SDK's own `isConnecting` (from
 * useWalletConnect()) and wait a short grace period on mount, so we only
 * fire once the SDK's own mount-time probing has had a chance to settle.
 *
 * Defensive wrapping notes:
 *   - We check `eth_accounts` first; if MyDoge already approved this
 *     dApp, that returns the address immediately and we skip the prompt.
 *   - Every async call is individually try/catch-wrapped so a rejected
 *     prompt, a malformed provider, or a transient network error can't
 *     bubble to the React render tree and crash the page on real devices.
 *   - The whole effect is guarded by an `attempted` ref so it runs at
 *     most once per page load.
 *
 * If the user rejects the prompt, `MyDogeConnectBanner` will remain
 * visible as a fallback CTA they can tap to retry.
 */
const SDK_SETTLE_GRACE_MS = 400;
const RETRY_BACKOFF_MS = 1500; // give the SDK's own attempt time to fully
                                // resolve (not just start) before we retry
const MAX_ATTEMPTS = 2;

// e?.message alone was logging as "Unknown" for every failure so far -
// message itself may genuinely just say "Unknown" (a generic bridge/RPC
// error from MyDoge's own webview layer), but there may be more useful
// detail in .code / .data / other enumerable fields that .message alone
// doesn't surface. Dump everything we can get.
function describeProviderError(e) {
  if (e == null) return 'null/undefined';
  if (typeof e === 'string') return e;
  const parts = [];
  if (e.code !== undefined) parts.push(`code=${e.code}`);
  if (e.message) parts.push(`message=${e.message}`);
  if (e.name && e.name !== 'Error') parts.push(`name=${e.name}`);
  if (e.data !== undefined) {
    try { parts.push(`data=${JSON.stringify(e.data)}`); } catch { /* ignore */ }
  }
  if (!parts.length) {
    try {
      const own = Object.getOwnPropertyNames(e).filter((k) => k !== 'stack');
      parts.push(`keys=${JSON.stringify(own)} raw=${JSON.stringify(e, own)}`);
    } catch {
      parts.push(String(e));
    }
  }
  return parts.join(' ') || String(e);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MyDogeAutoConnect = () => {
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { isConnecting: sdkIsConnecting, isConnected: sdkIsConnected } = useWalletConnect();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current || isConnected || sdkIsConnected || sdkIsConnecting) return;

    const { present, provider } = detectMyDogeWallet();
    if (!present || !provider) return;

    attempted.current = true;

    // One attempt: passive read, then active request if nothing was
    // already approved. Returns accounts[] on success, null on failure.
    const tryOnce = async (label) => {
      let accounts = [];
      try {
        accounts = await provider.request({ method: 'eth_accounts' });
      } catch (e) {
        console.warn(`[MyDogeAutoConnect] (${label}) eth_accounts threw:`, describeProviderError(e));
        accounts = [];
      }
      if (Array.isArray(accounts) && accounts.length > 0) return accounts;

      try {
        accounts = await provider.request({ method: 'eth_requestAccounts' });
      } catch (e) {
        console.warn(`[MyDogeAutoConnect] (${label}) eth_requestAccounts rejected:`, describeProviderError(e));
        return null;
      }
      return Array.isArray(accounts) && accounts.length > 0 ? accounts : null;
    };

    (async () => {
      try {
        // Give the SDK's own mount-time connector probing (see comment
        // above) a short head start so we don't fire a second concurrent
        // eth_requestAccounts at the same injected provider.
        await sleep(SDK_SETTLE_GRACE_MS);

        let accounts = null;
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          if (sdkIsConnected) return; // SDK's own attempt won the race - done
          accounts = await tryOnce(`attempt ${attempt}`);
          if (accounts) break;
          if (attempt < MAX_ATTEMPTS) {
            // Failed - if the SDK's own concurrent attempt caused this,
            // give it a real chance to fully finish (not just start)
            // before trying again on a now-uncontested provider.
            await sleep(RETRY_BACKOFF_MS);
          }
        }

        if (!accounts) {
          console.warn(`[MyDogeAutoConnect] no accounts after ${MAX_ATTEMPTS} attempts`);
          return;
        }

        // 3. Wire address into wagmi via the injected connector so
        //    `useAccount()` everywhere else in the app picks it up.
        const injectedConn =
          connectors.find((c) => c.id === 'injected') || connectors[0];
        if (!injectedConn) {
          console.warn('[MyDogeAutoConnect] no injected connector configured');
          return;
        }
        try {
          connect({ connector: injectedConn });
          console.info('[MyDogeAutoConnect] connect() dispatched for', accounts[0]);
        } catch (e) {
          console.warn('[MyDogeAutoConnect] connect() threw:', e?.message || e);
        }
      } catch (outer) {
        // Last-line of defense — should never reach here but if it does
        // we still don't want to crash the React tree.
        console.warn('[MyDogeAutoConnect] outer error swallowed:', outer?.message || outer);
      }
    })();
  }, [isConnected, connect, connectors, sdkIsConnecting, sdkIsConnected]);

  return null;
};

export default MyDogeAutoConnect;
