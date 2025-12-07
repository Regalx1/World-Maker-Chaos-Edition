const CACHE_NAME = 'world-maker-cache-v1';
const urlsToCache = [
  '/World-Maker-Chaos-Edition/',
  '/World-Maker-Chaos-Edition/index.html',
  '/World-Maker-Chaos-Edition/game.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
