/* Service Worker — hält die App offline verfügbar.
   WICHTIG: VERSION hochzählen, sobald du index.html oder app.js änderst.
   Sonst zeigt der Offline-Speicher stur die alte Fassung. */
const VERSION = "v23";
const DATEIEN = ["./", "./index.html", "./app.js", "./manifest.webmanifest",
                 "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

/* Die App fragt hier nach der laufenden Version. Dadurch muss die Nummer
   nur an dieser einen Stelle hochgezählt werden. */
self.addEventListener("message", e => {
  if(e.data === "version" && e.ports && e.ports[0]) e.ports[0].postMessage(VERSION);
  if(e.data === "sofort") self.skipWaiting();
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  // Fremde Adressen (z. B. die Ferien-API) durchreichen, nicht zwischenspeichern
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(a => { const kopie = a.clone(); caches.open(VERSION).then(c => c.put(e.request, kopie)); return a; })
      .catch(() => caches.match(e.request).then(t => t || caches.match("./index.html")))
  );
});
