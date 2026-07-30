/**
 * Detect whether the page is currently rendered inside an in-app
 * webview that exposes a wallet provider — primarily the MyDoge mobile
 * webview, but the same checks catch any extension/in-app browser that
 * injects an EIP-1193 provider.
 *
 * We deliberately avoid touching `provider.request(...)` here because
 * the actual `eth_requestAccounts` call needs to happen inside a user
 * gesture — most webviews (and Safari WKWebView) throw or hang if it's
 * called from a non-user-initiated context.
 */

// --- EIP-6963 support ---------------------------------------------------
// Multi-wallet discovery standard: wallets announce themselves via a DOM
// event instead of racing to set window.ethereum/window.mydoge directly.
// None of the checks below originally covered this, so a wallet that has
// moved to announcement-only injection (plausible for a platform rewrite
// built on shared infrastructure, where colliding on window.ethereum with
// other installed wallets becomes a real problem) would fall through as
// "not present" even though it's actually there.
//
// The listener is registered once at module load (this file is imported
// well before any connect attempt), and we also proactively dispatch
// eip6963:requestProvider to ask already-injected wallets to (re-)announce,
// since announcement timing isn't guaranteed relative to listener setup.
const eip6963Providers = new Map();

if (typeof window !== 'undefined') {
  window.addEventListener('eip6963:announceProvider', (event) => {
    const info = event?.detail?.info;
    const provider = event?.detail?.provider;
    if (info && provider) {
      eip6963Providers.set(info.uuid, { info, provider });
    }
  });
  window.dispatchEvent(new Event('eip6963:requestProvider'));
}

function findMyDogeViaEip6963() {
  for (const { info, provider } of eip6963Providers.values()) {
    const name = (info?.name || '').toLowerCase();
    const rdns = (info?.rdns || '').toLowerCase();
    if (name.includes('mydoge') || rdns.includes('mydoge')) {
      return provider;
    }
  }
  return null;
}

export function detectMyDogeWallet() {
  if (typeof window === 'undefined') {
    return { present: false, source: null, provider: null, inMyDoge: false };
  }

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const inMyDoge = /MyDoge|mydoge/i.test(ua);

  const eip6963Provider = findMyDogeViaEip6963();
  if (eip6963Provider) {
    return { present: true, source: 'eip6963', provider: eip6963Provider, inMyDoge: true };
  }

  if (window.mydoge?.ethereum) {
    return { present: true, source: 'window.mydoge', provider: window.mydoge.ethereum, inMyDoge: true };
  }

  const eth = window.ethereum;
  if (eth?.isMyDoge) {
    return { present: true, source: 'window.ethereum.isMyDoge', provider: eth, inMyDoge: true };
  }
  if (Array.isArray(eth?.providers)) {
    const md = eth.providers.find((p) => p && p.isMyDoge);
    if (md) return { present: true, source: 'providers[].isMyDoge', provider: md, inMyDoge: true };
  }
  if (inMyDoge && eth) {
    // UA says MyDoge browser, provider exists but isn't tagged — treat as MyDoge.
    return { present: true, source: 'ua+ethereum', provider: eth, inMyDoge: true };
  }
  if (inMyDoge) {
    // UA only — provider not yet injected (still bootstrapping).
    return { present: false, source: 'ua-only', provider: null, inMyDoge: true };
  }

  // Any other injected provider (Coinbase / MetaMask mobile / etc.) — we
  // don't auto-trigger for these; the SDK's modal handles them.
  return { present: false, source: null, provider: null, inMyDoge: false };
}
