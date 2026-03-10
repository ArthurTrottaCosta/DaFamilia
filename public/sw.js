const CACHE_NAME = 'dafamilia-v2';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/logo192.png', '/favicon.ico'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;
  event.respondWith(
    fetch(event.request)
      .then(r => { if (r && r.status === 200) { const c = r.clone(); caches.open(CACHE_NAME).then(ca => ca.put(event.request, c)); } return r; })
      .catch(() => caches.match(event.request).then(c => c || caches.match('/index.html')))
  );
});

// ── Push notification handler ─────────────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  const { title, body, icon, badge, tag, url } = data;
  const options = {
    body: body || '',
    icon: icon || '/logo192.png',
    badge: badge || '/logo192.png',
    tag: tag || 'dafamilia',
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click → open app ─────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
