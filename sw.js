/* Minimal service worker: sirf app install (PWA) ke liye. Kuch cache nahi karta, isliye purane content ka koi risk nahi. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',()=>{});
