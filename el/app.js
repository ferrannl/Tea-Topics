/* app.js — Tea Topics
   ✅ Alleen Grieks (UI)
   ✅ Schudden wisselt GEEN topics
   ✅ Schudden = harder/sneller swingen (en vanzelf terug-dempt)
   ✅ Motion sensor alleen op mobile/tablet (geen PC warnings)
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

let TOPICS = [];
let filtered = [];
let page = 1;
const PAGE_SIZE = 6;

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

/* ✅ Force restart swing animation */
function restartSwing(el){
  if(!el) return;
  el.classList.remove("swing");
  void el.offsetWidth;
  el.classList.add("swing");
}
function restartAllGridSwing(){
  els.grid.querySelectorAll(".hangTag").forEach(restartSwing);
}

/* -------------------------
   Load topics
------------------------- */
async function loadTopics(){
  const res = await fetch("topics.json", { cache:"no-store" });
  if(!res.ok) throw new Error("Δεν είναι δυνατή η φόρτωση του topics.json.");
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

  fsOrder = shuffle([...Array(TOPICS.length).keys()]);
  fsIndex = Math.floor(Math.random() * Math.max(1, fsOrder.length));

  renderPage(true);
}

function maxPage(){ return Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)); }
function clampPage(){
  page = Math.min(Math.max(page, 1), maxPage());
}

/* -------------------------
   Pager
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

  const prev = mkBtn("← Πίσω", "botPrev");
  const rand = mkBtn("🎲 Τυχαίο Tea Topic", "botRand");
  rand.classList.add("random");
  const next = mkBtn("Επόμενο →", "botNext");

  els.pagerBottom.append(prev, rand, next);

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

  prev.onclick = ()=>{ if(page>1){ page--; renderPage(); scrollToTop(); } };
  next.onclick = ()=>{ if(page<maxPage()){ page++; renderPage(); scrollToTop(); } };
  rand.onclick = ()=>{
    fsOrder = shuffle([...Array(TOPICS.length).keys()]);
    fsIndex = 0;
    openFullscreen();
  };
}

function updatePagerDisabled(){
  const prev = document.getElementById("botPrev");
  const next = document.getElementById("botNext");
  if(prev) prev.disabled = page <= 1;
  if(next) next.disabled = page >= maxPage();
}

function updateProgressPill(){
  const m = maxPage();
  const pill = document.getElementById("pagerPill");
  const label = document.getElementById("pagerLabel");
  if(!pill || !label) return;

  const pillW = Math.max(10, 100 / m);
  const left = (m<=1)?0:((page-1)/(m-1))*(100-pillW);

  pill.style.width = `${pillW}%`;
  pill.style.left = `${left}%`;
  label.textContent = `Σελίδα ${page} / ${m}`;
}

function renderPage(rebuild=false){
  clampPage();
  if(rebuild) buildPagerBottom();
  updatePagerDisabled();
  updateProgressPill();

  const start = (page-1)*PAGE_SIZE;
  renderGrid(filtered.slice(start, start+PAGE_SIZE));
  requestAnimationFrame(restartAllGridSwing);
}

/* -------------------------
   Grid
------------------------- */
function displayTextById(id){
  return TOPICS[id]?.text || "";
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

    const openThis = e=>{
      e.preventDefault();
      e.stopPropagation();
      openFullscreenAt(item.id);
    };

    card.onclick = openThis;
    card.onkeydown = e=>{
      if(e.key==="Enter"||e.key===" "){ e.preventDefault(); openThis(e); }
    };

    frag.appendChild(wrap);
  }
  els.grid.appendChild(frag);
}

/* ---------- Fullscreen ---------- */
function ensureFsOrder(){
  if(fsOrder.length!==TOPICS.length){
    fsOrder = shuffle([...Array(TOPICS.length).keys()]);
    fsIndex = 0;
  }
}
function openFullscreenAt(topicId){
  ensureFsOrder();
  const pos = fsOrder.indexOf(topicId);
  fsIndex = pos>=0 ? pos : 0;
  openFullscreen();
}
function openFullscreen(){
  els.fs.hidden=false;
  els.fs.setAttribute("aria-hidden","false");
  document.body.style.overflow="hidden";
  renderFullscreenCurrent();
  requestAnimationFrame(()=>restartSwing(els.fsTag));
}
function closeFullscreen(){
  els.fs.hidden=true;
  els.fs.setAttribute("aria-hidden","true");
  document.body.style.overflow="";
}
function renderFullscreenCurrent(){
  if(!TOPICS.length){
    els.fsQ.textContent="Δεν υπάρχουν θέματα…";
    return;
  }
  ensureFsOrder();
  els.fsQ.textContent = displayTextById(fsOrder[fsIndex]);
  requestAnimationFrame(()=>restartSwing(els.fsTag));
}
function fsNext(){ fsIndex=(fsIndex+1)%fsOrder.length; renderFullscreenCurrent(); }
function fsPrev(){ fsIndex=(fsIndex-1+fsOrder.length)%fsOrder.length; renderFullscreenCurrent(); }

/* -------------------------
   Init
------------------------- */
(async function init(){
  try{
    await loadTopics();
    openFullscreen();
  }catch(err){
    console.error(err);
    els.grid.innerHTML = `
      <div class="hangWrap">
        <div class="hangTag topicCard swing">
          <div class="tagInner">
            <p class="q">Αδυναμία φόρτωσης του topics.json. Τοποθετήστε το δίπλα στο index.html.</p>
          </div>
        </div>
      </div>`;
    els.fsQ.textContent="Αδυναμία φόρτωσης των θεμάτων…";
    requestAnimationFrame(restartAllGridSwing);
    openFullscreen();
  }
})();
