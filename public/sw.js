/**
 * APARAITECH Service Worker
 * =========================
 * Caches static assets for offline/fast loading.
 * Network-first for pages, cache-first for assets.
 */

const CACHE_NAME = 'aparaitech-v1';
const STATIC_ASSETS = [
  '/',
  '/login',
  '/css/main.css',
  '/js/main.js',
  '/js/app.js',
  '/manifest.json',
  '/images/icon-192.svg',
  '/images/icon-512.svg',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js'
];

// ── INSTALL: cache static assets ─────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { mode: 'no-cors' })));
    }).catch(err => console.warn('[SW] Cache install error:', err))
  );
  self.skipWaiting();
});

// ── ACTIVATE: clean old caches ────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── FETCH: Network first for HTML, cache first for assets ─
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, chrome-extension, and API calls
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // For HTML pages: network first, fallback to cache
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('/login')))
    );
    return;
  }

  // For static assets (CSS, JS, images): cache first, fallback to network
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
