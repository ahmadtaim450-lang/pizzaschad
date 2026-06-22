// PIZZA SCHAD – POS Launcher · Service Worker
const CACHE = 'schad-pos-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  'assets/app-icon-180.png',
  'assets/app-icon-192.png',
  'assets/app-icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(ASSETS.map((url) => cache.add(url).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Only handle the launcher's own scope; the sub-apps have their own service workers.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try { return await fetch(req); }
      catch (e) { return (await caches.match(req)) || (await caches.match('./index.html')); }
    })());
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(req);
    return cached || fetch(req).catch(() => cached);
  })());
});
