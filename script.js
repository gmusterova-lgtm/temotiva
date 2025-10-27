// Menú móvil
const menuBtn = document.getElementById("menuBtn");
const mainNav = document.getElementById("mainNav");
menuBtn.addEventListener("click", () => {
  mainNav.classList.toggle("open");
});

// Resaltar enlace activo mientras haces scroll
const links = [...document.querySelectorAll("#mainNav a")];
const sections = links.map(a => document.querySelector(a.getAttribute("href")));

function onScroll() {
  const pos = window.scrollY + 100;
  let active = 0;
  sections.forEach((sec, i) => {
    if (sec.offsetTop <= pos) active = i;
  });
  links.forEach((a, i) => a.classList.toggle("active", i === active));
}
document.addEventListener("scroll", onScroll);
onScroll();

// Formulario simulado
const form = document.getElementById("contactForm");
const formMsg = document.getElementById("formMsg");
form.addEventListener("submit", (e) => {
  e.preventDefault();
  form.reset();
  formMsg.classList.remove("oculto");
  setTimeout(() => formMsg.classList.add("oculto"), 3000);
});

// Frases aleatorias
const frases = [
  "Respira. Un paso a la vez.",
  "Pequeñas acciones, gran tracción.",
  "Un día a la vez, vive el presente.",
  "Observa, nombra, regula.",
  "Tu progreso también cuenta cuando es silencioso.",
  "Constancia antes que perfección.",
  "Lo que se mide, mejora."
];

const fraseTexto = document.getElementById("fraseTexto");
const nuevaFraseBtn = document.getElementById("nuevaFraseBtn");

function nuevaFrase() {
  const i = Math.floor(Math.random() * frases.length);
  fraseTexto.textContent = frases[i];
}
if (nuevaFraseBtn) {
  nuevaFraseBtn.addEventListener("click", nuevaFrase);
}

// Aparición suave al hacer scroll
const toReveal = document.querySelectorAll(".reveal");
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add("visible");
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.15 });

toReveal.forEach(el => io.observe(el));
