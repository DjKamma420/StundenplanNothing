/* Service Worker.
   Die Versionsnummer steht NUR hier. Die App fragt sie per Nachricht ab
   und vergleicht sie mit der Fassung auf dem Server. Nach jeder Änderung
   an index.html oder app.js diese Zeile hochzählen. */
const VERSION = "v39";
const DATEIEN = ["./","./index.html","./app.js","./manifest.webmanifest","./icon-192.png","./icon-512.png"];

/* cache:"reload" erzwingt das Netz. Ohne das darf der Browser einzelne
   Dateien aus seinem eigenen Zwischenspeicher liefern — GitHub Pages erlaubt
   das zehn Minuten lang. Dann landen ein neues index.html und ein altes
   app.js zusammen im selben Zwischenspeicher, und die App bricht an einer
   Kennung ab, die es in der einen Fassung gibt und in der anderen nicht.
   Schlägt eine Datei fehl, scheitert die Installation ganz und die bisherige
   Fassung bleibt — eine alte, stimmige App ist besser als eine gemischte. */
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(
    DATEIEN.map(d => fetch(new Request(d, {cache:"reload"})).then(a => {
      if(!a.ok) throw new Error(d + ": " + a.status);
      return c.put(d, a);
    }))
  )).then(() => self.skipWaiting()));
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
  const url = new URL(e.request.url);
  if(url.origin !== self.location.origin) return;        // fremde Adressen durchreichen
  if(url.pathname.endsWith("/sw.js")) return;            // Versionsprüfung muss ans Netz
  /* Zuerst aus dem Zwischenspeicher antworten, im Hintergrund erneuern.
     Netz zuerst hieße: bei schlechtem WLAN wartet der Start erst auf den
     Zeitablauf, bevor überhaupt etwas erscheint. */
  e.respondWith(caches.open(VERSION).then(async c => {
    const gespeichert = await c.match(e.request);
    const ausDemNetz = fetch(e.request)
      .then(a => { if(a && a.ok && a.type === "basic") c.put(e.request, a.clone()); return a; })
      .catch(() => null);
    return gespeichert || await ausDemNetz || c.match("./index.html");
  }));
});
