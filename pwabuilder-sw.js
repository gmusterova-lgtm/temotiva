// Service Worker TEMOTIVA (versión 2)
const CACHE = "temotiva-v2"; // Cambia este número cada vez que modifiques el SW
const ASSETS = [
  "/",                   // Home
  "/index.html",         // Página principal
  "/style.css",          // Estilos
  "/script.js",          // JS principal
  "/manifest.json",      // Manifest
  "/icons/icon-192.png", // Icono pequeño
  "/icons/icon-512.png"  // Icono grande
];

// Instalación: guarda los archivos en caché
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activación: limpia cachés antiguas
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => (key !== CACHE ? caches.delete(key) : null)))
    )
  );
  self.clients.claim();
});

// Intercepta las peticiones y sirve desde caché (estrategia cache-first)
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignorar peticiones externas o métodos distintos de GET
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => {
          // Si falla la red, devuelve la home
          if (request.mode === "navigate") return caches.match("/index.html");
        });
    })
  );
});

