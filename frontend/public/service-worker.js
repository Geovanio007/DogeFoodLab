/* eslint-disable no-restricted-globals */
/*
 * SELF-DESTRUCT SERVICE WORKER
 * ----------------------------
 * Previous SW versions intercepted fetches and could return undefined on
 * failure, producing net::ERR_FAILED in webviews (notably MyDoge wallet).
 * This SW does the opposite: it wipes all caches and unregisters itself,
 * so any user who still has the old SW installed will lose it on next visit.
 *
 * The frontend no longer registers any SW (see src/index.js).
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    } catch (e) {
      // swallow — best-effort cleanup
    }
    try {
      await self.registration.unregister();
    } catch (e) {
      // swallow
    }
    try {
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => {
        // hard reload each open tab so the page is fetched without SW interception
        try { client.navigate(client.url); } catch (e) { /* noop */ }
      });
    } catch (e) {
      // swallow
    }
  })());
});

/*
 * Fetch handler intentionally OMITTED. With no fetch handler, the browser
 * handles every request natively (no SW interception, no possibility of
 * returning undefined → net::ERR_FAILED).
 */
