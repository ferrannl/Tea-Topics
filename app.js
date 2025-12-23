/* app.js — Tea Topics (cleaned)
   ✅ Klik op topic = fullscreen open met DIE topic (niet random)
   ✅ Overzicht touwtjes korter + spacing (CSS)
   ✅ Fullscreen nav blijft onderaan (CSS)
   ✅ LibreTranslate: auto taal + caching + fallback
*/

const els = {
  // grid + pager
  grid: document.getElementById("topicsGrid"),
  pagerBottom: document.getElementById("pagerBottom"),

  // fullscreen
  fs: document.getElementById("fullscreen"),
  fsClose: document.getElementById("fsClose"),
  fsQ: document.getElementById("fsQuestion"),
  fsPrev: document.getElementById("fsPrev"),
  fsNext: document.getElementById("fsNext"),
  fsTag: document.getElementById("fsTag"),
  fsBrandTitle: document.getElementById("fsBrandTitle"),

  // title click to open fullscreen
  openFsTitle: document.getElementById("openFsTitle"),
};

let TOPICS = [];          // [{ id, text, category }]
let DISPLAY_TOPICS = [];  // [{ id, text }] translated-or-original

let filtered = [];
let page = 1;
const PAGE_SIZE = 12;

// fullscreen order
let fsOrder = [];
let fsIndex = 0;

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
  void el.offsetWidth; // force reflow
  el.classList.add("swing");
}
function restartAllGridSwing(){
  const cards = els.grid.querySelectorAll(".hangTag");
  cards.forEach(restartSwing);
}

/* -------------------------
   LibreTranslate (no key)
------------------------- */

/**
 * Je kunt zelf overriden via:
 * localStorage.setItem("tt_lt_endpoint","https://jouw-server");
 */
const LT_ENDPOINTS = [
  "https://translate.flossboxin.org.in",
  // fallback examples (kunnen down zijn / CORS issues hebben):
  "https://libretranslate.de",
];

function getPreferredLang(){
  // 1) query param ?lang=xx
  try{
    const u = new URL(location.href);
    const q = (u.searchParams.get("lang")||"").trim();
    if(q) return q.toLowerCase();
  }catch(_){}

  // 2) localStorage
  const ls = (localStorage.getItem("tt_lang")||"").trim();
  if(ls) return ls.toLowerCase();

  // 3) browser
  const nav = (navigator.language || "nl").toLowerCase();
  return nav.split("-")[0] || "nl";
}

function isSameLang(a,b){
  return (a||"").toLowerCase().split("-")[0] === (b||"").toLowerCase().split("-")[0];
}

function getCacheKey(lang){
  return `tt_tr_cache_v1_${lang}`;
}

function loadCache(lang){
  try{
    const raw = localStorage.getItem(getCacheKey(lang));
    if(!raw) return {};
    const obj = JSON.parse(raw);
    return (obj && typeof obj === "object") ? obj : {};
  }catch(_){ return {}; }
}

function saveCache(lang, obj){
  try{
    localStorage.setItem(getCacheKey(lang), JSON.stringify(obj));
  }catch(_){}
}

async function pickLibreTranslateEndpoint(){
  const forced = (localStorage.getItem("tt_lt_endpoint") || "").trim();
  const list = forced ? [forced, ...LT_ENDPOINTS] : LT_ENDPOINTS.slice();

  for(const base of list){
    try{
      const res = await fetch(`${base.replace(/\/$/,"")}/languages`, { method:"GET" });
      if(res.ok) return base.replace(/\/$/,"");
    }catch(_){}
  }
  return null;
}

async function translateBatch(endpoint, texts, target){
  // LibreTranslate expects: q, source, target, format
  const body = {
    q: texts,
    source: "auto",
    target,
    format: "text",
  };

  const res = await fetch(`${endpoint}/translate`, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(body),
  });

  if(!res.ok){
    const msg = await res.text().catch(()=> "");
    throw new Error(`Translate failed (${res.status}): ${msg}`);
  }
  const data = await res.json();

  // data can be {translatedText:""} for single
  // or array of {translatedText:""} for batch depending on instance/version
  if(Array.isArray(data)){
    return data.map(x => (x && x.translatedText) ? String(x.translatedText) : "");
  }
  if(data && Array.isArray(data.translatedText)){
    return data.translatedText.map(String);
  }
  if(data && typeof data.translatedText === "string"){
    return [data.translatedText];
  }

  // some instances return {translations:[{translatedText:""}]}
  if(data && Array.isArray(data.translations)){
    return data.translations.map(x => (x && x.translatedText) ? String(x.translatedText) : "");
  }

  throw new Error("Unknown translate response");
}

async function translateAllTopicsIfNeeded(){
  const target = getPreferredLang();
  // store choice (so user can set localStorage manually)
  try{ localStorage.setItem("tt_lang", target); }catch(_){}

  // NL = origineel
  if(isSameLang(target,"nl")){
    DISPLAY_TOPICS = TOPICS.map(t => ({ id: t.id, text: t.text }));
    return;
  }

  // probeer endpoint
  const endpoint = await pickLibreTranslateEndpoint();
  if(!endpoint){
    DISPLAY_TOPICS = TOPICS.map(t => ({ id: t.id, text: t.text }));
    return;
  }

  const cache = loadCache(target);
  const out = new Array(TOPICS.length);

  // texts die nog niet in cache zitten
  const toTranslate = [];
  const idxMap = [];

  for(let i=0;i<TOPICS.length;i++){
    const key = TOPICS[i].text;
    if(cache[key]){
      out[i] = cache[key];
    }else{
      toTranslate.push(key);
      idxMap.push(i);
    }
  }

  // nothing to do
  if(!toTranslate.length){
    DISPLAY_TOPICS = TOPICS.map((t,i)=>({ id:t.id, text: out[i] || t.text }));
    return;
  }

  // chunked batches (vriendelijk voor instances)
  const CHUNK = 18;

  try{
    for(let start=0; start<toTranslate.length; start+=CHUNK){
      const part = toTranslate.slice(start, start+CHUNK);
      const translated = await translateBatch(endpoint, part, target);

      for(let j=0;j<part.length;j++){
        const original = part[j];
        const tr = (translated[j] || "").trim() || original;
        cache[original] = tr;
        const realIndex = idxMap[start+j];
        out[realIndex] = tr;
      }

      // save incrementally
      saveCache(target, cache);
    }

    DISPLAY_TOPICS = TOPICS.map((t,i)=>({ id:t.id, text: out[i] || t.text }));
  }catch(err){
    console.warn("LibreTranslate failed, fallback to NL:", err);
    DISPLAY_TOPICS = TOPICS.map(t => ({ id: t.id, text: t.text }));
  }
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
  const uniq = list.filter(o => {
    const k = o.text.toLowerCase();
    if(seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  TOPICS = uniq.map((o,i)=>({ id:i, text:o.text, category:o.category || "" }));
  filtered = TOPICS.slice();

  // init fullscreen order random
  fsOrder = shuffle([...Array(TOPICS.length).keys()]);
  fsIndex = Math.floor(Math.random() * Math.max(1, fsOrder.length));

  // translate (if needed)
  await translateAllTopicsIfNeeded();

  renderPage(true);
}

function maxPage(){
  return Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
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
    fsOrder = shuffle([...Array(TOPICS.length).keys()]);
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

  const pillW = Math.max(10, 100 / m); // %
  const maxLeft = 100 - pillW;

  const t = (m <= 1) ? 0 : (page - 1) / (m - 1); // 0..1
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
  const list = filtered.slice(start, start + PAGE_SIZE);
  renderGrid(list);

  requestAnimationFrame(restartAllGridSwing);
}

/* -------------------------
   Grid
------------------------- */
function displayTextById(id){
  const it = DISPLAY_TOPICS[id];
  return it ? it.text : (TOPICS[id]?.text || "");
}

function renderGrid(list){
  els.grid.innerHTML = "";
  const frag = document.createDocumentFragment();

  for(const item of list){
    const wrap = document.createElement("div");
    wrap.className = "hangWrap";

    const card = document.createElement("article");
    card.className = "hangTag topicCard swing";
    card.tabIndex = 0;

    const inner = document.createElement("div");
    inner.className = "tagInner";

    const p = document.createElement("p");
    p.className = "q";
    p.textContent = displayTextById(item.id);

    inner.appendChild(p);
    card.appendChild(inner);
    wrap.appendChild(card);

    // ✅ FIX: klik op kaart = fullscreen open op exact die topic
    const openThis = (e)=>{
      e?.preventDefault?.();
      e?.stopPropagation?.();
      openFullscreenAt(item.id);
    };

    card.addEventListener("click", openThis);
    card.addEventListener("keydown", (e)=>{
      if(e.key==="Enter" || e.key===" "){
        e.preventDefault();
        openThis(e);
      }
    });

    frag.appendChild(wrap);
  }

  els.grid.appendChild(frag);
}

/* ---------- Fullscreen ---------- */

function ensureFsOrder(){
  if(!Array.isArray(fsOrder) || fsOrder.length !== TOPICS.length){
    fsOrder = shuffle([...Array(TOPICS.length).keys()]);
    fsIndex = 0;
  }
}

/* ✅ open fullscreen at specific topic id */
function openFullscreenAt(topicId){
  ensureFsOrder();
  const pos = fsOrder.indexOf(topicId);
  if(pos >= 0){
    fsIndex = pos;
  }else{
    // fallback: zet 'm vooraan
    fsOrder = [topicId, ...fsOrder.filter(x=>x!==topicId)];
    fsIndex = 0;
  }
  openFullscreen();
}

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
  if(!TOPICS.length){
    els.fsQ.textContent="Geen topics…";
    return;
  }
  ensureFsOrder();
  const idx = fsOrder[fsIndex];
  els.fsQ.textContent = displayTextById(idx);
  requestAnimationFrame(()=>restartSwing(els.fsTag));
}

function fsNext(){
  if(!TOPICS.length) return;
  ensureFsOrder();
  fsIndex = (fsIndex + 1) % fsOrder.length;
  renderFullscreenCurrent();
}

function fsPrev(){
  if(!TOPICS.length) return;
  ensureFsOrder();
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
  els.fsTag.addEventListener("click", ()=>fsNext());

  // ✅ Klik op "Tea Topics" (boven) opent fullscreen (als het dicht is)
  const openFromTitle = (e)=>{
    e.preventDefault();
    e.stopPropagation();

    if(!els.fs.hidden) { fsNext(); return; }

    fsOrder = shuffle([...Array(TOPICS.length).keys()]);
    fsIndex = 0;
    openFullscreen();
  };

  els.openFsTitle?.addEventListener("click", openFromTitle);
  els.openFsTitle?.addEventListener("keydown", (e)=>{
    if(e.key==="Enter" || e.key===" "){
      openFromTitle(e);
    }
  });

  // fullscreen titel ook klikbaar = volgende
  els.fsBrandTitle?.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); fsNext(); });
  els.fsBrandTitle?.addEventListener("keydown", (e)=>{
    if(e.key==="Enter" || e.key===" "){
      e.preventDefault();
      fsNext();
    }
  });

  document.addEventListener("keydown",(e)=>{
    if(els.fs.hidden) return;

    if(e.key==="Escape"){ e.preventDefault(); closeFullscreen(); return; }
    if(e.key===" " || e.key==="Spacebar"){ e.preventDefault(); fsNext(); return; }
    if(e.key==="ArrowRight"){ e.preventDefault(); fsNext(); return; }
    if(e.key==="ArrowLeft"){ e.preventDefault(); fsPrev(); return; }
  });
}

/* -------------------------
   Init
------------------------- */
(async function init(){
  wireFullscreen();

  try{
    await loadTopics();
    openFullscreen(); // start meteen fullscreen (zoals je had)
  }catch(err){
    console.error(err);
    buildPagerBottom();
    updatePagerDisabled();
    updateProgressPill();

    els.grid.innerHTML = `
      <div class="hangWrap">
        <div class="hangTag topicCard swing">
          <div class="tagInner">
            <p class="q">Kon topics.json niet laden. Zet topics.json naast index.html.</p>
          </div>
        </div>
      </div>`;
    requestAnimationFrame(restartAllGridSwing);

    openFullscreen();
    els.fsQ.textContent="Kon topics.json niet laden…";
  }
})();
