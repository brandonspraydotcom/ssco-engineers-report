const CACHE_NAME = "ssco-cache-v3"; // bump this version when making changes
const urlsToCache = [
  "/ssco-engineers-report/",
  "/ssco-engineers-report/index.html",
  "/ssco-engineers-report/manifest.json",
  "/ssco-engineers-report/sw.js",
  "/ssco-engineers-report/bottle2.png"
];

// Install - pre-cache assets
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting(); // activate new service worker immediately
});

// Activate - clean up old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      )
    )
  );
  self.clients.claim(); // control clients immediately
});

// Fetch - smarter strategy
self.addEventListener("fetch", event => {
  const request = event.request;

  // Always try network first for HTML, fallback to cache
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      fetch(request)
        .then(response => {
          // update cache in background
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // For other files (icons, manifest, etc.), use cache-first
  event.respondWith(
    caches.match(request).then(response => response || fetch(request))
  );
});
