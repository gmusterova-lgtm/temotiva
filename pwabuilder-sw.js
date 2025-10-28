// Instalación y activación básicas
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => self.clients.claim());

// Estrategia de red simple
self.addEventListener("fetch", event => {
  return; // deja pasar todas las peticiones sin cache agresivo
});
