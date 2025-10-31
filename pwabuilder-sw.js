/* TEMOTIVA Service Worker, optimizado */
const CACHE_VERSION = "v2"; // súbelo cuando cambies PRECACHE o estrategias
const CACHE_NAME = `temotiva-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

/* Archivos críticos a precachear */
const PRECACHE = [
  "/", "/index.html", "/style.css", "/manifest.json",
  "/icon-192.png", "/icon-512.png",
  "/chica-meditando.png",
  "/script.js",
  "/share.html",
  OFFLINE_URL,
  // Si ya las tienes, añade tus capturas:
  "/screenshot-1.png", "/screenshot-2.png"
];

/* Placeholder de imagen en data URL por si falla la red y no hay caché */
const FALLBACK_IMAGE_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80">
      <rect width="120" height="80" fill="#e3e3e3"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="10" fill="#666">
        Offline
      </text>
    </svg>`
  );

/* Install: precache */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

/* Activate: limpiar cachés viejas y activar Navigation Preload si existe */
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    // Limpieza de cachés antigüas
    const keys = await caches.keys();
    await Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : Promise.resolve()));
    // Navigation preload acelera la primera respuesta en navegaciones
    if ("navigationPreload" in self.registration) {
      await self.registration.navigationPreload.enable();
    }
  })());
  self.clients.claim();
});

/* Util: timeout de promesa */
const timeout = (ms, promise) =>
  new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("timeout")), ms);
    promise
      .then(res => { clearTimeout(id); resolve(res); })
      .catch(err => { clearTimeout(id); reject(err); });
  });

/* Fetch: estrategias por tipo de petición */
self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Navegaciones a páginas: Network first con preload y fallback offline
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        // Usa la respuesta de navigation preload si está disponible
        const preload = await event.preloadResponse;
        if (preload) return preload;

        // Red con timeout para no colgarse
        const netRes = await timeout(5000, fetch(req));
        // Guarda copia en caché en segundo plano
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, netRes.clone());
        return netRes;
      } catch {
        // Si hay caché de la página solicitada, úsala
        const cached = await caches.match(req);
        if (cached) return cached;
        // Último recurso: página offline
        const offline = await caches.match(OFFLINE_URL);
        return offline || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
      }
    })());
    return;
  }

  // Estáticos de mismo origen: CSS, JS, imágenes => Stale while revalidate
  if (sameOrigin && (req.destination === "style" || req.destination === "script" || req.destination === "image" || req.destination === "font")) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      const fetchPromise = fetch(req).then(netRes => {
        // Solo cachea respuestas válidas
        if (netRes && netRes.status === 200 && netRes.type === "basic") {
          cache.put(req, netRes.clone());
        }
        return netRes;
      }).catch(() => null);
      // Devuelve lo que haya ya en caché, y actualiza cuando llegue la red
      if (cached) return cached;
      // Si no hay caché, intenta red
      const netRes = await fetchPromise;
      if (netRes) return netRes;
      // Fallback de imagen si procede
      if (req.destination === "image") {
        return fetch(FALLBACK_IMAGE_SVG);
      }
      // Como último recurso, intenta offline.html para HTML embebido
      if (req.headers.get("accept")?.includes("text/html")) {
        const offline = await caches.match(OFFLINE_URL);
        if (offline) return offline;
      }
      return new Response(null, { status: 504 });
    })());
    return;
  }

  // API o JSON de mismo origen: Network first con fallback caché
  if (sameOrigin && (req.headers.get("accept")?.includes("application/json"))) {
    event.respondWith((async () => {
      try {
        const netRes = await timeout(5000, fetch(req));
        const cache = await caches.open(CACHE_NAME);
        if (netRes && netRes.status === 200) cache.put(req, netRes.clone());
        return netRes;
      } catch {
        const cached = await caches.match(req);
        return cached || new Response(JSON.stringify({ offline: true }), { headers: { "Content-Type": "application/json" } });
      }
    })());
    return;
  }

  // Resto: Cache first con fallback red
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).catch(() => {
      // Fallback para imágenes externas si falla
      if (req.destination === "image") return fetch(FALLBACK_IMAGE_SVG);
      return new Response(null, { status: 504 });
    }))
  );
});

/* Mensajería: permitir skipWaiting manual desde la app */
self.addEventListener("message", event => {
  if (!event.data) return;
  if (event.data === "SKIP_WAITING" || event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
