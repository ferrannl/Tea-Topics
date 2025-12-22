
// =========================
// DATA (zet hier AL je Tea Topics)
// =========================
const TOPICS = [
  // Luchtig & Fun
  { text: "Wat is jouw favoriete ijssmaak?", cat: "Luchtig & Fun" },
  { text: "Wat is de leukste mop die je ooit hebt gehoord?", cat: "Luchtig & Fun" },
  { text: "Zing je wel eens onder de douche?", cat: "Luchtig & Fun" },

  // Persoonlijk
  { text: "Hoe voel je je vandaag?", cat: "Persoonlijk" },
  { text: "Wat maakt jou uniek?", cat: "Persoonlijk" },

  // Relaties
  { text: "Wie maakt jou blij?", cat: "Relaties" },
  { text: "Wie zou je vandaag kunnen helpen?", cat: "Relaties" },

  // Thee & Rust
  { text: "Waar kom jij echt tot rust?", cat: "Thee & Rust" },
  { text: "Wanneer drink jij het liefst thee?", cat: "Thee & Rust" },

  // Dromen & Toekomst
  { text: "Wat is jouw grootste droom?", cat: "Dromen & Toekomst" },
  { text: "Waar zie je jezelf over vijf jaar?", cat: "Dromen & Toekomst" },

  // Reflectie
  { text: "Waar ben je dankbaar voor?", cat: "Reflectie" },

  // Dagelijks Leven
  { text: "Hoe ziet jouw ochtendritueel eruit?", cat: "Dagelijks Leven" },

  // Creativiteit & Inspiratie
  { text: "Welke muziek raakt jou?", cat: "Creativiteit & Inspiratie" }
];

// =========================
// ELEMENTS
// =========================
const grid = document.getElementById("grid");
const search = document.getElementById("search");
const filter = document.getElementById("categoryFilter");
const randomBtn = document.getElementById("randomBtn");

const darkToggle = document.getElementById("darkToggle");
const fullscreenBtn = document.getElementById("fullscreenBtn");

const fs = document.getElementById("fullscreen");
const fsQuestion = document.getElementById("fsQuestion");
const fsCategory = document.getElementById("fsCategory");
const fsNext = document.getElementById("fsNext");
const fsClose = document.getElementById("fsClose");
const fsHint = document.getElementById("fsHint");

// =========================
// DARK MODE (onthouden)
// =========================
function setDarkIcon(){
  darkToggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
}
if(localStorage.getItem("dark") === "1"){
  document.body.classList.add("dark");
}
setDarkIcon();

darkToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("dark", document.body.classList.contains("dark") ? "1" : "0");
  setDarkIcon();
});

// =========================
// FILTER DROPDOWN
// =========================
const categories = ["Alle", ...new Set(TOPICS.map(t => t.cat))];
filter.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join("");

// =========================
// RENDER
// =========================
function render(){
  const q = (search.value || "").toLowerCase().trim();
  const c = filter.value;

  grid.innerHTML = "";

  const list = TOPICS.filter(t => {
    const okCat = (c === "Alle") || (t.cat === c);
    const okSearch = !q || t.text.toLowerCase().includes(q);
    return okCat && okSearch;
  });

  list.forEach((t, idx) => {
    const d = document.createElement("div");
    d.className = "card";
    d.style.animationDelay = `${Math.min(idx, 20) * 12}ms`; // subtiele stagger
    d.innerHTML = `<p>${t.text}</p><div class="badge">${t.cat}</div>`;

    // Tap = kopieer (handig aan tafel)
    d.addEventListener("click", async () => {
      try{
        await navigator.clipboard.writeText(t.text);
      }catch(e){
        // als clipboard niet mag, doen we niks (geen irritante alerts)
      }
    });

    grid.appendChild(d);
  });
}

search.addEventListener("input", render);
filter.addEventListener("change", render);

// =========================
// RANDOM (normaal)
// =========================
function randomFrom(list){
  return list[Math.floor(Math.random() * list.length)];
}

randomBtn.addEventListener("click", () => {
  const t = randomFrom(TOPICS);
  alert(t.text);
});

// =========================
// FULLSCREEN RANDOM MODE
// =========================
function isTouchDevice(){
  return window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
}

function updateHint(){
  if(isTouchDevice()){
    fsHint.textContent = "Tik op de vraag of swipe → voor volgende · gebruik 'Sluiten' om terug te gaan";
  }else{
    fsHint.textContent = "Klik = volgende · spatie/enter = volgende · esc = sluiten";
  }
}

function openFullscreen(){
  fs.hidden = false;
  fs.setAttribute("aria-hidden", "false");
  updateHint();
  showNextFullscreen();
}

function closeFullscreen(){
  fs.hidden = true;
  fs.setAttribute("aria-hidden", "true");
}

function showNextFullscreen(){
  const t = randomFrom(TOPICS);
  fsQuestion.textContent = t.text;
  fsCategory.textContent = t.cat;
}

fullscreenBtn.addEventListener("click", openFullscreen);
fsClose.addEventListener("click", closeFullscreen);
fsNext.addEventListener("click", showNextFullscreen);

// Tap anywhere on the overlay = next (behalve op knoppen)
fs.addEventListener("click", (e) => {
  const clickedButton = e.target.closest(".fsBtn");
  if(clickedButton) return;
  showNextFullscreen();
});

// Keyboard support (desktop)
document.addEventListener("keydown", (e) => {
  if(fs.hidden) return;
  if(e.key === "Escape") closeFullscreen();
  if(e.key === " " || e.key === "Enter") showNextFullscreen();
});

// Swipe support (mobile)
let startX = null;
let startY = null;

fs.addEventListener("touchstart", (e) => {
  const t = e.touches && e.touches[0];
  if(!t) return;
  startX = t.clientX;
  startY = t.clientY;
}, { passive: true });

fs.addEventListener("touchend", (e) => {
  const t = e.changedTouches && e.changedTouches[0];
  if(!t || startX === null || startY === null) return;

  const dx = t.clientX - startX;
  const dy = t.clientY - startY;

  // horizontale swipe
  if(Math.abs(dx) > 60 && Math.abs(dy) < 80){
    showNextFullscreen();
  }

  startX = startY = null;
}, { passive: true });

// =========================
// INIT
// =========================
render();
