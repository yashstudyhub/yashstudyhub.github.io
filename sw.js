/* Yash Study Hub service worker.
   - Your own files (index.html, logo...) : network first, so a new upload shows up at once;
     if there is no internet, the last saved copy opens.
   - Firebase scripts and Google Fonts      : saved after first use, so the page can open offline.
   - Firestore / Auth / Drive / YouTube etc.: never touched, they go straight to the network.
   To switch this off later: delete sw.js and the "serviceWorker" lines at the end of index.html. */
const SITE = 'ysh-site-v1';
const LIBS = 'ysh-libs-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(SITE).then((c) =>
      Promise.all(['./', 'index.html', 'logo.png', 'manifest.json', 'icon-192.png'].map((u) => c.add(u).catch(() => {})))
    )
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SITE && k !== LIBS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function withTimeout(p, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let u;
  try { u = new URL(req.url); } catch (err) { return; }

  if (u.origin === self.location.origin) {
    e.respondWith((async () => {
      const cache = await caches.open(SITE);
      try {
        const res = await withTimeout(fetch(req.url, { cache: 'no-cache' }), 6000);
        if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
        return res;
      } catch (err) {
        const hit = (await cache.match(req)) ||
          (req.mode === 'navigate' ? ((await cache.match('index.html')) || (await cache.match('./'))) : undefined);
        if (hit) return hit;
        return Response.error();
      }
    })());
    return;
  }

  if ((u.hostname === 'www.gstatic.com' && u.pathname.indexOf('/firebasejs/') === 0) ||
      u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    e.respondWith((async () => {
      const cache = await caches.open(LIBS);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()).catch(() => {});
      return res;
    })());
  }
  /* everything else: not handled here, the browser does its normal request */
});
