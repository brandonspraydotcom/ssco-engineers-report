// sw.js
const VERSION = 'v1.0.0'; // bump on each deploy
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './bottle2.png',
  './img-worker.js',
  // add any css/js you reference by path
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open('ssc-shell-' + VERSION).then(c => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => !n.endsWith(VERSION)).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

// SWR for images, network-first for navigations, cache-first for shell
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // HTML navigations: network first, fallback to cache
  if (request.mode === 'navigate') {
    e.respondWith((async () => {
      try { return await fetch(request); }
      catch { return (await caches.match('./index.html')) || Response.error(); }
    })());
    return;
  }

  // images: stale-while-revalidate
  if (request.destination === 'image') {
    e.respondWith((async () => {
      const cache = await caches.open('ssc-img-' + VERSION);
      const cached = await cache.match(request);
      const prom = fetch(request).then(r => { cache.put(request, r.clone()); return r; }).catch(() => null);
      return cached || prom || fetch(request);
    })());
    return;
  }

  // everything in shell: cache-first
  e.respondWith(caches.match(request).then(r => r || fetch(request)));
});

// update flow
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
