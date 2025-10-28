// Service Worker TEMOTIVA offline page v1
/* global workbox */
importScripts("https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js");

const CACHE = "temotiva-offline-v1";
const offlineFallbackPage = "/offline.html";

// Mensajes del SW
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

// Precache de la página offline
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([offlineFallbackPage]))
  );
  self.skipWaiting();
});

// Activación, limpia cachés antiguas y activa navigation preload
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE ? caches.delete(k) : null)));
    if ("navigationPreload" in self.registration) {
      await self.registration.navigationPreload.enable();
    }
    await self.clients.claim();
  })());
});

// Fetch: para navegaciones, intenta red, si falla sirve offline.html
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        if (preload) return preload;
        const network = await fetch(event.request);
        return network;
      } catch (err) {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(offlineFallbackPage);
        return cached || new Response("Sin conexión", { status: 503 });
      }
    })());
  }
});
