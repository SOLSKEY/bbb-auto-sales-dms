/**
 * Service Worker for BBB Auto Sales DMS
 *
 * Provides:
 * - Update detection and notification to clients
 * - Network-first strategy for HTML (always fresh index.html)
 * - Cache-first strategy for hashed assets (immutable)
 */

const CACHE_NAME = 'bbb-dms-v1';

// Install event - skip waiting to activate immediately when updated
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean old caches and take control
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
        );
      })
      .then(() => {
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - network-first for HTML, cache-first for hashed assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  // Skip API and Supabase requests
  if (url.pathname.includes('/api/') || url.hostname.includes('supabase')) {
    return;
  }

  // Network-first for HTML (always get fresh index.html)
  if (request.destination === 'document' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() => caches.match(request))
    );
    return;
  }

  // For hashed assets, use cache-first (they're immutable due to content hash)
  if (url.pathname.startsWith('/assets/') && url.pathname.match(/-[a-zA-Z0-9]{8}\.(js|css)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }
});

// Listen for skipWaiting message from client
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
