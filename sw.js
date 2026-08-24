/* Service Worker.
   Die Versionsnummer steht NUR hier. Die App fragt sie per Nachricht ab
   und vergleicht sie mit der Fassung auf dem Server. Nach jeder Änderung
   an index.html oder app.js diese Zeile hochzählen. */
const VERSION = "v31";
const DATEIEN = ["./","./index.html","./app.js","./manifest.webmanifest","./icon-192.png","./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("message", e => {
  if(e.data === "version" && e.ports && e.ports[0]) e.ports[0].postMessage(VERSION);
  if(e.data === "sofort") self.skipWaiting();
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type:"window"}).then(l => l.length ? l[0].focus() : self.clients.openWindow("./")));
});
self.addEventListener("fetch", e => {
  if(e.request.method !== "GET") return;
  if(new URL(e.request.url).origin !== self.location.origin) return;   // fremde Adressen durchreichen
  e.respondWith(
    fetch(e.request)
      .then(a => { const k = a.clone(); caches.open(VERSION).then(c => c.put(e.request, k)); return a; })
      .catch(() => caches.match(e.request).then(t => t || caches.match("./index.html")))
  );
});
