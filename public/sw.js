/* Westmark Mobile service worker — self-clearing kill switch.
   Previous versions cached the app shell, and some installed iOS home-screen
   apps got stuck serving an old cached copy. This version takes over, deletes
   every cache, unregisters itself, and reloads open windows so the app always
   loads fresh from the network. No offline shell — the app is used online. */
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (err) { /* ignore */ }
    try { await self.registration.unregister(); } catch (err) { /* ignore */ }
    try {
      const cs = await self.clients.matchAll({ type: 'window' });
      for (const c of cs) { try { c.navigate(c.url); } catch (err) { /* ignore */ } }
    } catch (err) { /* ignore */ }
  })());
});
/* Always go straight to the network; never serve from cache. */
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  e.respondWith(fetch(r).catch(() => new Response('', { status: 504 })));
});
