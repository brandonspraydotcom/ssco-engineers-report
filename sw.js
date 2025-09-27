self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('ssco-cache').then(cache => {
      return cache.addAll([
        'EngineersReport2.html',
        'manifest.json',
        // add logo paths here
      ]);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});
