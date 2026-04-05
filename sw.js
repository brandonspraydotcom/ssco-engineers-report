// sw.js
const VERSION = 'v1.0.3';

const SHELL_CACHE = `ssc-shell-${VERSION}`;
const IMG_CACHE = `ssc-img-${VERSION}`;
const AUDIO_CACHE = `ssc-audio-${VERSION}`;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './bottle2.png',
  './Bottle2.png',
  './Bottle.png',
  './Maintenance.jpg',
  './icon-192.png',
  './icon-512.png',
  './img-worker.js',
  './water-splash-46402.mp3'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => ![SHELL_CACHE, IMG_CACHE, AUDIO_CACHE].includes(k))
          .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

async function networkFirst(request, fallbackUrl = null, cacheName = null) {
  try {
    const response = await fetch(request);
    if (cacheName && response && response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl);
      if (fallback) return fallback;
    }
    throw err;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  return fetch(request);
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then(response => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || fetchPromise || fetch(request);
}

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // Dev safety: don't aggressively cache localhost traffic
  if (['localhost', '127.0.0.1'].includes(self.location.hostname)) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  // HTML/document navigations
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, './index.html', SHELL_CACHE));
    return;
  }

  // Same-origin scripts/styles/worker/manifest should prefer fresh network
  if (
    url.origin === self.location.origin &&
    (
      request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'worker' ||
      request.destination === 'manifest'
    )
  ) {
    event.respondWith(networkFirst(request, null, SHELL_CACHE));
    return;
  }

  // Images
  if (request.destination === 'image') {
    event.respondWith(staleWhileRevalidate(request, IMG_CACHE));
    return;
  }

  // Audio
  if (request.destination === 'audio') {
    event.respondWith(staleWhileRevalidate(request, AUDIO_CACHE));
    return;
  }

  // Shell files
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request));
    return;
  }
});

self.addEventListener('message', event => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CLEAR_CACHES') {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    })());
  }
});