/* global self, caches, fetch, URL */

const CACHE_NAME = 'vive-utrera-shell-v4';
const APP_SHELL = [
  '/',
  '/preview/',
  '/manifest.webmanifest',
  '/brand/pwa-icon-192.png?v=20261023',
  '/brand/pwa-icon-512.png?v=20261023',
  '/brand/pwa-icon-180.png',
  '/brand/logo-cascos.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('vive-utrera-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 404) return caches.match('/preview/').then((cached) => cached || response);
          return response;
        })
        .catch(() => caches.match('/preview/'))
    );
    return;
  }

  // Revalidate install metadata; cache-first would keep an old manifest indefinitely.
  if (url.pathname === '/manifest.webmanifest') {
    event.respondWith(
      fetch(request).then(async (response) => {
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      }).catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (!response || response.status !== 200) return response;
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      return response;
    }))
  );
});
