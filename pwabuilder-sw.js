// pwabuilder-sw.js — TEMOTIVA
const CACHE_NAME = "temotiva-v2";
const ASSETS = [
  "/",                // si algún día sirves en subcarpeta, cambia a "/tu-repo/"
  "/index.html",
  "/offline.html",
  "/style.css",
  "/script.js",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.json"
];

// Install: precache del shell y actualización inmediata
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => undefined)
  );
});

// Activate: limpia versiones antiguas y toma control
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

// Fetch:
// - HTML: network first, fallback a caché y luego offline.html
// - Otros: cache first con actualización en segundo plano
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const isHtml = req.headers.get("accept")?.includes("text/html");

  if (isHtml) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          return cached || caches.match("/offline.html");
        })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
