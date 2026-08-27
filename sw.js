// HTC 2026 Service Worker — Offline + Auto-Update
// Bump this version string when you push updates to GitHub Pages.
// Users will get the new version next time they open the app with signal.
const CACHE_VERSION = 'htc-2026-v6';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './data.js',
  './engine.js',
  './app.js',
  './sync.js',
  './manifest.json',
  './assets/intro/intro-logo.png',
  './assets/intro/intro-bg.mp4'
];

// Install: cache all core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate: clear old caches (old versions auto-removed on update)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for core assets, network-first for everything else
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      // Return cached version immediately
      const fetchPromise = fetch(event.request).then(networkResponse => {
        // Update cache with fresh version in background
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_VERSION).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Network failed — that's fine, we're offline
      });

      return cached || fetchPromise;
    })
  );
});
