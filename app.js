
/* =========================================================
   Tea Topics — data + UI
   - Zoeken
   - Filter collectie + categorie
   - Random topic (modal)
   - Kopiëren bij klik
   - OCR (Tesseract.js) NL (verbeterd: preprocessing + settings)
   - Export topics.json
   - Import topics.json
   - Auto-load topics.json uit repo (als aanwezig)
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

// JSON export/import
const exportJsonBtn = $("#exportJsonBtn");
const importJsonInput = $("#importJsonInput");

/** ---------------------------------------------------------
 *  DATA MODEL
 *  topic: { id, text, collectie, categorie }
 * -------------------------------------------------------- */
let TOPICS = [
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

  // Probeer automatisch topics.json te laden uit je repo
  loadTopicsFromRepo();

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

  scrollToOcrBtn.addEventListener("click", () => {
    ocrPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  startOcrBtn.addEventListener("click", runOcr);
  addOcrToListBtn.addEventListener("click", addOcrTopicsToList);

  exportJsonBtn.addEventListener("click", exportTopicsJson);
  importJsonInput.addEventListener("change", importTopicsJson);

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

/* =========================================================
   OCR (verbeterd)
   - Preprocess: crop margins, upscale, grayscale, contrast, threshold
   - Tesseract config: DPI/PSM/interword spaces
   - Taal: nld + eng (helpt vaak bij foute tekens)
========================================================= */

async function runOcr(){
  const files = ocrFiles.files;
  if(!files || files.length === 0){
    ocrStatus.textContent = "Kies eerst één of meerdere afbeeldingen.";
    return;
  }

  addOcrToListBtn.disabled = true;
  ocrText.value = "";
  ocrStatus.textContent = "OCR gestart… (verbeterde herkenning met beeldbewerking)";

  let combined = "";
  for(let i=0; i<files.length; i++){
    const file = files[i];

    // 1) Lees file -> image bitmap
    ocrStatus.textContent = `Beeld voorbereiden: ${i+1}/${files.length} — ${file.name}`;
    const preprocessed = await preprocessImageToDataURL(file, {
      // posters: vaak veel marge en lichte achtergrond
      crop: 0.06,          // 6% rand eraf (aanpassen als nodig)
      scale: 2.5,          // upscalen helpt enorm
      contrast: 1.35,      // >1 = meer contrast
      threshold: 175,      // 0-255, hoger = meer wit achtergrond
      sharpen: true        // kleine extra scherpte
    });

    // 2) OCR op de preprocessed dataURL
    const label = `${i+1}/${files.length} — ${file.name}`;
    const text = await recognizeWithTesseract(preprocessed, label);

    combined += `\n\n--- ${file.name} ---\n${text}`;
  }

  ocrText.value = combined.trim();
  ocrStatus.textContent = "OCR klaar! Check de tekst en corrigeer waar nodig. Daarna kun je toevoegen.";
  addOcrToListBtn.disabled = false;
}

async function recognizeWithTesseract(imageInput, label){
  const lang = "nld+eng"; // NL first, maar ENG helpt vaak bij rare tekens/quotes
  const { data } = await Tesseract.recognize(imageInput, lang, {
    logger: (m) => {
      if(m.status === "recognizing text"){
        const pct = Math.round((m.progress || 0) * 100);
        ocrStatus.textContent = `OCR bezig: ${label} (${pct}%)`;
      }
    }
  });

  // Extra settings via data? Tesseract.js v5 ondersteunt setParameters via worker beter,
  // maar dit werkt al veel beter door preprocessing alleen.
  // We doen nog wat “cleanups”:
  return (data.text || "")
    .replace(/\u00A0/g, " ")
    .replace(/[|]/g, "I")
    .trim();
}

async function preprocessImageToDataURL(file, opts){
  const {
    crop = 0.0,
    scale = 2.0,
    contrast = 1.2,
    threshold = 170,
    sharpen = false
  } = opts || {};

  const img = await fileToImage(file);

  // crop margins
  const cw = Math.max(10, Math.floor(img.naturalWidth * (1 - crop*2)));
  const ch = Math.max(10, Math.floor(img.naturalHeight * (1 - crop*2)));
  const sx = Math.floor(img.naturalWidth * crop);
  const sy = Math.floor(img.naturalHeight * crop);

  // upscale canvas
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(cw * scale);
  canvas.height = Math.floor(ch * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  // draw with smoothing (upscale)
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, cw, ch, 0, 0, canvas.width, canvas.height);

  // pixel ops
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;

  // grayscale + contrast + threshold
  // contrast formula: new = (x-128)*c + 128
  for(let i=0; i<d.length; i+=4){
    const r = d[i], g = d[i+1], b = d[i+2];
    // luminance
    let y = (0.2126*r + 0.7152*g + 0.0722*b);

    // contrast
    y = (y - 128) * contrast + 128;

    // threshold (binarize)
    const v = y > threshold ? 255 : 0;

    d[i] = d[i+1] = d[i+2] = v;
    d[i+3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);

  if(sharpen){
    // simpele 3x3 sharpen kernel
    const k = [
      0, -1,  0,
      -1, 5, -1,
      0, -1,  0
    ];
    applyConvolution(ctx, canvas.width, canvas.height, k, 1, 0);
  }

  return canvas.toDataURL("image/png");
}

function applyConvolution(ctx, w, h, kernel, divisor = 1, offset = 0){
  const src = ctx.getImageData(0, 0, w, h);
  const dst = ctx.createImageData(w, h);

  const s = src.data;
  const d = dst.data;

  const kw = 3, kh = 3;
  const half = 1;

  for(let y=0; y<h; y++){
    for(let x=0; x<w; x++){
      let sum = 0;

      for(let ky=0; ky<kh; ky++){
        for(let kx=0; kx<kw; kx++){
          const px = x + kx - half;
          const py = y + ky - half;
          if(px < 0 || px >= w || py < 0 || py >= h) continue;

          const si = (py*w + px) * 4;
          const val = s[si]; // grayscale => pak rood kanaal
          sum += val * kernel[ky*kw + kx];
        }
      }

      const v = Math.max(0, Math.min(255, (sum / divisor) + offset));
      const di = (y*w + x) * 4;
      d[di] = d[di+1] = d[di+2] = v;
      d[di+3] = 255;
    }
  }

  ctx.putImageData(dst, 0, 0);
}

function fileToImage(file){
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/* ---------------- OCR -> topics toevoegen ---------------- */

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

function parseTopicsFromText(raw){
  const lines = raw
    .split(/\r?\n/g)
    .map(s => s.trim())
    .filter(Boolean);

  const candidates = [];

  for(const line of lines){
    if(line.length < 6) continue;
    if(line.startsWith("---")) continue;

    const cleaned = line
      .replace(/\s{2,}/g, " ")
      .replace(/^[•\-\–\—]+/g, "")
      .replace(/\s+\?$/, "?")
      .trim();

    // Vraagherkenning NL
    const startsLikeQuestion =
      /^(wat|wie|waar|wanneer|waarom|hoe|welk|welke|in welk|in welke|met wie|zou je|ben je|heb je)\b/i.test(cleaned);

    if(cleaned.endsWith("?") || startsLikeQuestion){
      const finalText = cleaned.endsWith("?") ? cleaned : (cleaned + "?");
      candidates.push(titleCaseFix(finalText));
    }
  }

  return unique(candidates.map(s => s.trim())).filter(Boolean);
}

/* ---------------- JSON: autoload + export/import ---------------- */

async function loadTopicsFromRepo(){
  try{
    const res = await fetch(`topics.json?cb=${Date.now()}`, { cache: "no-store" });
    if(!res.ok) throw new Error("topics.json niet gevonden");
    const data = await res.json();

    if(!data || !Array.isArray(data.topics)) throw new Error("topics.json heeft een verkeerd formaat");

    const loaded = data.topics
      .filter(t => t && t.text && t.collectie)
      .map(t => ({
        id: t.id || cryptoId(),
        text: String(t.text).trim(),
        collectie: String(t.collectie).trim(),
        categorie: (t.categorie ? String(t.categorie).trim() : "")
      }));

    if(loaded.length > 0){
      TOPICS = loaded;
      totalCountEl.textContent = TOPICS.length.toString();
      buildFilters();
      render();
      toast(`topics.json geladen (${TOPICS.length})`);
    } else {
      totalCountEl.textContent = TOPICS.length.toString();
      buildFilters();
      render();
    }
  }catch{
    totalCountEl.textContent = TOPICS.length.toString();
    buildFilters();
    render();
  }
}

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

    const loaded = data.topics
      .filter(t => t && t.text && t.collectie)
      .map(t => ({
        id: t.id || cryptoId(),
        text: String(t.text).trim(),
        collectie: String(t.collectie).trim(),
        categorie: (t.categorie ? String(t.categorie).trim() : "")
      }));

    if(loaded.length === 0) throw new Error("Geen topics gevonden in het bestand");

    TOPICS = loaded;
    totalCountEl.textContent = TOPICS.length.toString();
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
  return s.replace(/\s{2,}/g, " ").trim();
}

function cryptoId(){
  if(window.crypto?.randomUUID) return crypto.randomUUID();
  return "id_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}
