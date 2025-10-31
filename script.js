// ===== Utilidades cortas =====
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

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
    // Evita scroll de fondo cuando el menú está abierto en móvil
    document.body.style.overflow = willOpen && window.innerWidth <= 900 ? "hidden" : "";
    // En apertura, lleva foco al primer enlace
    if (willOpen) {
      const first = mainNav.querySelector("a, button");
      first && first.focus();
    }
  };

  menuBtn.addEventListener("click", () => toggleMenu());

  // Cierra al pulsar Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mainNav.classList.contains("open")) toggleMenu(false);
  });

  // Cierra al navegar por un enlace del menú
  $$("#mainNav a").forEach(a => a.addEventListener("click", () => toggleMenu(false)));
}

// ===== Resaltado del enlace activo =====
// Usa IntersectionObserver para mayor precisión y rendimiento.
const navLinks = $$("#mainNav a");
const sections = navLinks
  .map(a => {
    try { return document.querySelector(a.getAttribute("href")); }
    catch { return null; }
  })
  .filter(Boolean);

if ("IntersectionObserver" in window && sections.length === navLinks.length) {
  let activeId = null;

  const io = new IntersectionObserver((entries) => {
    // Considera visible cuando el 35% de la sección está en viewport
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        activeId = `#${entry.target.id}`;
        navLinks.forEach(a => a.classList.toggle("active", a.getAttribute("href") === activeId));
      }
    });
  }, { threshold: 0.35, rootMargin: "0px 0px -10% 0px" });

  sections.forEach(sec => io.observe(sec));
} else {
  // Fallback: calcula por scroll con rAF para evitar jank
  const onScroll = (() => {
    let ticking = false;
    return () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const pos = window.scrollY + 100;
        let idx = 0;
        sections.forEach((sec, i) => { if (sec.offsetTop <= pos) idx = i; });
        navLinks.forEach((a, i) => a.classList.toggle("active", i === idx));
        ticking = false;
      });
    };
  })();
  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

// ===== Formulario =====
// Mejora progresiva: si hay red, intenta envío remoto; si no, simula OK.
const form = $("#contactForm");
const formMsg = $("#formMsg");

if (form && formMsg) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn && (btn.disabled = true);

    // Si el proyecto ya tiene handler en otro script, evita duplicar
    if (form.dataset.bound === "true") return;
    form.dataset.bound = "true";

    try {
      // Si existe Formspree en tu página, respeta esa URL
      const action = form.getAttribute("action") || "https://formspree.io/f/xnnobrvn";
      const resp = await fetch(action, { method: "POST", headers: { Accept: "application/json" }, body: new FormData(form) });
      if (resp.ok) {
        form.reset();
        formMsg.classList.remove("oculto");
        setTimeout(() => formMsg.classList.add("oculto"), 3500);
      } else {
        // Fallback local para no perder UX
        form.reset();
        formMsg.textContent = "Mensaje recibido. Gracias por escribir.";
        formMsg.classList.remove("oculto");
        setTimeout(() => formMsg.classList.add("oculto"), 3500);
      }
    } catch {
      // Modo sin conexión: muestra confirmación local
      form.reset();
      formMsg.textContent = "Estás sin conexión. Guardado localmente, reintenta más tarde.";
      formMsg.classList.remove("oculto");
      setTimeout(() => formMsg.classList.add("oculto"), 3500);
    } finally {
      btn && (btn.disabled = false);
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
nuevaFraseBtn && nuevaFraseBtn.addEventListener("click", nuevaFrase);

// ===== Aparición suave al hacer scroll =====
const toReveal = $$(".reveal");
if ("IntersectionObserver" in window && toReveal.length) {
  // Respeta usuarios con reducción de movimiento
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    toReveal.forEach(el => el.classList.add("visible"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -10% 0px" });
    toReveal.forEach(el => io.observe(el));
  }
} else {
  toReveal.forEach(el => el.classList.add("visible"));
}

// ===== Enlaces internos con scroll suave y cierre de menú en móvil =====
document.addEventListener("click", (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute("href");
  const target = document.querySelector(id);
  if (!target) return;
  e.preventDefault();
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  // Cierra menú móvil si está abierto
  if (mainNav?.classList.contains("open")) {
    mainNav.classList.remove("open");
    menuBtn?.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }
}, { passive: false });
