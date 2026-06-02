/* DogeFood Lab — Service Worker Registration v6
 * -----------------------------------------------
 * SW is permanently disabled. This file is a compatibility shim —
 * all exported functions are no-ops so existing import sites
 * (WhatsNewToast, App.js, etc.) continue to compile without changes.
 *
 * DO NOT re-enable registration. The MyDoge wallet WebView is
 * extremely sensitive to SW fetch interception errors — any broken
 * SW causes net::ERR_FAILED and reloads the entire app.
 *
 * Exports preserved for backward compatibility:
 *   register()           — was: register SW. Now: no-op.
 *   unregister()         — was: unregister SW. Now: cleans up any lingering SW.
 *   setUpdateCallback()  — was: set callback for SW update events. Now: no-op.
 */

// Called by WhatsNewToast / App to hook into SW update events.
// SW is disabled so updates never fire — callback is silently ignored.
export function setUpdateCallback(callback) {
  // no-op — SW is disabled, updates will never fire
}

// Called by index.js on page load.
// No-op: registration is fully disabled.
export function register(config) {
  // no-op
}

// Called by index.js on page load.
// Still performs cleanup in case an old SW is lingering in the browser.
export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => registration.unregister())
      .catch(() => { /* noop */ });
  }
}
