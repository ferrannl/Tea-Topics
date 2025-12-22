let TOPICS = [];
let fsIndex = 0;

const grid = document.getElementById("grid");
const search = document.getElementById("search");
const filter = document.getElementById("categoryFilter");

const darkToggle = document.getElementById("darkToggle");
const openFullscreenBtn = document.getElementById("openFullscreen");

const fs = document.getElementById("fullscreen");
const fsQuestion = document.getElementById("fsQuestion");
const fsCategory = document.getElementById("fsCategory");
const fsClose = document.getElementById("fsClose");
const fsNext = document.getElementById("fsNext");
const fsPrev = document.getElementById("fsPrev");

/* ---------------- DARK MODE ---------------- */
if(localStorage.dark === "1") document.body.classList.add("dark");
darkToggle.onclick = () => {
  document.body.classList.toggle("dark");
  localStorage.dark = document.body.classList.contains("dark") ? "1" : "0";
};

/* ---------------- LOAD JSON ---------------- */
async function loadTopics(){
  const res = await fetch("topics.json", { cache: "no-store" });
  const data = await res.json();
  TOPICS = data.topics.map(t => ({
    text: t.text.trim(),
    cat: t.categorie.trim()
  }));
  initCategories();
  render();
  openFullscreen(); // start fullscreen on first boot
}

/* ---------------- CATEGORIES ---------------- */
function initCategories(){
  const cats = ["Alle", ...new Set(TOPICS.map(t => t.cat))];
  filter.innerHTML = cats.map(c => `<option>${c}</option>`).join("");
}

/* ---------------- RENDER GRID ---------------- */
function render(){
  const q = search.value.toLowerCase();
  const c = filter.value;

  grid.innerHTML = "";
  TOPICS.filter(t =>
    (c === "Alle" || t.cat === c) &&
    t.text.toLowerCase().includes(q)
  ).forEach(t => {
    const d = document.createElement("div");
    d.className = "card";
    d.innerHTML = `<p>${t.text}</p><div class="badge">${t.cat}</div>`;
    grid.appendChild(d);
  });
}

search.oninput = filter.onchange = render;

/* ---------------- FULLSCREEN LOGIC ---------------- */
function openFullscreen(){
  fs.hidden = false;
  fsIndex = Math.floor(Math.random() * TOPICS.length);
  updateFs();
}

function closeFullscreen(){
  fs.hidden = true;
}

function updateFs(){
  const t = TOPICS[fsIndex];
  fsQuestion.textContent = t.text;
  fsCategory.textContent = t.cat;
}

fsNext.onclick = () => {
  fsIndex = (fsIndex + 1) % TOPICS.length;
  updateFs();
};

fsPrev.onclick = () => {
  fsIndex = (fsIndex - 1 + TOPICS.length) % TOPICS.length;
  updateFs();
};

fsClose.onclick = closeFullscreen;
openFullscreenBtn.onclick = openFullscreen;

/* ---------------- INIT ---------------- */
loadTopics();
