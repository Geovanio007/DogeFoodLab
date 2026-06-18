/* DogeFood Lab — Service Worker Registration v8
 * ------------------------------------------------
 * SW is now REGISTERED LAZILY by NotificationContext when the
 * user toggles notifications ON in Settings. We no longer
 * register on page load (that previously caused an update loop
 * with the buggy v3 fetch handler).
 *
 * The new SW (`/service-worker.js` v8) has NO fetch handler,
 * so registering it is safe for the MyDoge in-app WebView.
 *
 * Functions exported here are intentionally minimal — they just
 * wrap the browser API so callers don't need to know about it.
 *
 * Other exports (setUpdateCallback, skipWaiting, checkForUpdates)
 * remain no-ops because VersionContext polls /version.json
 * independently of the SW.
 */

const SW_URL = '/service-worker.js';

export async function registerPushServiceWorker() {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;
  if (!('PushManager' in window)) return null;

  try {
    // If a SW is already controlling the page, reuse it.
    const existing = await navigator.serviceWorker.getRegistration(SW_URL);
    if (existing && existing.active) return existing;

    const reg = await navigator.serviceWorker.register(SW_URL, { scope: '/' });
    // Wait for the SW to be ready before returning so PushManager works.
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.warn('[SW] register failed:', err);
    return null;
  }
}

export async function unregisterPushServiceWorker() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
  } catch (_) { /* noop */ }
}

// ─── Legacy compatibility shims (kept so existing imports compile) ────────────

export function setUpdateCallback(_callback) {
  // no-op — VersionContext handles updates via /version.json polling
}

export function skipWaiting() {
  // no-op — VersionContext.applyUpdate() just reloads the page
}

export function checkForUpdates() {
  // no-op
}

export function register(_config) {
  // no-op on page load — registration is now triggered by NotificationContext
  // when the user enables notifications. Keeping this export prevents
  // build failures in any file that still imports it.
}

export function unregister() {
  // Kept for backwards compatibility; equivalent to unregisterPushServiceWorker.
  unregisterPushServiceWorker();
}
