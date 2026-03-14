const CACHE_NAME = 'dafamilia-v3';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/logo192.png', '/favicon.ico'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS)).catch(() => {}));
  self.skipWaiting(); // Force immediate activation
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim()) // Take control immediately
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;
  event.respondWith(
    fetch(event.request)
      .then(r => {
        if (r && r.status === 200) {
          const c = r.clone();
          caches.open(CACHE_NAME).then(ca => ca.put(event.request, c));
        }
        return r;
      })
      .catch(() => caches.match(event.request).then(c => c || caches.match('/index.html')))
  );
});

// ── Push notification handler ─────────────────────────────────────────────────
self.addEventListener('push', event => {
  console.log('[SW] Push received');

  let title = 'DaFamília';
  let options = {
    body: 'Nova notificação',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: 'dafamilia',
  };

  try {
    if (event.data) {
      const data = event.data.json();
      title = data.title || title;
      options = {
        body: data.body || '',
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: data.tag || 'dafamilia',
        data: { url: data.url || '/' },
      };
    }
  } catch (e) {
    console.error('[SW] Push parse error:', e);
    // Try as text
    try {
      const text = event.data ? event.data.text() : '';
      options.body = text;
    } catch (_) {}
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => console.log('[SW] Notification shown'))
      .catch(e => console.error('[SW] showNotification error:', e))
  );
});

// ── Notification click ────────────────────────────────────────────────────────
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
