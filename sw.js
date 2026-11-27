/* Yash Study Hub — Network-First Offline Service Worker
 * Online: always fetches the latest live page & updates cache in the background.
 * Offline: serves the cached app shell, Firebase SDKs, PDF.js viewer, fonts, icons & images.
 */
const CACHE_NAME = 'ysh-web-v2';
const APP_SHELL = [
  './',
  './index.html',
  './logo.png',
  './manifest.webmanifest',
  './icon-192.png',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
];

// Dynamic API hosts that must ALWAYS bypass the service worker cache
const BYPASS_HOSTS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebaseinstallations.googleapis.com',
  'firebaseremoteconfig.googleapis.com',
  'firebasestorage.googleapis.com',
  'api.github.com',
  'www.youtube.com',
  'youtube.com',
  'drive.google.com',
  'docs.google.com'
];

// Static third-party hosts safe to cache for offline use (Firebase SDK, PDF.js, Fonts, Icons, CDN images)
const CACHEABLE_CDN_HOSTS = [
  'www.gstatic.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.jsdelivr.net'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        APP_SHELL.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('ysh-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (BYPASS_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith('.' + h))) {
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  const isCdn = CACHEABLE_CDN_HOSTS.some(
    (h) => url.hostname === h || url.hostname.endsWith('.' + h)
  );

  if (!sameOrigin && !isCdn) return;

  // Network-First with Cache Fallback: always live when online, works seamlessly when offline
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => {
          if (hit) return hit;
          if (req.mode === 'navigate' || (sameOrigin && (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')))) {
            return caches.match('./index.html').then((h) => h || caches.match('./'));
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        })
      )
  );
});
