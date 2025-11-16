// Service Worker básico para TEMOTIVA
const CACHE_NAME = "temotiva-v1";

// Ajusta esta lista con los archivos mínimos que quieres que funcionen sin conexión
const ASSETS_TO_CACHE = [
  "/",
  "/inicio.html",
  "/manifest.json",
  "/style.css",
  "/offline.html",
  "/icon-192.png",
  "/icon-512.png"
];

// Instalar: se abre el caché y se guardan los archivos clave
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activar: limpiar caches antiguos si cambias el nombre de CACHE_NAME
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: estrategia
// - Navegaciones: intenta red primero y si falla, offline.html
// - Archivos estáticos: cache first
self.addEventListener("fetch", event => {
  const request = event.request;

  // Navegaciones de página (HTML)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match("/offline.html");
      })
    );
    return;
  }

  // Archivos estáticos
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then(networkResponse => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(request, networkResponse.clone());
          return networkResponse;
        });
      }).catch(() => {
        return cachedResponse;
      });
    })
  );
});
