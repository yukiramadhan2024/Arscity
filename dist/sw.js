// Arscity Offline Service Worker (MIT License)
const CACHE_NAME = 'arscity-v3.0.0';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/fonts/Inter-VariableFont_opsz,wght.woff2',
  './assets/fonts/Inter-Italic-VariableFont_opsz,wght.woff2',
  './assets/textures/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Gagal precache beberapa aset awal:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[ServiceWorker] Membersihkan cache usang:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Hanya layani request GET
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  // Bypass caching on local development server
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          // Fallback jika offline dan request adalah dokumen HTML
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./index.html') || caches.match('./');
          }
        });
    })
  );
});
