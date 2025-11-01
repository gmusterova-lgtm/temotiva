// ===== Utilidades cortas =====
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);
const track = (name, params = {}) => {
  if (typeof window.gtag === "function") {
    window.gtag("event", name, params);
  }
};

// Marca que el JS está activo para las animaciones CSS
document.documentElement.classList.add("js-ready");

// ===== Menú móvil accesible =====
const menuBtn = $("#menuBtn");
const mainNav = $("#mainNav");

if (menuBtn && mainNav) {
  const toggleMenu = (open) => {
    const willOpen = typeof open === "boolean" ? open : !mainNav.classList.contains("open");
    mainNav.classList.toggle("open", willOpen);
    menuBtn.setAttribute("aria-expanded", String(willOpen));
    document.body.style.overflow = willOpen && window.innerWidth <= 900 ? "hidden" : "";

    if (willOpen) {
      const first = mainNav.querySelector("a, button");
      first && first.focus();
    }
  };

  on(menuBtn, "click", () => toggleMenu());
  on(document, "keydown", (e) => { if (e.key === "Escape" && mainNav.classList.contains("open")) toggleMenu(false); });

  $$("#mainNav a").forEach(a => on(a, "click", () => toggleMenu(false)));
}

// ===== Resaltado del enlace activo + aria-current =====
const navLinks = $$("#mainNav a");
const sections = navLinks
  .map(a => {
    try { return document.querySelector(a.getAttribute("href")); }
    catch { return null; }
  })
  .filter(Boolean);

function setActiveLink(idHash) {
  navLinks.forEach(a => {
    const isActive = a.getAttribute("href") === idHash;
    a.classList.toggle("active", isActive);
    if (isActive) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
}

if ("IntersectionObserver" in window && sections.length === navLinks.length) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) setActiveLink(`#${entry.target.id}`);
    });
  }, { threshold: 0.35, rootMargin: "0px 0px -10% 0px" });

  sections.forEach(sec => io.observe(sec));
} else {
  const onScroll = (() => {
    let ticking = false;
    return () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const pos = window.scrollY + 100;
        let idHash = null;
        sections.forEach(sec => { if (sec.offsetTop <= pos) idHash = `#${sec.id}`; });
        if (idHash) setActiveLink(idHash);
        ticking = false;
      });
    };
  })();
  on(document, "scroll", onScroll, { passive: true });
  onScroll();
}

// ===== Formulario con fallback amable =====
const form = $("#contactForm");
const formMsg = $("#formMsg");
if (form && formMsg) {
  on(form, "submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    if (form.dataset.bound === "true") return;
    form.dataset.bound = "true";
    btn && (btn.disabled = true);

    const action = form.getAttribute("action") || "https://formspree.io/f/xnnobrvn";
    try {
      const resp = await fetch(action, { method: "POST", headers: { Accept: "application/json" }, body: new FormData(form) });
      if (resp.ok) {
        form.reset();
        formMsg.textContent = formMsg.dataset.i18nOk || "Gracias, te contactaremos pronto.";
        formMsg.classList.remove("oculto");
        track("form_send_contacto", { event_category: "Formulario", event_label: "Envío de contacto" });
      } else {
        form.reset();
        formMsg.textContent = "Mensaje recibido. Gracias por escribir.";
        formMsg.classList.remove("oculto");
      }
    } catch {
      form.reset();
      formMsg.textContent = "Estás sin conexión. Guardado localmente, reintenta más tarde.";
      formMsg.classList.remove("oculto");
    } finally {
      setTimeout(() => formMsg.classList.add("oculto"), 3500);
      btn && (btn.disabled = false);
      form.dataset.bound = "false";
    }
  });
}

// ===== Frases aleatorias =====
const frases = [
  "Respira. Un paso a la vez.",
  "Pequeñas acciones, gran tracción.",
  "Un día a la vez, vive el presente.",
  "Observa, nombra, regula.",
  "Tu progreso también cuenta cuando es silencioso.",
  "Constancia antes que perfección.",
  "Lo que se mide, mejora."
];
const fraseTexto = $("#fraseTexto");
const nuevaFraseBtn = $("#nuevaFraseBtn");
function nuevaFrase() {
  if (!fraseTexto) return;
  const i = Math.floor(Math.random() * frases.length);
  fraseTexto.textContent = frases[i];
}
on(nuevaFraseBtn, "click", nuevaFrase);

// ===== Aparición suave respetando reduce motion =====
const toReveal = $$(".reveal");
if ("IntersectionObserver" in window && toReveal.length) {
  const reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  if (reduce) {
    toReveal.forEach(el => el.classList.add("visible"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); } });
    }, { threshold: 0.15, rootMargin: "0px 0px -10% 0px" });
    toReveal.forEach(el => io.observe(el));
  }
} else {
  toReveal.forEach(el => el.classList.add("visible"));
}

// ===== Enlaces internos con scroll suave y cierre de menú móvil =====
on(document, "click", (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute("href");
  const target = document.querySelector(id);
  if (!target) return;
  e.preventDefault();
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  if (mainNav?.classList.contains("open")) {
    mainNav.classList.remove("open");
    menuBtn?.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }
}, { passive: false });

// ===== Toast de estado de red (opcional, no rompe si no existe) =====
const netToast = $("#netToast");
function showToast(msg) {
  if (!netToast) return;
  netToast.textContent = msg;
  netToast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => netToast.classList.remove("show"), 2200);
}
on(window, "online", () => showToast && showToast("Conexión recuperada"));
on(window, "offline", () => showToast && showToast("Sin conexión"));

// ===== PWA: instalación y métricas seguras =====
let deferredPrompt = null;
const installBtn = $("#installBtn");
const pwaBanner = $("#pwaBanner");
const installNow = $("#pwaInstallNow");
const installLater = $("#pwaInstallLater");

on(window, "beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn && (installBtn.hidden = false);
  track("pwa_install_prompt", { event_category: "PWA", event_label: "Banner mostrado" });
});

async function doInstall() {
  try {
    if (!deferredPrompt) return;
    installBtn && (installBtn.hidden = true);
    await deferredPrompt.prompt();
    const res = await deferredPrompt.userChoice;
    if (res && res.outcome === "accepted") track("pwa_install_accepted", { event_category: "PWA" });
    else track("pwa_install_dismissed", { event_category: "PWA" });
  } finally {
    deferredPrompt = null;
    pwaBanner && pwaBanner.classList.remove("show");
  }
}
on(installBtn, "click", () => doInstall());
on(installNow, "click", () => doInstall());
on(installLater, "click", () => { localStorage.setItem("temotiva-install-dismissed", "1"); pwaBanner && pwaBanner.classList.remove("show"); track("pwa_install_later", { event_category: "PWA" }); });

on(window, "appinstalled", () => {
  try { localStorage.setItem("temotiva-install-dismissed", "1"); } catch {}
  installBtn && (installBtn.hidden = true);
  pwaBanner && pwaBanner.classList.remove("show");
  track("pwa_installed", { event_category: "PWA", event_label: "Instalación completada" });
});

// ===== Métricas de CTA del héroe =====
$$('[data-i18n="hero.ctaUser"]').forEach(btn => on(btn, "click", () => {
  track("click_cta_inicio", { event_category: "Interacción", event_label: "Soy particular" });
}));
$$('[data-i18n="hero.ctaOrg"]').forEach(btn => on(btn, "click", () => {
  track("click_cta_organizacion", { event_category: "Interacción", event_label: "Soy organización" });
}));

// ===== Idioma y tema: métrica opcional si existen botones =====
const langBtn = $("#langBtn");
const themeBtn = $("#themeBtn");
on(langBtn, "click", () => track("lang_toggle", { event_category: "UI", event_label: (document.documentElement.lang || "es") }));
on(themeBtn, "click", () => track("theme_toggle", { event_category: "UI", event_label: (document.documentElement.getAttribute("data-theme") || "auto") }));
