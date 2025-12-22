/* =========================================================
   Tea Topics — data + UI
   - Zoeken
   - Filter collectie + categorie
   - Random topic
   - Kopiëren bij klik
   - OCR (Tesseract.js) NL -> parser -> toevoegen aan collectie
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
const ocrFiles = $("#ocrFiles");
const ocrText = $("#ocrText");
const ocrStatus = $("#ocrStatus");
const startOcrBtn = $("#startOcrBtn");
const addOcrToListBtn = $("#addOcrToListBtn");
const ocrCollectionName = $("#ocrCollectionName");

/** ---------------------------------------------------------
 *  DATA MODEL
 *  topic: { id, text, collectie, categorie }
 *  - collectie = poster/collectie naam
 *  - categorie = optioneel (kan jij zelf later uitbreiden)
 * -------------------------------------------------------- */
let TOPICS = [
  // Voorbeeld items (zodat de site meteen werkt). Vervang / vul aan met jouw OCR.
  { id: cryptoId(), text: "Wat is jouw favoriete sprookje?", collectie: "Voorbeeldcollectie", categorie: "Persoonlijk" },
  { id: cryptoId(), text: "Wie inspireert jou om een beter mens te zijn?", collectie: "Voorbeeldcollectie", categorie: "Reflectie" },
  { id: cryptoId(), text: "Hoe ziet de wereld er uit over 10 jaar?", collectie: "Voorbeeldcollectie", categorie: "Toekomst" },
  { id: cryptoId(), text: "Wat is jouw favoriete spel?", collectie: "Voorbeeldcollectie", categorie: "Fun" },
];

/** UI state */
const state = {
  query: "",
  collectie: "ALLE",
  categorie: "ALLE",
};

init();

function init(){
  totalCountEl.textContent = TOPICS.length.toString();
  buildFilters();
  render();

  searchInput.addEventListener("input", () => {
    state.query = searchInput.value.trim().toLowerCase();
    render();
  });

  collectionSelect.addEventListener("change", () => {
    state.collectie = collectionSelect.value;
    // categorie dropdown opnieuw opbouwen op basis van collectie-filter
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

  scrollToOcrBtn.addEventListener("click", () => {
    ocrPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  startOcrBtn.addEventListener("click", runOcr);
  addOcrToListBtn.addEventListener("click", addOcrTopicsToList);

  // Escape sluit modal
  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape" && randomModal.open) randomModal.close();
  });
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

  categorySelect.value = cats.includes(state.categorie) ? state.categorie : "ALLE";
  state.categorie = categorySelect.value;
}

/* ---------------- Rendering ---------------- */

function render(){
  const filtered = getFilteredTopics();
  shownCountEl.textContent = filtered.length.toString();
  totalCountEl.textContent = TOPICS.length.toString();

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
    // fallback
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

/* ---------------- OCR ---------------- */

async function runOcr(){
  const files = ocrFiles.files;
  if(!files || files.length === 0){
    ocrStatus.textContent = "Kies eerst één of meerdere afbeeldingen.";
    return;
  }

  addOcrToListBtn.disabled = true;
  ocrText.value = "";
  ocrStatus.textContent = "OCR gestart… (dit kan even duren, afhankelijk van je telefoon/pc).";

  let combined = "";
  for(let i=0; i<files.length; i++){
    const file = files[i];
    ocrStatus.textContent = `OCR bezig: ${i+1}/${files.length} — ${file.name}`;

    // Tesseract NL
    const { data } = await Tesseract.recognize(file, "nld", {
      logger: (m) => {
        if(m.status === "recognizing text"){
          const pct = Math.round((m.progress || 0) * 100);
          ocrStatus.textContent = `OCR bezig: ${i+1}/${files.length} — ${file.name} (${pct}%)`;
        }
      }
    });

    combined += "\n\n--- " + file.name + " ---\n" + (data.text || "");
  }

  ocrText.value = combined.trim();
  ocrStatus.textContent = "OCR klaar! Check de tekst en corrigeer waar nodig. Daarna kun je toevoegen.";
  addOcrToListBtn.disabled = false;
}

function addOcrTopicsToList(){
  const raw = (ocrText.value || "").trim();
  if(!raw){
    ocrStatus.textContent = "Geen tekst om te verwerken.";
    return;
  }

  const collectie = (ocrCollectionName.value || "").trim() || "Nieuwe collectie (OCR)";
  const extracted = parseTopicsFromText(raw);

  if(extracted.length === 0){
    ocrStatus.textContent = "Ik kon geen duidelijke vragen vinden. Tip: zorg dat je regels met ‘?’ in de tekst hebt.";
    return;
  }

  // voeg toe, dedupe op text+collectie
  let added = 0;
  for(const text of extracted){
    const exists = TOPICS.some(t => t.collectie === collectie && normalize(t.text) === normalize(text));
    if(!exists){
      TOPICS.push({ id: cryptoId(), text, collectie, categorie: "" });
      added++;
    }
  }

  totalCountEl.textContent = TOPICS.length.toString();
  buildFilters();
  render();

  ocrStatus.textContent = `Toegevoegd: ${added} topics aan collectie “${collectie}”.`;
  toast(`+${added} topics toegevoegd`);
}

/** Pak vooral regels die op '?' eindigen. */
function parseTopicsFromText(raw){
  const lines = raw
    .split(/\r?\n/g)
    .map(s => s.trim())
    .filter(Boolean);

  const candidates = [];

  for(const line of lines){
    // gooi rommel weg
    if(line.length < 6) continue;
    if(line.startsWith("---")) continue;

    // sommige OCRs plakken woorden: herstel beetje
    const cleaned = line
      .replace(/\s{2,}/g, " ")
      .replace(/^[•\-\–\—]+/g, "")
      .trim();

    // Topic heuristiek: vraagteken op einde of begin met vraagwoord
    const startsLikeQuestion = /^(wat|wie|waar|wanneer|waarom|hoe|welk|welke|in welk|in welke|met wie|zou je|ben je|heb je)\b/i.test(cleaned);

    if(cleaned.endsWith("?") || startsLikeQuestion){
      // forceer '?' als het ontbreekt maar wel vraag-achtig is
      const finalText = cleaned.endsWith("?") ? cleaned : (cleaned + "?");
      candidates.push(titleCaseFix(finalText));
    }
  }

  // dedupe
  return unique(candidates.map(s => s.trim())).filter(Boolean);
}

/* ---------------- Helpers ---------------- */

function unique(arr){
  return Array.from(new Set(arr));
}

function nlSort(a,b){
  return a.localeCompare(b, "nl");
}

function truncate(s, n){
  if(s.length <= n) return s;
  return s.slice(0, n-1) + "…";
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(s){
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[“”"]/g, '"')
    .replace(/[’']/g, "'")
    .trim();
}

function titleCaseFix(s){
  // laat het vooral zoals gebruiker het wil; fix alleen rare spaties
  return s.replace(/\s{2,}/g, " ").trim();
}

function cryptoId(){
  if(window.crypto?.randomUUID) return crypto.randomUUID();
  return "id_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}
