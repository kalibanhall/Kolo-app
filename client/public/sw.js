// KOLO Service Worker - Auto-versioned
// This SW is designed to NEVER serve stale content.
// Version timestamp forces cache invalidation on each deploy.
const SW_VERSION = '2026-02-06-v2';
const CACHE_NAME = `kolo-${SW_VERSION}`;

// Only cache the offline fallback page — everything else is network-first
const PRECACHE_URLS = [
  '/offline.html'
];

// Install: cache only the offline page, then immediately activate
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()) // Don't wait, activate immediately
  );
});

// Activate: delete ALL old caches, then claim all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim()) // Take control of all pages immediately
  );
});

// Fetch: NETWORK-FIRST for everything
// Only falls back to cache when truly offline
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET') return;
  if (!request.url.startsWith(self.location.origin)) return;

  // API requests: network only, never cache API responses in SW
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ success: false, message: 'Vous êtes hors ligne' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // HTML navigation requests: network-first, fallback to offline page
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // Static assets (JS/CSS with hash in filename): network-first with cache fallback
  // Vite adds content hashes to filenames so each build = new URLs = no stale cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache versioned assets (they have hashes in filename)
        if (response.ok && request.url.match(/assets\/.*-[a-f0-9]{8}\./)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nouvelle notification KOLO',
    icon: '/logo-kolo-192.png',
    badge: '/logo-kolo-96.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      { action: 'explore', title: 'Voir' },
      { action: 'close', title: 'Fermer' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('KOLO Tombola', options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'explore' || !event.action) {
    event.waitUntil(clients.openWindow('/'));
  }
});

// Message handler
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  // Force clear all caches (can be called from app code)
  if (event.data && event.data.type === 'CLEAR_ALL_CACHES') {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }
});
