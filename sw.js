/* Cleanup worker. An earlier version of the website saved a service worker in students' browsers.
   This file replaces it: it deletes the saved copies and then removes itself.
   It is safe to leave in the repository (it does nothing after that). */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    try {
      var ks = await caches.keys();
      await Promise.all(ks.filter(function (k) { return k.indexOf('ysh-') === 0; }).map(function (k) { return caches.delete(k); }));
    } catch (err) {}
    try { await self.registration.unregister(); } catch (err) {}
  })());
});
