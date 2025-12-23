/* app.js — Tea Topics (cleaned)
   ✅ Klik op grid-kaart opent fullscreen met DIE topic (niet random)
   ✅ Overzicht: touwtjes korter (CSS scoped), meer spacing
   ✅ Geen blue selection highlight / geen storende hover anim
   ✅ LibreTranslate auto-translate op basis van browsertaal (zonder key) + cache
*/

const els = {
  grid: document.getElementById("topicsGrid"),
  pagerBottom: document.getElementById("pagerBottom"),

  fs: document.getElementById("fullscreen"),
  fsClose: document.getElementById("fsClose"),
  fsQ: document.getElementById("fsQuestion"),
  fsPrev: document.getElementById("fsPrev"),
  fsNext: document.getElementById("fsNext"),
  fsTag: document.getElementById("fsTag"),
  fsBrandTitle: document.getElementById("fsBrandTitle"),

  openFsTitle: document.getElementById("openFsTitle"),
};

let TOPICS = [];       // base topics (from json) [{text, category}]
let VIEW = [];         // topics shown in UI (maybe translated) [{text, category}]
let page = 1;
const PAGE_SIZE = 12;

let fsOrder = [];      // array of indices into VIEW
let fsIndex = 0;

const LT_BASE = "https://translate.flossboxin.org.in"; // public instance (may change)
const LT_TRANSLATE = `${LT_BASE}/translate`;
const LT_LANGS = `${LT_BASE}/languages`;

function norm(s){ return (s||"").toString().trim().replace(/\s+/g," "); }

function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function scrollToTop(){
  window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
}

/* ✅ Force restart swing animation so it never “randomly” stops */
function restartSwing(el){
  if(!el) return;
  el.classList.remove("swing");
  void el.offsetWidth;
  el.classList.add("swing");
}

function restartAllGridSwing(){
  const cards = els.grid.querySelectorAll(".hangTag");
  cards.forEach(restartSwing);
}

/* -------------------------
   Language helpers
------------------------- */
function detectLang(){
  const raw = (navigator.language || "nl").toLowerCase();
  const short = raw.split("-")[0];
  return short || "nl";
}

async function fetchSupportedLangs(){
  // Not required, but helps avoid calling unsupported target codes.
  try{
    const res = await fetch(LT_LANGS, { cache:"no-store" });
    if(!res.ok) return null;
    const data = await res.json();
    if(!Array.isArray(data)) return null;
    return new Set(data.map(x => (x && x.code) ? String(x.code).toLowerCase() : "").filter(Boolean));
  }catch{
    return null;
  }
}

function cacheKeyFor(lang, topicsLen){
  return `tt_translated_v1_${lang}_${topicsLen}`;
}

function loadCachedTranslation(lang, topicsLen){
  try{
    const raw = localStorage.getItem(cacheKeyFor(lang, topicsLen));
    if(!raw) return null;
    const parsed = JSON.parse(raw);
    if(!Array.isArray(parsed)) return null;
    return parsed;
  }catch{
    return null;
  }
}

function saveCachedTranslation(lang, topicsLen, translated){
  try{
    localStorage.setItem(cacheKeyFor(lang, topicsLen), JSON.stringify(translated));
  }catch{}
}

async function translateBatch(texts, target, source="nl"){
  // LibreTranslate supports q as array on many instances, but we’ll be safe:
  // chunk + join/translate per text with batch calls.
  const out = new Array(texts.length);
  const CHUNK = 18;

  for(let i=0;i<texts.length;i+=CHUNK){
    const slice = texts.slice(i, i+CHUNK);

    const body = {
      q: slice,
      source,
      target,
      format: "text"
    };

    const res = await fetch(LT_TRANSLATE, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify(body)
    });

    if(!res.ok) throw new Error("Translate failed");

    const data = await res.json();

    // Possible shapes:
    // 1) {translatedText:"..."} for single
    // 2) [{translatedText:"..."}, ...] for array
    // 3) {translatedText:["...","..."]} (some proxies)
    let translatedArr = null;

    if(Array.isArray(data)){
      translatedArr = data.map(x => (x && x.translatedText) ? String(x.translatedText) : "");
    }else if(data && Array.isArray(data.translatedText)){
      translatedArr = data.translatedText.map(x => String(x || ""));
    }else if(data && typeof data.translatedText === "string" && slice.length === 1){
      translatedArr = [data.translatedText];
    }

    if(!translatedArr || translatedArr.length !== slice.length){
      // fallback: no good response shape
      throw new Error("Translate shape mismatch");
    }

    for(let k=0;k<translatedArr.length;k++){
      out[i+k] = translatedArr[k];
    }
  }

  return out;
}

/* -------------------------
   Data loading
------------------------- */
async function loadTopics(){
  const res = await fetch("topics.json", { cache:"no-store" });
  if(!res.ok) throw new Error("Kan topics.json niet laden.");
  const data = await res.json();

  let list = [];
  if(Array.isArray(data.topics)){
    list = data.topics.map(x => {
      if(typeof x === "string") return { text: norm(x), category: "" };
      return { text: norm(x.text || ""), category: norm(x.category || x.cat || "") };
    });
  }else if(typeof data.topicsRaw === "string"){
    list = data.topicsRaw.split(/\r?\n/).map(t => ({ text: norm(t), category:"" }));
  }

  list = list
    .map(o => ({
      text: (o.text.includes("?") ? (o.text.endsWith("?") ? o.text : o.text + "?") : o.text),
      category: o.category || ""
    }))
    .filter(o => o.text && o.text.includes("?") && o.text.length >= 10);

  const seen = new Set();
  TOPICS = list.filter(o => {
    const k = o.text.toLowerCase();
    if(seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // Default view is NL
  VIEW = TOPICS.slice();

  // ✅ auto translate (LibreTranslate) based on browser language
  const lang = detectLang();
  if(lang && lang !== "nl"){
    const cached = loadCachedTranslation(lang, TOPICS.length);
    if(cached && cached.length === TOPICS.length){
      VIEW = cached;
    }else{
      try{
        const supported = await fetchSupportedLangs(); // may be null
        const safeTarget = supported ? (supported.has(lang) ? lang : "en") : lang;

        const texts = TOPICS.map(t => t.text);
        const translatedTexts = await translateBatch(texts, safeTarget, "nl");

        VIEW = TOPICS.map((t, i) => ({
          ...t,
          text: norm(translatedTexts[i] || t.text)
        }));

        saveCachedTranslation(lang, TOPICS.length, VIEW);
      }catch{
        // If it fails (CORS / down / rate-limit), just keep NL.
        VIEW = TOPICS.slice();
      }
    }
  }

  // fullscreen order init (random start)
  fsOrder = shuffle([...Array(VIEW.length).keys()]);
  fsIndex = Math.floor(Math.random() * Math.max(1, fsOrder.length));

  renderPage(true);
}

function maxPage(){
  return Math.max(1, Math.ceil(VIEW.length / PAGE_SIZE));
}

function clampPage(){
  const m = maxPage();
  if(page < 1) page = 1;
  if(page > m) page = m;
}

/* -------------------------
   Pager + progress pill
------------------------- */
function mkBtn(label, id){
  const b = document.createElement("button");
  b.type = "button";
  b.className = "pbtn";
  b.id = id;
  b.textContent = label;
  return b;
}

function buildPagerBottom(){
  els.pagerBottom.innerHTML = "";

  const prev = mkBtn("← Vorige", "botPrev");
  const rand = mkBtn("🎲 Willekeurige Tea Topic", "botRand");
  rand.classList.add("random");
  const next = mkBtn("Volgende →", "botNext");

  els.pagerBottom.appendChild(prev);
  els.pagerBottom.appendChild(rand);
  els.pagerBottom.appendChild(next);

  const prog = document.createElement("div");
  prog.className = "pagerProgress";
  prog.innerHTML = `
    <div>
      <div class="pagerTrack" aria-hidden="true">
        <div class="pagerPill" id="pagerPill"></div>
      </div>
      <div class="pagerLabel" id="pagerLabel"></div>
    </div>
  `;
  els.pagerBottom.appendChild(prog);

  prev.addEventListener("click", ()=>{
    if(page > 1){
      page--;
      renderPage();
      scrollToTop();
    }
  });

  next.addEventListener("click", ()=>{
    if(page < maxPage()){
      page++;
      renderPage();
      scrollToTop();
    }
  });

  rand.addEventListener("click", ()=>{
    fsOrder = shuffle([...Array(VIEW.length).keys()]);
    fsIndex = 0;
    openFullscreen();
  });
}

function updatePagerDisabled(){
  const m = maxPage();
  const prev = document.getElementById("botPrev");
  const next = document.getElementById("botNext");
  if(prev) prev.disabled = (page <= 1);
  if(next) next.disabled = (page >= m);
}

function updateProgressPill(){
  const m = maxPage();
  const pill = document.getElementById("pagerPill");
  const label = document.getElementById("pagerLabel");
  if(!pill || !label) return;

  const pillW = Math.max(10, 100 / m);
  const maxLeft = 100 - pillW;

  const t = (m <= 1) ? 0 : (page - 1) / (m - 1);
  const left = maxLeft * t;

  pill.style.width = `${pillW}%`;
  pill.style.left = `${left}%`;

  label.textContent = `Pagina ${page} / ${m}`;
}

function renderPage(rebuild=false){
  clampPage();
  if(rebuild) buildPagerBottom();
  updatePagerDisabled();
  updateProgressPill();

  const start = (page-1) * PAGE_SIZE;
  const idxList = [];
  for(let i=0;i<PAGE_SIZE;i++){
    const idx = start + i;
    if(idx >= VIEW.length) break;
    idxList.push(idx);
  }
  renderGrid(idxList);

  requestAnimationFrame(restartAllGridSwing);
}

/* -------------------------
   Grid
------------------------- */
function openFullscreenFromTopicIndex(topicIdx){
  // ✅ start fullscreen on the clicked topic, then continue random order after it
  const rest = shuffle([...Array(VIEW.length).keys()].filter(i => i !== topicIdx));
  fsOrder = [topicIdx, ...rest];
  fsIndex = 0;
  openFullscreen();
}

function renderGrid(idxList){
  els.grid.innerHTML = "";
  const frag = document.createDocumentFragment();

  for(const topicIdx of idxList){
    const item = VIEW[topicIdx];

    const wrap = document.createElement("div");
    wrap.className = "hangWrap";

    const card = document.createElement("article");
    card.className = "hangTag topicCard swing";
    card.tabIndex = 0;

    const inner = document.createElement("div");
    inner.className = "tagInner";

    const p = document.createElement("p");
    p.className = "q";
    p.textContent = item.text;

    inner.appendChild(p);
    card.appendChild(inner);
    wrap.appendChild(card);

    // ✅ Klik op kaart = fullscreen met exact die topic
    const go = ()=>{
      openFullscreenFromTopicIndex(topicIdx);
    };

    card.addEventListener("click", go);
    card.addEventListener("keydown", (e)=>{
      if(e.key==="Enter" || e.key===" "){
        e.preventDefault();
        go();
      }
    });

    frag.appendChild(wrap);
  }

  els.grid.appendChild(frag);
}

/* ---------- Fullscreen ---------- */
function openFullscreen(){
  els.fs.hidden = false;
  els.fs.setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";
  renderFullscreenCurrent();
  requestAnimationFrame(()=>restartSwing(els.fsTag));
}

function closeFullscreen(){
  els.fs.hidden = true;
  els.fs.setAttribute("aria-hidden","true");
  document.body.style.overflow = "";
}

function renderFullscreenCurrent(){
  if(!VIEW.length){
    els.fsQ.textContent="Geen topics…";
    return;
  }
  const idx = fsOrder[fsIndex];
  els.fsQ.textContent = VIEW[idx].text;
  requestAnimationFrame(()=>restartSwing(els.fsTag));
}

function fsNext(){
  if(!VIEW.length) return;
  fsIndex = (fsIndex + 1) % fsOrder.length;
  renderFullscreenCurrent();
}

function fsPrev(){
  if(!VIEW.length) return;
  fsIndex = (fsIndex - 1 + fsOrder.length) % fsOrder.length;
  renderFullscreenCurrent();
}

function wireFullscreen(){
  els.fsClose.addEventListener("click", (e)=>{
    e.preventDefault();
    e.stopPropagation();
    closeFullscreen();
  }, true);

  els.fsNext.addEventListener("click",(e)=>{ e.preventDefault(); e.stopPropagation(); fsNext(); });
  els.fsPrev.addEventListener("click",(e)=>{ e.preventDefault(); e.stopPropagation(); fsPrev(); });

  // Klik op de kaart = volgende
  els.fsTag.addEventListener("click", (e)=>{
    e.preventDefault();
    e.stopPropagation();
    fsNext();
  });

  // Titel bovenaan (main) opent fullscreen random
  const openFromTitle = (e)=>{
    e.preventDefault();
    e.stopPropagation();
    if(!els.fs.hidden){
      fsNext(); // als hij al open is: volgende (nice)
      return;
    }
    fsOrder = shuffle([...Array(VIEW.length).keys()]);
    fsIndex = 0;
    openFullscreen();
  };

  els.openFsTitle?.addEventListener("click", openFromTitle);
  els.openFsTitle?.addEventListener("keydown", (e)=>{
    if(e.key==="Enter" || e.key===" "){
      openFromTitle(e);
    }
  });

  // Fullscreen titel ook klikbaar = volgende
  els.fsBrandTitle?.addEventListener("click", (e)=>{
    e.preventDefault();
    e.stopPropagation();
    fsNext();
  });
  els.fsBrandTitle?.addEventListener("keydown", (e)=>{
    if(e.key==="Enter" || e.key===" "){
      e.preventDefault();
      fsNext();
    }
  });

  // Keyboard in fullscreen
  window.addEventListener("keydown", (e)=>{
    if(els.fs.hidden) return;

    if(e.key === "Escape"){
      e.preventDefault();
      closeFullscreen();
      return;
    }
    if(e.key === "ArrowRight" || e.key === " " || e.key === "Enter"){
      e.preventDefault();
      fsNext();
      return;
    }
    if(e.key === "ArrowLeft"){
      e.preventDefault();
      fsPrev();
      return;
    }
  }, { passive:false });
}

(async function init(){
  wireFullscreen();
  try{
    await loadTopics();
  }catch(err){
    console.error(err);
    els.grid.innerHTML = `<p style="opacity:.7;font-weight:900">Kan topics niet laden 😅</p>`;
  }
})();
