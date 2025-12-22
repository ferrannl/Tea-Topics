/* =========================================================
   Tea Topics — UI
   - Zoeken
   - Filter collectie + categorie
   - Random topic (modal)
   - Kopiëren bij klik
   - topics.json autoload (repo)
========================================================= */

const $ = (sel) => document.querySelector(sel);

const searchInput = $("#searchInput");
const collectionSelect = $("#collectionSelect");
const categorySelect = $("#categorySelect");
const topicsGrid = $("#topicsGrid");
const shownCountEl = $("#shownCount");
const totalCountEl = $("#totalCount");
const clearFiltersBtn = $("#clearFiltersBtn");

const randomBtn = $("#randomBtn");
const randomModal = $("#randomModal");
const randomTopicCard = $("#randomTopicCard");
const closeModalBtn = $("#closeModalBtn");
const anotherRandomBtn = $("#anotherRandomBtn");
const copyRandomBtn = $("#copyRandomBtn");

const scrollToOcrBtn = $("#scrollToOcrBtn");
const ocrPanel = $("#ocrPanel");

// JSON export/import (staan nog in je HTML; handig)
const exportJsonBtn = $("#exportJsonBtn");
const importJsonInput = $("#importJsonInput");

// DATA
let TOPICS = []; // wordt gevuld via topics.json

const state = {
  query: "",
  collectie: "ALLE",
  categorie: "ALLE",
};

init();

function init(){
  // UI events
  searchInput.addEventListener("input", () => {
    state.query = searchInput.value.trim().toLowerCase();
    render();
  });

  collectionSelect.addEventListener("change", () => {
    state.collectie = collectionSelect.value;
    buildCategoryFilter();
    render();
  });

  categorySelect.addEventListener("change", () => {
    state.categorie = categorySelect.value;
    render();
  });

  clearFiltersBtn.addEventListener("click", () => {
    searchInput.value = "";
    state.query = "";
    state.collectie = "ALLE";
    state.categorie = "ALLE";
    buildFilters();
    render();
  });

  randomBtn.addEventListener("click", () => openRandom());
  anotherRandomBtn.addEventListener("click", () => openRandom(true));
  closeModalBtn.addEventListener("click", () => randomModal.close());
  copyRandomBtn.addEventListener("click", () => copyToClipboard(randomTopicCard.dataset.text || ""));

  scrollToOcrBtn?.addEventListener("click", () => {
    ocrPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  exportJsonBtn?.addEventListener("click", exportTopicsJson);
  importJsonInput?.addEventListener("change", importTopicsJson);

  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape" && randomModal.open) randomModal.close();
  });

  // Load data
  loadTopicsFromRepo();
}

/* ---------------- Load topics.json ---------------- */

async function loadTopicsFromRepo(){
  try{
    const res = await fetch(`topics.json?cb=${Date.now()}`, { cache: "no-store" });
    if(!res.ok) throw new Error("topics.json niet gevonden");
    const data = await res.json();
    if(!data || !Array.isArray(data.topics)) throw new Error("topics.json formaat fout");

    TOPICS = data.topics
      .filter(t => t && t.text && t.collectie)
      .map(t => ({
        id: t.id || cryptoId(),
        text: String(t.text).trim(),
        collectie: String(t.collectie).trim(),
        categorie: t.categorie ? String(t.categorie).trim() : ""
      }));

    totalCountEl.textContent = String(TOPICS.length);
    buildFilters();
    render();
    toast(`topics.json geladen (${TOPICS.length})`);
  }catch(err){
    TOPICS = [];
    totalCountEl.textContent = "0";
    buildFilters();
    render();
    toast("topics.json niet gevonden of leeg");
  }
}

/* ---------------- Filters ---------------- */

function buildFilters(){
  buildCollectionFilter();
  buildCategoryFilter();
}

function buildCollectionFilter(){
  const collections = unique(TOPICS.map(t => t.collectie)).sort(nlSort);
  collectionSelect.innerHTML = "";

  const optAll = document.createElement("option");
  optAll.value = "ALLE";
  optAll.textContent = "Alle collecties";
  collectionSelect.appendChild(optAll);

  for(const c of collections){
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    collectionSelect.appendChild(opt);
  }

  if(!collections.includes(state.collectie)) state.collectie = "ALLE";
  collectionSelect.value = state.collectie;
}

function buildCategoryFilter(){
  const base = (state.collectie === "ALLE")
    ? TOPICS
    : TOPICS.filter(t => t.collectie === state.collectie);

  const cats = unique(base.map(t => t.categorie).filter(Boolean)).sort(nlSort);

  categorySelect.innerHTML = "";

  const optAll = document.createElement("option");
  optAll.value = "ALLE";
  optAll.textContent = "Alle categorieën";
  categorySelect.appendChild(optAll);

  for(const c of cats){
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    categorySelect.appendChild(opt);
  }

  if(!cats.includes(state.categorie)) state.categorie = "ALLE";
  categorySelect.value = state.categorie;
}

/* ---------------- Rendering ---------------- */

function render(){
  const filtered = getFilteredTopics();
  shownCountEl.textContent = String(filtered.length);
  totalCountEl.textContent = String(TOPICS.length);

  topicsGrid.innerHTML = "";

  if(filtered.length === 0){
    topicsGrid.innerHTML = `
      <div class="panel" style="grid-column:1/-1;">
        <strong>Geen resultaten.</strong><br/>
        Probeer een andere zoekterm of wis filters.
      </div>
    `;
    return;
  }

  for(const topic of filtered){
    const card = document.createElement("div");
    card.className = "topicCard";
    card.tabIndex = 0;
    card.role = "button";
    card.dataset.text = topic.text;

    card.innerHTML = `
      <div class="topicText">${escapeHtml(topic.text)}</div>
      <div class="topicMeta">
        <span class="badge">${escapeHtml(topic.collectie)}</span>
        ${topic.categorie ? `<span class="badge">${escapeHtml(topic.categorie)}</span>` : ""}
      </div>
    `;

    card.addEventListener("click", () => copyToClipboard(topic.text));
    card.addEventListener("keydown", (e) => {
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        copyToClipboard(topic.text);
      }
    });

    topicsGrid.appendChild(card);
  }
}

function getFilteredTopics(){
  let list = [...TOPICS];

  if(state.collectie !== "ALLE"){
    list = list.filter(t => t.collectie === state.collectie);
  }
  if(state.categorie !== "ALLE"){
    list = list.filter(t => t.categorie === state.categorie);
  }
  if(state.query){
    list = list.filter(t => (t.text || "").toLowerCase().includes(state.query));
  }
  return list;
}

/* ---------------- Random ---------------- */

function openRandom(silent = false){
  const pool = getFilteredTopics();
  if(pool.length === 0){
    if(!silent) alert("Geen Tea Topics gevonden binnen je huidige filters.");
    return;
  }

  const pick = pool[Math.floor(Math.random() * pool.length)];
  randomTopicCard.className = "topicCard big";
  randomTopicCard.dataset.text = pick.text;
  randomTopicCard.innerHTML = `
    <div class="topicText">${escapeHtml(pick.text)}</div>
    <div class="topicMeta">
      <span class="badge">${escapeHtml(pick.collectie)}</span>
      ${pick.categorie ? `<span class="badge">${escapeHtml(pick.categorie)}</span>` : ""}
    </div>
  `;

  if(!randomModal.open) randomModal.showModal();
}

/* ---------------- Clipboard ---------------- */

async function copyToClipboard(text){
  if(!text) return;
  try{
    await navigator.clipboard.writeText(text);
    toast(`Gekopieerd: “${truncate(text, 48)}”`);
  }catch{
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    toast(`Gekopieerd: “${truncate(text, 48)}”`);
  }
}

function toast(msg){
  const el = document.createElement("div");
  el.textContent = msg;
  el.style.position = "fixed";
  el.style.left = "50%";
  el.style.bottom = "18px";
  el.style.transform = "translateX(-50%)";
  el.style.background = "rgba(255,255,255,.92)";
  el.style.border = "1px solid rgba(47,122,62,.35)";
  el.style.borderRadius = "14px";
  el.style.padding = "10px 12px";
  el.style.boxShadow = "0 14px 30px rgba(0,0,0,.12)";
  el.style.zIndex = "9999";
  el.style.fontWeight = "800";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1400);
}

/* ---------------- JSON export/import ---------------- */

function exportTopicsJson(){
  const payload = {
    version: 1,
    updatedAt: new Date().toISOString().slice(0, 10),
    topics: TOPICS
      .slice()
      .sort((a,b) =>
        (a.collectie || "").localeCompare(b.collectie || "", "nl") ||
        (a.text || "").localeCompare(b.text || "", "nl")
      )
      .map(t => ({
        id: t.id || cryptoId(),
        text: t.text,
        collectie: t.collectie,
        categorie: t.categorie || ""
      }))
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "topics.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);

  toast("topics.json gedownload");
}

async function importTopicsJson(){
  const file = importJsonInput.files?.[0];
  if(!file) return;

  try{
    const text = await file.text();
    const data = JSON.parse(text);
    if(!data || !Array.isArray(data.topics)) throw new Error("JSON heeft geen 'topics' array");

    TOPICS = data.topics
      .filter(t => t && t.text && t.collectie)
      .map(t => ({
        id: t.id || cryptoId(),
        text: String(t.text).trim(),
        collectie: String(t.collectie).trim(),
        categorie: t.categorie ? String(t.categorie).trim() : ""
      }));

    buildFilters();
    render();
    toast(`Geïmporteerd: ${TOPICS.length} topics`);
  }catch(e){
    alert("Import mislukt: " + (e?.message || "Onbekende fout"));
  }finally{
    importJsonInput.value = "";
  }
}

/* ---------------- Helpers ---------------- */

function unique(arr){ return Array.from(new Set(arr)); }
function nlSort(a,b){ return a.localeCompare(b, "nl"); }
function truncate(s, n){ return (s.length <= n) ? s : (s.slice(0, n-1) + "…"); }

function escapeHtml(str){
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cryptoId(){
  if(window.crypto?.randomUUID) return crypto.randomUUID();
  return "id_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}
