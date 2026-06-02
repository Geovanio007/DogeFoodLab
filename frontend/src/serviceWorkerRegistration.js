/* DogeFood Lab — Service Worker Registration v5
 * -----------------------------------------------
 * SW is permanently disabled. This file intentionally does nothing.
 *
 * DO NOT re-enable registration here without also updating
 * service-worker.js to handle fetch failures gracefully
 * (return `new Response(null, { status: 504 })`, never undefined).
 *
 * The MyDoge wallet WebView is particularly sensitive to SW fetch
 * interception errors — any undefined return causes net::ERR_FAILED
 * and breaks the entire app.
 */

export function register() {
  // Intentionally empty — SW registration is disabled.
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => registration.unregister())
      .catch(() => { /* noop */ });
  }
}
