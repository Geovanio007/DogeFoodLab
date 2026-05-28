/* DogeFood Lab — Service Worker KILL SWITCH v3
 * --------------------------------------------------
 * Previous versions intercepted fetches and could return undefined when both
 * network AND cache failed → browser shows net::ERR_FAILED (MyDoge wallet
 * webview is particularly susceptible). This SW:
 *   1. Activates immediately (no waiting page)
 *   2. Claims all open clients so it controls them right now
 *   3. Deletes every cache
 *   4. Unregisters itself
 *   5. Reloads any open tabs so they fetch fresh through the network
 *   6. Has NO fetch handler → impossible to return undefined / break requests
 *
 * Future updates that need offline support should re-introduce a SW that
 * returns `new Response(null, { status: 504 })` (never undefined) on any
 * fetch failure.
 */

self.addEventListener('install', (event) => {
  // Activate the new SW immediately, replacing the broken predecessor
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // 1. Claim every open client so this SW takes over right now
    try { await self.clients.claim(); } catch (e) { /* noop */ }

    // 2. Wipe every cache
    try {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    } catch (e) { /* noop */ }

    // 3. Unregister so the next page load has no SW at all
    try { await self.registration.unregister(); } catch (e) { /* noop */ }

    // 4. Force-reload every controlled tab so it fetches the page natively
    try {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      wins.forEach((c) => { try { c.navigate(c.url); } catch (e) { /* noop */ } });
    } catch (e) { /* noop */ }
  })());
});

/* NO fetch handler — every request goes directly to the network via the
   browser's default handling. This guarantees no ERR_FAILED from SW logic. */
