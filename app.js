/* app.js — Tea Topics
   ✅ Alleen Nederlands
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
const PAGE_SIZE = 12;

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
  void el.offsetWidth;
  el.classList.add("swing");
}
function restartAllGridSwing(){
  const cards = els.grid.querySelectorAll(".hangTag");
  cards.forEach(restartSwing);
}

/* -------------------------
   Load topics
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

  fsOrder = shuffle([...Array(TOPICS.length).keys()]);
  fsIndex = Math.floor(Math.random() * Math.max(1, fsOrder.length));

  renderPage(true);
}

function maxPage(){ return Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)); }
function clampPage(){
  const m = maxPage();
  if(page < 1) page = 1;
  if(page > m) page = m;
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
    if(page > 1){ page--; renderPage(); scrollToTop(); }
  });
  next.addEventListener("click", ()=>{
    if(page < maxPage()){ page++; renderPage(); scrollToTop(); }
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
  const list = filtered.slice(start, start + PAGE_SIZE);
  renderGrid(list);

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
function openFullscreenAt(topicId){
  ensureFsOrder();
  const pos = fsOrder.indexOf(topicId);
  if(pos >= 0) fsIndex = pos;
  else { fsOrder = [topicId, ...fsOrder.filter(x=>x!==topicId)]; fsIndex = 0; }
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
  if(!TOPICS.length){ els.fsQ.textContent="Geen topics…"; return; }
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
  els.fsClose.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); closeFullscreen(); }, true);
  els.fsNext.addEventListener("click",(e)=>{ e.preventDefault(); e.stopPropagation(); fsNext(); });
  els.fsPrev.addEventListener("click",(e)=>{ e.preventDefault(); e.stopPropagation(); fsPrev(); });

  els.fsTag.addEventListener("click", ()=>fsNext());

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
    if(e.key==="Enter" || e.key===" "){ openFromTitle(e); }
  });

  els.fsBrandTitle?.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); fsNext(); });
  els.fsBrandTitle?.addEventListener("keydown", (e)=>{
    if(e.key==="Enter" || e.key===" "){ e.preventDefault(); fsNext(); }
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
   “Power swing” via device motion (alleen mobile/tablet)
------------------------- */
let intensity = 0;          // 0..1
let lastMotionKick = 0;
let rafId = 0;

const BASE_DUR = 2.8;
const MIN_DUR  = 1.15;
const BASE_AMP = 1.2;
const MAX_AMP  = 4.4;

const KICK_COOLDOWN_MS = 80;
const KICK_SCALE = 0.022;
const DECAY_PER_SEC = 1.15;

function lerp(a,b,t){ return a + (b-a)*t; }
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

function applySwingVars(){
  const dur = lerp(BASE_DUR, MIN_DUR, intensity);
  const amp = lerp(BASE_AMP, MAX_AMP, intensity);

  const root = document.documentElement.style;
  root.setProperty("--swingDur", `${dur.toFixed(2)}s`);
  root.setProperty("--swingPos", `${amp.toFixed(2)}deg`);
  root.setProperty("--swingNeg", `${(-amp).toFixed(2)}deg`);
}

function tickDecay(ts){
  if(!rafId) return;
  const dt = (tickDecay._lastTs ? (ts - tickDecay._lastTs) : 16) / 1000;
  tickDecay._lastTs = ts;

  if(intensity > 0){
    intensity = clamp(intensity - (DECAY_PER_SEC * dt), 0, 1);
    applySwingVars();
  }

  if(intensity > 0.001){
    rafId = requestAnimationFrame(tickDecay);
  }else{
    intensity = 0;
    applySwingVars();
    rafId = 0;
    tickDecay._lastTs = 0;
  }
}

function kickFromMotion(mag){
  const now = Date.now();
  if(now - lastMotionKick < KICK_COOLDOWN_MS) return;
  lastMotionKick = now;

  const add = clamp((mag - 14.5) * KICK_SCALE, 0, 0.35);
  if(add <= 0) return;

  intensity = clamp(intensity + add, 0, 1);
  applySwingVars();

  if(!rafId) rafId = requestAnimationFrame(tickDecay);
}

function isTouchDevice(){
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
  const touch = (navigator.maxTouchPoints || 0) > 0;
  return !!(coarse || touch);
}

function startMotionListener(){
  if(!("DeviceMotionEvent" in window)) return;

  const onMotion = (ev)=>{
    const a = ev.accelerationIncludingGravity || ev.acceleration;
    if(!a) return;
    const x = Math.abs(a.x || 0);
    const y = Math.abs(a.y || 0);
    const z = Math.abs(a.z || 0);
    const mag = x + y + z;
    kickFromMotion(mag);
  };

  window.addEventListener("devicemotion", onMotion, { passive:true });
}

async function requestIOSMotionPermissionIfNeeded(){
  try{
    if(typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function"){
      const res = await DeviceMotionEvent.requestPermission();
      if(res === "granted") startMotionListener();
      return;
    }
  }catch(_){}
  startMotionListener();
}

function armMotionOnFirstGesture(){
  // ✅ Alleen op touch devices → geen PC “deprecated” warning
  if(!isTouchDevice()) return;

  const go = ()=>{
    requestIOSMotionPermissionIfNeeded().catch(()=>{});
    window.removeEventListener("pointerdown", go, true);
    window.removeEventListener("keydown", go, true);
  };
  window.addEventListener("pointerdown", go, true);
  window.addEventListener("keydown", go, true);
}

/* -------------------------
   Init
------------------------- */
(async function init(){
  wireFullscreen();
  armMotionOnFirstGesture();
  applySwingVars();

  try{
    await loadTopics();
    openFullscreen();
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
