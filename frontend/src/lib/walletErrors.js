/**
 * Global error swallow for non-fatal wallet-connection errors thrown by
 * the DogeOS SDK (and other 3rd-party wallet libs) on mobile browsers.
 *
 * Problem: on iOS Safari / Android Chrome / Telegram WebView, the SDK
 * throws synchronous errors like:
 *   "MyDoge not supported"
 *   "<Wallet> not supported"
 *   "User rejected the request"
 *   "Connector not found"
 * from inside `connectMobile()` when the user taps a wallet that has no
 * mobile deep-link or no injected provider. These errors propagate as
 * `window.onerror` / `unhandledrejection` and, on some mobile webviews,
 * trigger a hard page reload or blank screen ("the app crashes").
 *
 * This module installs `error` and `unhandledrejection` listeners that
 * detect those specific recoverable errors and prevent their default
 * behaviour, so the app keeps running and the user can pick a different
 * wallet without a refresh.
 *
 * Idempotent: only installed once per page.
 */

const SWALLOW_PATTERNS = [
  /not supported/i,
  /user rejected/i,
  /user denied/i,
  /connector not found/i,
  /connection failed/i,
  /failed to connect/i,
  /no provider/i,
  /window\.ethereum/i,
];

function shouldSwallow(message) {
  if (!message) return false;
  const msg = typeof message === 'string' ? message : String(message);
  return SWALLOW_PATTERNS.some((re) => re.test(msg));
}

let installed = false;

export function installWalletErrorSwallow() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const onError = (event) => {
    const msg = event?.error?.message || event?.message;
    if (shouldSwallow(msg)) {
      console.warn('[wallet-errors] swallowed window.error:', msg);
      event.preventDefault?.();
      event.stopImmediatePropagation?.();
      return true;
    }
    return false;
  };

  const onRejection = (event) => {
    const msg = event?.reason?.message || event?.reason;
    if (shouldSwallow(msg)) {
      console.warn('[wallet-errors] swallowed unhandledrejection:', msg);
      event.preventDefault?.();
      event.stopImmediatePropagation?.();
      return true;
    }
    return false;
  };

  window.addEventListener('error', onError, true);
  window.addEventListener('unhandledrejection', onRejection, true);
}
