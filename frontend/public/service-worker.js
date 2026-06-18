/* DogeFood Lab — Service Worker v8 (Web Push enabled)
 * --------------------------------------------------------
 * IMPORTANT: This file deliberately has NO `fetch` handler.
 * A previous version included one that returned `undefined`
 * on failure which crashed the MyDoge in-app WebView. Do NOT
 * add a fetch listener back unless you fully understand the
 * MyDoge constraint (must return new Response(null, {status:504})
 * on any failure path).
 *
 * Responsibilities of this SW (push only):
 *   - install:           skipWaiting so a new SW activates immediately
 *   - activate:          clients.claim so the SW controls open pages right away
 *   - push:              show notification (title, body, icon)
 *   - notificationclick: focus existing tab or open a new one
 *
 * Registered lazily by NotificationContext when the user toggles
 * notifications ON in Settings → this avoids any infinite update
 * loop on page load.
 */

self.addEventListener('install', (event) => {
  // Take over from the previous SW (v5/v6/v7 no-ops) without waiting.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    if (event.data) {
      // Try JSON first; fall back to text.
      try {
        payload = event.data.json();
      } catch (_) {
        payload = { title: 'DogeFood Lab', body: event.data.text() };
      }
    }
  } catch (e) {
    payload = { title: 'DogeFood Lab', body: 'You have a new notification' };
  }

  const title = payload.title || 'DogeFood Lab';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/dogefood-logo.png',
    badge: payload.badge || '/dogefood-logo.png',
    image: payload.image,
    tag: payload.tag || 'dogefood-notif',
    renotify: true,
    requireInteraction: false,
    data: {
      url: payload.url || '/',
      type: payload.type || 'generic',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus an existing tab if available.
        for (const client of clientList) {
          try {
            const url = new URL(client.url);
            if (url.origin === self.location.origin && 'focus' in client) {
              if ('navigate' in client && targetUrl && targetUrl !== '/') {
                client.navigate(targetUrl).catch(() => {});
              }
              return client.focus();
            }
          } catch (_) { /* ignore */ }
        }
        // Otherwise open a new tab.
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return null;
      })
  );
});

// Optional: handle subscription change so the backend gets the new endpoint.
// We just notify any open page; NotificationContext re-subscribes on next mount.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.clients
      .matchAll({ includeUncontrolled: true })
      .then((clients) => {
        clients.forEach((c) => {
          try { c.postMessage({ type: 'PUSH_SUB_CHANGE' }); } catch (_) {}
        });
      })
  );
});
