/* app.js — Tea Topics (cleaned)
   ✅ Klik op topic in grid -> fullscreen opent exact die topic (niet random)
   ✅ Rope/grid spacing fix zit in CSS (overview-only)
   ✅ Geen blue highlight / lelijke cursor (CSS)
   ✅ Multi-language JSON loader (navigator / ?lang= / localStorage)
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

let TOPICS = [];      // { text, category?, _i }
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

/* Restart swing for all visible cards in grid */
function restartAllGridSwing(){
  const cards = els.grid.querySelectorAll(".hangTag");
  cards.forEach(restartSwing);
}

/* -------------------------
   Language JSON loader
------------------------- */

function getPreferredLang(){
  // 1) URL param ?lang=nl
  const p = new URLSearchParams(location.search);
  const qLang = (p.get("lang") || "").toLowerCase().trim();
  if(qLang) return qLang;

  // 2) saved choice
  const saved = (localStorage.getItem("tea_lang") || "").toLowerCase().trim();
  if(saved) return saved;

  // 3) browser language
  const nav = (navigator.language || "en").toLowerCase();
  return nav;
}

function pickTopicsFile(){
  // jij kunt dit uitbreiden
  // voorbeeld bestanden: topics.nl.json, topics.en.json, topics.de.json, ...
  const lang = getPreferredLang();

  const short = lang.split("-")[0]; // nl-NL -> nl
  const supported = new Set(["nl","en","de","fr","es","tr","pl","it"]);

  if(supported.has(short)) return `topics.${short}.json`;

  // fallback
  return "topics.json";
}

/* -------------------------
   Data loading
------------------------- */
async function loadTopics(){
  const file = pickTopicsFile();

  let res = await fetch(file, { cache:"no-store" });

  // fallback als die taalfile niet bestaat
  if(!res.ok && file !== "topics.json"){
    res = await fetch("topics.json", { cache:"no-store" });
  }

  if(!res.ok) throw new Error("Kan topics JSON niet laden.");
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

  // unique
  const seen = new Set();
  list = list.filter(o => {
    const k = o.text.toLowerCase();
    if(seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // ✅ give every topic a stable index (_i)
  TOPICS = list.map((o, i) => ({ ...o, _i: i }));
  filtered = TOPICS.slice();

  // default fullscreen order (random)
  fsOrder = shuffle([...Array(TOPICS.length).keys()]);
  fsIndex = Math.floor(Math.random() * Math.max(1, fsOrder.length));

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

  // ✅ random fullscreen
  rand.addEventListener("click", ()=>{
    openFullscreenRandom();
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
    p.textContent = item.text;

    inner.appendChild(p);
    card.appendChild(inner);
    wrap.appendChild(card);

    // ✅ FIX: klik topic -> fullscreen opent precies DIE topic
    const openThis = (e)=>{
      if(e){ e.preventDefault(); e.stopPropagation(); }
      openFullscreenFromTopicIndex(item._i);
    };

    card.addEventListener("click", openThis);
    card.addEventListener("keydown", (e)=>{
      if(e.key==="Enter" || e.key===" "){
        openThis(e);
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
  if(!TOPICS.length){
    els.fsQ.textContent="Geen topics…";
    return;
  }
  const idx = fsOrder[fsIndex];
  els.fsQ.textContent = TOPICS[idx]?.text || "…";
  requestAnimationFrame(()=>restartSwing(els.fsTag));
}

function fsNext(){
  if(!TOPICS.length) return;
  fsIndex = (fsIndex + 1) % fsOrder.length;
  renderFullscreenCurrent();
}

function fsPrev(){
  if(!TOPICS.length) return;
  fsIndex = (fsIndex - 1 + fsOrder.length) % fsOrder.length;
  renderFullscreenCurrent();
}

/* ✅ random mode */
function openFullscreenRandom(){
  fsOrder = shuffle([...Array(TOPICS.length).keys()]);
  fsIndex = 0;
  openFullscreen();
}

/* ✅ clicked-topic-first mode */
function openFullscreenFromTopicIndex(topicIndex){
  const all = [...Array(TOPICS.length).keys()];

  // remove clicked idx from pool, shuffle rest
  const rest = all.filter(i => i !== topicIndex);
  fsOrder = [topicIndex, ...shuffle(rest)];
  fsIndex = 0;
  openFullscreen();
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

  // ✅ Klik op "Tea Topics" bovenin: als fullscreen open -> volgende. Als dicht -> random open.
  const titleAction = (e)=>{
    if(e){ e.preventDefault(); e.stopPropagation(); }
    if(!els.fs.hidden){
      fsNext();
      return;
    }
    openFullscreenRandom();
  };

  els.openFsTitle?.addEventListener("click", titleAction);
  els.openFsTitle?.addEventListener("keydown", (e)=>{
    if(e.key==="Enter" || e.key===" "){
      titleAction(e);
    }
  });

  els.fsBrandTitle?.addEventListener("click", (e)=>titleAction(e));
  els.fsBrandTitle?.addEventListener("keydown", (e)=>{
    if(e.key==="Enter" || e.key===" "){
      titleAction(e);
    }
  });

  // Keyboard in fullscreen
  document.addEventListener("keydown", (e)=>{
    if(els.fs.hidden) return;

    if(e.key === "Escape"){
      e.preventDefault();
      closeFullscreen();
      return;
    }
    if(e.key === "ArrowRight"){
      e.preventDefault();
      fsNext();
      return;
    }
    if(e.key === "ArrowLeft"){
      e.preventDefault();
      fsPrev();
      return;
    }
    if(e.key === " " || e.key === "Enter"){
      e.preventDefault();
      fsNext();
      return;
    }
  });
}

/* -------------------------
   Init
------------------------- */
wireFullscreen();
loadTopics().catch(err=>{
  console.error(err);
  els.grid.innerHTML = `<p style="opacity:.7;font-weight:800">Kon topics niet laden.</p>`;
});
