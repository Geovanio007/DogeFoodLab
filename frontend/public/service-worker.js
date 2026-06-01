/* DogeFood Lab — Service Worker KILL SWITCH v4
 * --------------------------------------------------
 * Activates immediately, wipes all caches, unregisters itself.
 * NO reload — clients will be SW-free on their next natural navigation.
 * NO fetch handler — every request goes directly to the network.
 */
self.addEventListener('install', () => {
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

    // ✅ Step 4 (c.navigate / force-reload) deliberately removed.
    // Reloading caused an infinite loop: the browser re-fetches the SW file,
    // re-registers it, which activates again, which reloads again, forever.
    // Claiming + unregistering is sufficient — clients are already SW-free
    // and will remain so on all subsequent navigations.
  })());
});

/* NO fetch handler — every request goes directly to the network via the
   browser's default handling. This guarantees no ERR_FAILED from SW logic. */
