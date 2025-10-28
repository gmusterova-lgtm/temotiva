// Service Worker TEMOTIVA v3
const CACHE = "temotiva-v3";
const ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// Preload para navegaciones
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    // limpiar cachés antiguas
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE ? caches.delete(k) : null)));
    // habilitar navigation preload si está disponible
    if ("navigationPreload" in self.registration) {
      await self.registration.navigationPreload.enable();
    }
    await self.clients.claim();
  })());
});

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Estrategia
self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo mismo origen y GET
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  // Navegaciones a páginas
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        // Intenta usar navigation preload primero
        const preload = await event.preloadResponse;
        if (preload) return preload;
        // Luego red
        const network = await fetch(req);
        // Guarda copia
        const copy = network.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return network;
      } catch {
        // Fallback a la home si no hay conexión
        const cached = await caches.match("/index.html");
        return cached || new Response("Sin conexión", { status: 503 });
      }
    })());
    return;
  }

  // Recursos estáticos cache-first
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => undefined);
    })
  );
});
