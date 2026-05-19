import { useEffect, useRef } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { detectMyDogeWallet } from '../lib/detectMyDoge';

/**
 * MyDogeAutoConnect
 *
 * Silent reconnect ONLY when the user has previously approved this dApp.
 *
 * We do NOT call `eth_requestAccounts` on mount — that requires a user
 * gesture in most mobile webviews (including MyDoge / WKWebView), and
 * invoking it from a useEffect can crash or hang the page. Instead we
 * call `eth_accounts` (a passive read) — if it returns a non-empty list,
 * the wallet has already approved this origin and it's safe to fire
 * wagmi's `connect()` to wire the address into the app state.
 *
 * Returning-user UX: lands on menu already connected, no popup.
 * First-time UX: this component is a no-op; the `MyDogeConnectBanner`
 * on the welcome screen prompts an explicit tap.
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
      let accounts = [];
      try {
        // Passive read — does NOT prompt the user.
        accounts = await provider.request({ method: 'eth_accounts' });
      } catch (e) {
        console.warn('[MyDogeAutoConnect] eth_accounts failed:', e?.message || e);
        return;
      }
      if (!Array.isArray(accounts) || accounts.length === 0) {
        // No previously-approved session — the banner will handle the
        // first-time consent flow.
        return;
      }
      const injectedConn =
        connectors.find((c) => c.id === 'injected') || connectors[0];
      if (!injectedConn) return;
      try {
        connect({ connector: injectedConn });
        console.info('[MyDogeAutoConnect] silent reconnect dispatched');
      } catch (e) {
        console.warn('[MyDogeAutoConnect] connect() threw:', e?.message || e);
      }
    })();
  }, [isConnected, connect, connectors]);

  return null;
};

export default MyDogeAutoConnect;
