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
export function detectMyDogeWallet() {
  if (typeof window === 'undefined') {
    return { present: false, source: null, provider: null, inMyDoge: false };
  }

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const inMyDoge = /MyDoge|mydoge/i.test(ua);

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
