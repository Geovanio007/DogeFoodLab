/* DogeFood Lab — Service Worker Registration v7 (final)
 * -------------------------------------------------------
 * SW is permanently disabled. This file is a full compatibility
 * shim that exports every function the app imports so the build
 * never fails, regardless of which component imports what.
 *
 * Exported no-ops (all callers compile and run without errors):
 *
 *   register(config)         — index.js
 *   unregister()             — index.js
 *   setUpdateCallback(fn)    — VersionContext.jsx
 *   skipWaiting()            — VersionContext.jsx (applyUpdate)
 *   checkForUpdates()        — VersionContext.jsx (visibilitychange)
 *
 * Version update notifications still work normally:
 * VersionContext polls /version.json every 5 min independently
 * of the SW — that path is completely unaffected by this shim.
 *
 * DO NOT re-enable SW registration without fixing the fetch handler
 * to return `new Response(null, { status: 504 })` on failure —
 * returning undefined crashes the MyDoge WebView.
 */

// ─── Called by VersionContext to hook into SW update events.
// SW is disabled so this callback will never fire via SW.
// VersionContext's /version.json polling still works independently.
export function setUpdateCallback(callback) {
  // no-op — SW disabled, update events will never fire via SW
}

// ─── Called by VersionContext.applyUpdate() before reloading.
// With no active SW there is nothing to skip — reload proceeds normally.
export function skipWaiting() {
  // no-op — no active SW to skip waiting on
}

// ─── Called by VersionContext on tab visibilitychange.
// No SW registered so there is nothing to check for updates.
export function checkForUpdates() {
  // no-op — no active SW to check
}

// ─── Called by index.js on page load. Fully disabled.
export function register(config) {
  // no-op — SW registration is permanently disabled
}

// ─── Called by index.js on page load.
// Still performs real cleanup to evict any old SW lingering
// in users' browsers from before the kill-switch was deployed.
export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then((regs) => {
        regs.forEach((r) => { try { r.unregister(); } catch (e) { /* noop */ } });
      })
      .catch(() => { /* noop */ });
  }
}
