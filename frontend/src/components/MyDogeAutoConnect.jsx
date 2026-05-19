import { useEffect, useRef } from 'react';
import { useAccount, useConnect } from 'wagmi';
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
const MyDogeAutoConnect = () => {
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current || isConnected) return;

    const { present, provider } = detectMyDogeWallet();
    if (!present || !provider) return;

    attempted.current = true;

    (async () => {
      try {
        // 1. Passive read first — if MyDoge already approved this origin,
        //    no prompt is shown and we just wire up wagmi.
        let accounts = [];
        try {
          accounts = await provider.request({ method: 'eth_accounts' });
        } catch (e) {
          console.warn('[MyDogeAutoConnect] eth_accounts threw:', e?.message || e);
          accounts = [];
        }

        // 2. If nothing approved yet, eagerly request — this is what
        //    triggers MyDoge's native "wants to connect" sheet.
        if (!Array.isArray(accounts) || accounts.length === 0) {
          try {
            accounts = await provider.request({ method: 'eth_requestAccounts' });
          } catch (e) {
            // User rejected, or MyDoge isn't ready yet — non-fatal.
            console.warn('[MyDogeAutoConnect] eth_requestAccounts rejected:', e?.message || e);
            return;
          }
        }

        if (!Array.isArray(accounts) || accounts.length === 0) {
          console.warn('[MyDogeAutoConnect] no accounts after prompt');
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
  }, [isConnected, connect, connectors]);

  return null;
};

export default MyDogeAutoConnect;
