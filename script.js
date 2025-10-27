// Menú móvil
const menuBtn = document.getElementById("menuBtn");
const mainNav = document.getElementById("mainNav");
if (menuBtn && mainNav){
  menuBtn.setAttribute("aria-expanded","false");
  menuBtn.addEventListener("click", ()=>{
    const open = mainNav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });
}

// Abrir externos en nueva pestaña
document.querySelectorAll('a[href^="http"]').forEach(a=>{
  try{
    const u = new URL(a.href);
    if (u.hostname !== location.hostname){
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
  }catch{}
});

// KPIs simples desde localStorage
function setText(id, val){ const el = document.getElementById(id); if (el) el.textContent = val; }
const k = JSON.parse(localStorage.getItem("temotivaStats") || '{"streak":0,"checkins":0,"ejercicios":0,"last":""}');
setText("kpi1", k.streak || 0);
setText("kpi2", k.checkins || 0);
setText("kpi3", k.ejercicios || 0);

// Utilidades
function hoyISO(){ return new Date().toISOString().slice(0,10); }
function actualizarStreak(){
  const hoy = hoyISO();
  if (!k.last){ k.streak = 1; k.last = hoy; return; }
  const last = new Date(k.last);
  const diff = Math.round((new Date(hoy) - last)/(1000*60*60*24));
  if (diff === 1) k.streak += 1;
  else if (diff > 1) k.streak = 1;
  k.last = hoy;
}

// Check-in emocional
const checkinForm = document.getElementById("checkinForm");
const checkinMsg = document.getElementById("checkinMsg");
const recoBox = document.getElementById("recomendacion");

checkinForm?.addEventListener("submit", e=>{
  e.preventDefault();
  const energia = +document.getElementById("energia").value;
  const tension = +document.getElementById("tension").value;
  const animo = +document.getElementById("animo").value;
  const nota = document.getElementById("nota").value.trim();

  // lógica muy simple de recomendación
  let reco = "";
  if (tension >= 7) reco = "Prueba respiración en caja durante 2 minutos. Inhala 4, pausa 4, exhala 4, pausa 4.";
  else if (energia <= 3) reco = "Activa el cuerpo con una caminata de 5 minutos y un vaso de agua. Luego evalúa de nuevo.";
  else if (animo <= 3) reco = "Escribe 3 cosas pequeñas que hoy sí están bajo tu control y haz la primera ahora.";
  else reco = "Mantén el ritmo. Tarea breve: identifica un micro paso que te acerque a algo que valoras.";

  // persistencia mínima
  actualizarStreak();
  k.checkins += 1;
  localStorage.setItem("temotivaStats", JSON.stringify(k));
  setText("kpi1", k.streak);
  setText("kpi2", k.checkins);

  // UI
  if (checkinMsg){ checkinMsg.classList.remove("oculto"); setTimeout(()=>checkinMsg.classList.add("oculto"), 3000); }
  if (recoBox){ recoBox.classList.remove("oculto"); recoBox.textContent = reco + (nota ? " Nota: " + nota : ""); }
  checkinForm.reset();
});

// Mini test de enfoque
const miniTest = document.getElementById("miniTest");
const ejercicio = document.getElementById("ejercicio");

miniTest?.addEventListener("submit", e=>{
  e.preventDefault();
  const foco = new FormData(miniTest).get("foco");
  let texto = "";
  if (foco === "calmar"){
    texto = "Respiración 4-6. Inhala 4, exhala 6, durante 2 a 3 minutos. Si te mareas, detente.";
  } else if (foco === "claridad"){
    texto = "Escribe: qué está pasando, qué necesitas, qué harías si fuese tu mejor amiga. Un párrafo cada uno.";
  } else if (foco === "accion"){
    texto = "Microacción de 5 minutos. Elige la tarea más pequeña que empuje el día hacia delante y hazla ahora.";
  } else {
    texto = "Elige una opción. Luego obtendrás un ejercicio breve.";
  }
  if (ejercicio){ ejercicio.classList.remove("oculto"); ejercicio.textContent = texto; }
  k.ejercicios += 1;
  localStorage.setItem("temotivaStats", JSON.stringify(k));
  setText("kpi3", k.ejercicios);
});

// Formulario de contacto, simulación simple
const contactForm = document.getElementById("contactForm");
const formMsg = document.getElementById("formMsg");
contactForm?.addEventListener("submit", e=>{
  e.preventDefault();
  contactForm.reset();
  if (formMsg){ formMsg.classList.remove("oculto"); setTimeout(()=>formMsg.classList.add("oculto"), 3500); }
});
