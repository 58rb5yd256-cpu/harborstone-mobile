/* Westmark Mobile service worker: responsive app shell for Home Screen use. */
const VERSION = 'hm-v49';
const SHELL = ['/', '/css/app.css', '/css/layout.css', '/css/theme.css', '/css/skin.css', '/js/theme-init.js', '/js/app.js', '/js/install.js', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/apple-touch-icon.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => { const r=e.request,u=new URL(r.url); if(r.method!=='GET'||u.origin!==location.origin||u.pathname.startsWith('/api/'))return; e.respondWith(fetch(r).then(res=>{if(res.ok){const copy=res.clone();caches.open(VERSION).then(c=>c.put(r,copy));}return res;}).catch(()=>caches.match(r).then(m=>m||caches.match('/')))); });
