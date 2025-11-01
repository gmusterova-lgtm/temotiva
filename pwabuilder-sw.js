/* TEMOTIVA Service Worker, optimizado y robusto */
const CACHE_VERSION = "v3"; // súbelo cuando cambies PRECACHE o estrategias
const CACHE_NAME = `temotiva-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

/* Archivos críticos a precachear para Lighthouse y uso real */
const PRECACHE_ESSENTIAL = [
  "/inicio.html",        // start_url de la PWA
  "/style.css",
  "/script.js",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  OFFLINE_URL
];

/* Archivos opcionales. Si no existen, no se rompe la instalación */
const PRECACHE_OPTIONAL = [
  "/index.html",
  "/chica-meditando.png",
  "/share.html",
  "/screenshot-1.png",
  "/screenshot-2.png"
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

/* Install: precache esencial y luego opcional sin romper si falta algo */
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Esenciales: si falla aquí, avisará para que corrijas la ruta
    await cache.addAll(PRECACHE_ESSENTIAL);

    // Opcionales: best effort, no bloquean la instalación
    await Promise.allSettled(
      PRECACHE_OPTIONAL.map(async url => {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (res && res.ok) await cache.put(url, res.clone());
        } catch {
          /* ignorar faltantes */
        }
      })
    );
  })());
  self.skipWaiting();
});

/* Activate: limpiar cachés viejas y activar Navigation Preload si existe */
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve()))
    );
    if ("navigationPreload" in self.registration) {
      await self.registration.navigationPreload.enable();
    }
    await self.clients.claim();
  })());
});

/* Util: timeout de promesa para evitar cuelgues largos de red */
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

  // Evitar interferir con analytics y consent
  const skipHosts = ["google-analytics.com", "googletagmanager.com", "axept.io"];
  if (skipHosts.some(h => url.hostname.includes(h))) return;

  // Navegaciones a páginas: network first con preload y fallback offline
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        if (preload) return preload;

        const netRes = await timeout(5000, fetch(req));
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, netRes.clone());
        return netRes;
      } catch {
        // Si hay caché de la página solicitada, úsala
        const cached = await caches.match(req);
        if (cached) return cached;

        // Sirve inicio precacheado si piden raíz o inicio
        const precache = await caches.open(CACHE_NAME);
        if (url.pathname === "/" || url.pathname === "/inicio.html") {
          const start = await precache.match("/inicio.html");
          if (start) return start;
        }
        // Último recurso: página offline
        const offline = await precache.match(OFFLINE_URL);
        return offline || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
      }
    })());
    return;
  }

  // Estáticos de mismo origen: CSS, JS, imágenes, fonts => stale while revalidate
  if (sameOrigin && (req.destination === "style" || req.destination === "script" || req.destination === "image" || req.destination === "font")) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);

      const fetchPromise = fetch(req).then(netRes => {
        if (netRes && netRes.status === 200 && (netRes.type === "basic" || netRes.type === "cors")) {
          cache.put(req, netRes.clone());
        }
        return netRes;
      }).catch(() => null);

      if (cached) return cached;

      const netRes = await fetchPromise;
      if (netRes) return netRes;

      if (req.destination === "image") {
        return fetch(FALLBACK_IMAGE_SVG);
      }
      if (req.headers.get("accept")?.includes("text/html")) {
        const offline = await caches.match(OFFLINE_URL);
        if (offline) return offline;
      }
      return new Response(null, { status: 504 });
    })());
    return;
  }

  // API o JSON de mismo origen: network first con fallback caché
  if (sameOrigin && (req.headers.get("accept")?.includes("application/json"))) {
    event.respondWith((async () => {
      try {
        const netRes = await timeout(5000, fetch(req));
        const cache = await caches.open(CACHE_NAME);
        if (netRes && netRes.ok) cache.put(req, netRes.clone());
        return netRes;
      } catch {
        const cached = await caches.match(req);
        return cached || new Response(JSON.stringify({ offline: true }), { headers: { "Content-Type": "application/json" } });
      }
    })());
    return;
  }

  // Resto: cache first con fallback red
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).catch(() => {
      if (req.destination === "image") return fetch(FALLBACK_IMAGE_SVG);
      return new Response(null, { status: 504 });
    }))
  );
});
/* ===== Background Sync para reintentar el formulario ===== */
async function readAllQueued() {
  return new Promise((res, rej) => {
    const req = indexedDB.open("temotiva-db", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("form-queue", { keyPath: "id", autoIncrement: true });
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction("form-queue", "readonly");
      const store = tx.objectStore("form-queue");
      const getAll = store.getAll();
      getAll.onsuccess = () => res({ db, items: getAll.result || [] });
      getAll.onerror = () => rej(getAll.error);
    };
    req.onerror = () => rej(req.error);
  });
}
async function clearQueued(ids) {
  const db = await new Promise((res, rej) => {
    const req = indexedDB.open("temotiva-db", 1);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  const tx = db.transaction("form-queue", "readwrite");
  const store = tx.objectStore("form-queue");
  ids.forEach(id => store.delete(id));
  return new Promise((res, rej) => {
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  });
}

self.addEventListener("sync", (event) => {
  if (event.tag === "temotiva-form-sync") {
    event.waitUntil((async () => {
      try {
        const { items } = await readAllQueued();
        if (!items.length) return;

        const succeeded = [];
        for (const it of items) {
          const fd = new FormData();
          Object.entries(it.data || {}).forEach(([k, v]) => fd.append(k, v));
          fd.append("_source", "pwa-sync");

          const resp = await fetch(it.action, { method: "POST", body: fd });
          if (resp && resp.ok) succeeded.push(it.id);
        }
        if (succeeded.length) await clearQueued(succeeded);
      } catch (e) {
        // sin red o error de servidor: el SyncManager reintentará luego
      }
    })());
  }
});


/* Mensajería: permitir skipWaiting manual desde la app */
self.addEventListener("message", event => {
  if (!event.data) return;
  if (event.data === "SKIP_WAITING" || event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
