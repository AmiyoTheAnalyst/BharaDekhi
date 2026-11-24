// BharaDekhi PWA Service Worker - Lightweight & Secure
const CACHE_NAME = 'bharadekhi-pwa-v112-perf-textures';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/assets/bharadekhi-mark.svg',
  '/assets/GLTFLoader.js',
  '/assets/SkeletonUtils.js',
  '/assets/fflate.min.js',
  '/assets/FBXLoader.js',
  '/assets/dhaka-bus-routes.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(STATIC_ASSETS).catch(err => {
          console.warn('[BharaDekhi SW] Cache addAll warning:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  // 1. Only call event.respondWith for same-origin GET requests;
  // bypass non-GET, WebSocket (/ws), and external CDN requests so the browser handles them normally.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/ws')) return;

  const isCodeOrDoc = req.mode === 'navigate' ||
                      /\.(html|js|css)($|\?)/i.test(url.pathname) ||
                      Boolean(url.search);

  // 2. Inside respondWith async chain, ALWAYS return a valid Response (never null/undefined, never unhandled rejection)
  event.respondWith((async () => {
    if (isCodeOrDoc) {
      // Network-First for code, HTML, CSS, JS, and query-versioned requests so live updates appear immediately
      try {
        const netRes = await fetch(req);
        if (netRes && netRes.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, netRes.clone()).catch(() => {});
        }
        if (netRes) return netRes;
      } catch (err) {
        // Fall back to cache on network failure
      }

      try {
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === 'navigate') {
          const navFallback = (await caches.match('/index.html')) || (await caches.match('/'));
          if (navFallback) return navFallback;
        }
      } catch (err) {
        // Cache lookup failed
      }

      return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    }

    // Cache-First for static binary assets (images, icons, fonts, json)
    try {
      const cached = await caches.match(req);
      if (cached) return cached;

      const netRes = await fetch(req);
      if (netRes && netRes.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, netRes.clone()).catch(() => {});
      }
      return netRes || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    } catch (err) {
      const fallback = await caches.match(req).catch(() => null);
      return fallback || new Response('Network error', { status: 502, statusText: 'Bad Gateway' });
    }
  })());
});
