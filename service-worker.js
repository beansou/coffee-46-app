const CACHE_NAME = 'precision-brew-v2';
const APP_SHELL = './index.html';

const LOCAL_ASSETS = [
  './',
  APP_SHELL,
  './manifest.json',
  './my_coffee_logo.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './vendor/react.production.min.js',
  './vendor/react-dom.production.min.js',
  './vendor/babel.min.js',
  './vendor/tailwindcss.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(LOCAL_ASSETS);
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
      self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const isNavigation = event.request.mode === 'navigate';
  if (isNavigation) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          const network = await fetch(event.request);
          cache.put(APP_SHELL, network.clone());
          return network;
        } catch (err) {
          const cached = await cache.match(APP_SHELL);
          return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);
      if (cached) return cached;
      try {
        const network = await fetch(event.request);
        if (network && network.status === 200) {
          cache.put(event.request, network.clone());
        }
        return network;
      } catch (err) {
        return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })()
  );
});
