// app.js
const grid = document.getElementById("topicsGrid");
const pagerBottom = document.getElementById("pagerBottom");
const toastEl = document.getElementById("toast");

const randomBtn = document.getElementById("randomBtn");

// Fullscreen
const fullscreen = document.getElementById("fullscreen");
const fsClose = document.getElementById("fsClose");
const fsQuestion = document.getElementById("fsQuestion");
const fsCategory = document.getElementById("fsCategory");
const fsPrev = document.getElementById("fsPrev");
const fsNext = document.getElementById("fsNext");
const fsCopy = document.getElementById("fsCopy");
const fsSave = document.getElementById("fsSave");
const fsTag = document.getElementById("fsTag");

// Modal
const cardModal     = document.getElementById("cardModal");
const modalOverlay  = document.getElementById("modalOverlay");
const modalClose    = document.getElementById("modalClose");
const btnCopy       = document.getElementById("btnCopy");
const btnSave       = document.getElementById("btnSave");
const btnBack       = document.getElementById("btnBack");
const modalCard     = document.getElementById("modalCard");
const modalTitle    = document.getElementById("modalTitle");
const modalCategory = document.getElementById("modalCategory");
const modalHint     = document.getElementById("modalHint");

// State
let TOPICS = [];
let page = 1;
const PER_PAGE = 12;

let currentModalTopic = null;
let fsIndex = 0;

// -------------------------
// Helpers
// -------------------------
function normTopic(t){
  const question = (t.question ?? t.vraag ?? "").toString().trim();
  const category = (t.category ?? t.categorie ?? "").toString().trim();
  return { question, category };
}

function showToast(msg){
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.remove("show"), 1400);
}

function scrollToTopSmooth(){
  // for your "Volgende" paging request
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function topicText(t){
  const q = t.question || "";
  const c = t.category || "";
  return c ? `${q}\n(${c})` : q;
}

async function copyText(text){
  try{
    await navigator.clipboard.writeText(text);
    return true;
  }catch(e){
    // fallback
    try{
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    }catch(_){
      return false;
    }
  }
}

// -------------------------
// Rendering (Overview)
// -------------------------
function render(){
  const totalPages = Math.max(1, Math.ceil(TOPICS.length / PER_PAGE));
  page = Math.min(Math.max(1, page), totalPages);

  const start = (page - 1) * PER_PAGE;
  const slice = TOPICS.slice(start, start + PER_PAGE);

  grid.innerHTML = "";
  slice.forEach((t) => {
    const card = document.createElement("article");
    card.className = "topicCard";
    card.innerHTML = `
      <div class="topicTitle">${escapeHtml(t.question)}</div>
      <div class="topicCategory">
        <span class="pill">${escapeHtml(t.category || "General")}</span>
        <span aria-hidden="true">↗</span>
      </div>
    `;
    card.addEventListener("click", () => openTopicModal(t));
    grid.appendChild(card);
  });

  pagerBottom.innerHTML = "";
  const prev = document.createElement("button");
  prev.textContent = "Vorige";
  prev.disabled = page <= 1;
  prev.addEventListener("click", () => {
    page--;
    render();
    scrollToTopSmooth();
  });

  const info = document.createElement("div");
  info.className = "pageInfo";
  info.textContent = `${page} / ${totalPages}`;

  const next = document.createElement("button");
  next.textContent = "Volgende";
  next.disabled = page >= totalPages;
  next.addEventListener("click", () => {
    page++;
    render();
    scrollToTopSmooth();
  });

  pagerBottom.appendChild(prev);
  pagerBottom.appendChild(info);
  pagerBottom.appendChild(next);
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// -------------------------
// Modal
// -------------------------
function openTopicModal(topic){
  currentModalTopic = topic;

  modalTitle.textContent = topic.question || "—";
  modalCategory.textContent = topic.category || "";

  modalHint.textContent = "";
  cardModal.hidden = false;
  cardModal.setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";
  modalClose.focus();
}

function closeTopicModal(){
  cardModal.hidden = true;
  cardModal.setAttribute("aria-hidden","true");
  document.body.style.overflow = "";
  currentModalTopic = null;
}

async function copyModalText(){
  if(!currentModalTopic) return;
  const ok = await copyText(topicText(currentModalTopic));
  modalHint.textContent = ok ? "Gekopieerd ✅" : "Kopiëren mislukt 😭";
  if(ok) showToast("Copied!");
}

async function saveElementAsPng(el, filenameBase){
  if(!window.html2canvas) {
    showToast("html2canvas ontbreekt");
    return false;
  }
  const canvas = await html2canvas(el, {
    backgroundColor: null,
    scale: 2
  });
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;

  const safe = (filenameBase || "tea-topic")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  a.download = `${safe || "tea-topic"}.png`;
  a.click();
  return true;
}

async function saveModalAsImage(){
  if(!currentModalTopic) return;
  modalHint.textContent = "Opslaan…";
  const ok = await saveElementAsPng(modalCard, currentModalTopic.question);
  modalHint.textContent = ok ? "Opgeslagen ✅" : "Opslaan mislukt 😭";
  if(ok) showToast("Saved!");
}

modalOverlay.addEventListener("click", closeTopicModal);
modalClose.addEventListener("click", closeTopicModal);
btnBack.addEventListener("click", closeTopicModal);
btnCopy.addEventListener("click", copyModalText);
btnSave.addEventListener("click", saveModalAsImage);

// -------------------------
// Fullscreen Random Mode
// -------------------------
function openFullscreenAt(index){
  if(!TOPICS.length) return;
  fsIndex = ((index % TOPICS.length) + TOPICS.length) % TOPICS.length;

  fullscreen.hidden = false;
  fullscreen.setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";
  renderFullscreenCard();
}

function closeFullscreen(){
  fullscreen.hidden = true;
  fullscreen.setAttribute("aria-hidden","true");
  document.body.style.overflow = "";
}

function renderFullscreenCard(){
  const t = TOPICS[fsIndex];
  fsQuestion.textContent = t.question || "—";
  fsCategory.textContent = t.category || "";
}

function fsPrevCard(){
  fsIndex = (fsIndex - 1 + TOPICS.length) % TOPICS.length;
  renderFullscreenCard();
}

function fsNextCard(){
  fsIndex = (fsIndex + 1) % TOPICS.length;
  renderFullscreenCard();
}

randomBtn.addEventListener("click", () => {
  const r = Math.floor(Math.random() * Math.max(1, TOPICS.length));
  openFullscreenAt(r);
});

fsClose.addEventListener("click", closeFullscreen);
fsPrev.addEventListener("click", fsPrevCard);
fsNext.addEventListener("click", fsNextCard);

fsCopy.addEventListener("click", async () => {
  const t = TOPICS[fsIndex];
  const ok = await copyText(topicText(t));
  showToast(ok ? "Copied!" : "Copy failed");
});

fsSave.addEventListener("click", async () => {
  const t = TOPICS[fsIndex];
  showToast("Saving…");
  const ok = await saveElementAsPng(fsTag, t.question);
  showToast(ok ? "Saved!" : "Save failed");
});

// Keyboard
document.addEventListener("keydown", (e) => {
  // Esc closes modal first, then fullscreen
  if(e.key === "Escape"){
    if(!cardModal.hidden){ closeTopicModal(); return; }
    if(!fullscreen.hidden){ closeFullscreen(); return; }
  }

  // Fullscreen nav with arrows / space
  if(!fullscreen.hidden){
    if(e.key === "ArrowLeft") fsPrevCard();
    if(e.key === "ArrowRight" || e.key === " " ) fsNextCard();
  }
});

// -------------------------
// Load topics
// -------------------------
async function loadTopics(){
  try{
    const res = await fetch("topics.json", { cache: "no-store" });
    if(!res.ok) throw new Error("topics.json not found");
    const data = await res.json();

    const list = Array.isArray(data) ? data
      : Array.isArray(data.topics) ? data.topics
      : Array.isArray(data.items) ? data.items
      : [];

    TOPICS = list.map(normTopic).filter(t => t.question.length);

    if(!TOPICS.length){
      TOPICS = [{ question:"Geen topics gevonden in topics.json", category:"Error" }];
    }

    page = 1;
    render();
  }catch(err){
    TOPICS = [{ question:"Kon topics.json niet laden", category:"Error" }];
    render();
  }
}

loadTopics();
