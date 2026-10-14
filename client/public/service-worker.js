const CACHE_NAME = 'chardeevari-v3';
const STATIC_ASSETS = ['/', '/manifest.json', '/logo.webp', '/logo192.png'];

// Install - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - API / non-GET / cross-origin: network only (never intercepted)
// - Page navigations (HTML): NETWORK FIRST, cache fallback when offline.
//   Cache-first here would pin users to a stale shell referencing old hashed
//   bundles after a deploy, 404-ing lazy chunks until a second visit.
// - Hashed static assets: cache first with background refresh.
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  if (
    url.includes('/api/') ||
    event.request.method !== 'GET' ||
    !url.startsWith(self.location.origin)
  ) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached || caches.match('/'))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached); // offline: fall back to whatever we have
      return cached || networkFetch;
    })
  );
});
