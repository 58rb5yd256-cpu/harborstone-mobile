/* Harborstone Mobile service worker: caches the app shell for Home Screen use.
   API calls and anything non-GET are never cached. Bump VERSION to force an update. */
const VERSION = 'hm-v1';
const SHELL = ['/', '/css/app.css', '/css/views.css', '/js/core.js', '/js/ui.js', '/js/auth.js', '/js/home.js', '/js/accounts.js', '/js/payments.js', '/js/receipts.js', '/js/cards.js', '/js/more.js', '/js/main.js', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/apple-touch-icon.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request; const u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  e.respondWith(fetch(r).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(r, copy)); } return res; }).catch(() => caches.match(r).then((m) => m || caches.match('/'))));
});
