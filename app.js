/* Tea Topics — app.js
   - Swing reliability fix: force-restart CSS animation after render (toggle class)
   - Cards open modal (copy/save)
   - Fullscreen random mode + title (HTML/CSS)
   - Progress bar with green pill (math)
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

  // modal
  modal: document.getElementById("cardModal"),
  modalOverlay: document.getElementById("modalOverlay"),
  modalClose: document.getElementById("modalClose"),
  modalCard: document.getElementById("modalCard"),
  modalTitle: document.getElementById("modalTitle"),
  modalCategory: document.getElementById("modalCategory"),
  btnCopy: document.getElementById("btnCopy"),
  btnSave: document.getElementById("btnSave"),
  btnBack: document.getElementById("btnBack"),
  modalHint: document.getElementById("modalHint"),

  toast: document.getElementById("toast"),
};

let TOPICS = [];      // { text, category? }
let filtered = [];
let page = 1;

const PAGE_SIZE = 12;

// fullscreen order
let fsOrder = [];
let fsIndex = 0;

// modal state
let currentModalText = "";
let saving = false;

function norm(s){ return (s||"").toString().trim().replace(/\s+/g," "); }

function showToast(msg){
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>els.toast.classList.remove("show"), 1100);
}

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

function safeCopy(text){
  const t = norm(text);
  if(!t) return;

  if(navigator.clipboard?.writeText){
    navigator.clipboard.writeText(t).then(()=>showToast("Gekopieerd ✓"));
  }else{
    const ta=document.createElement("textarea");
    ta.value=t;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    showToast("Gekopieerd ✓");
  }
}

function fileSafeName(text){
  const t = norm(text).replace(/[\\/:*?"<>|]+/g, "");
  const short = t.length > 50 ? t.slice(0, 50).trim() : t;
  return (short || "tea-topic").replace(/\s+/g, "_");
}

async function saveElementAsPng(el, filename){
  if(typeof html2canvas !== "function"){
    showToast("html2canvas ontbreekt…");
    return;
  }

  const canvas = await html2canvas(el, {
    backgroundColor: null,
    scale: Math.max(2, window.devicePixelRatio || 2),
    useCORS: true
  });

  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

/* ✅ Force restart swing animation so it never “randomly” stops */
function restartSwing(el){
  if(!el) return;
  el.classList.remove("swing");
  // force reflow
  void el.offsetWidth;
  el.classList.add("swing");
}

/* Restart swing for all visible cards in grid */
function restartAllGridSwing(){
  const cards = els.grid.querySelectorAll(".hangTag");
  cards.forEach(restartSwing);
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

  filtered = TOPICS.slice();

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

  // ✅ make swing always start
  requestAnimationFrame(restartAllGridSwing);
}

/* -------------------------
   Grid + modal open
------------------------- */
function openModal(item){
  currentModalText = item?.text || "";
  els.modalTitle.textContent = currentModalText || "…";
  els.modalCategory.textContent = item?.category || "";
  els.modalHint.textContent = "";

  els.modal.hidden = false;
  els.modal.setAttribute("aria-hidden","false");
  setTimeout(()=>els.modalClose?.focus(), 0);
}

function closeModal(){
  els.modal.hidden = true;
  els.modal.setAttribute("aria-hidden","true");
  currentModalText = "";
  els.modalHint.textContent = "";
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
    p.textContent = item.text;

    inner.appendChild(p);
    card.appendChild(inner);
    wrap.appendChild(card);

    card.addEventListener("click", ()=>openModal(item));
    card.addEventListener("keydown", (e)=>{
      if(e.key==="Enter" || e.key===" "){
        e.preventDefault();
        openModal(item);
      }
    });

    frag.appendChild(wrap);
  }

  els.grid.appendChild(frag);
}

/* -------------------------
   Modal wiring
------------------------- */
function wireModal(){
  els.modalOverlay.addEventListener("click", closeModal);
  els.modalClose.addEventListener("click", closeModal);
  els.btnBack.addEventListener("click", closeModal);

  els.btnCopy.addEventListener("click", ()=>{
    safeCopy(currentModalText);
  });

  els.btnSave.addEventListener("click", async ()=>{
    if(saving) return;
    saving = true;
    els.modalHint.textContent = "Opslaan…";
    try{
      const name = fileSafeName(currentModalText) + ".png";
      await saveElementAsPng(els.modalCard, name);
      els.modalHint.textContent = "Opgeslagen ✓";
      showToast("Opgeslagen ✓");
    }catch(err){
      console.error(err);
      els.modalHint.textContent = "Opslaan mislukt…";
      showToast("Opslaan mislukt…");
    }finally{
      saving = false;
      setTimeout(()=>{ if(!els.modal.hidden) els.modalHint.textContent = ""; }, 900);
    }
  });

  document.addEventListener("keydown",(e)=>{
    if(!els.modal.hidden){
      if(e.key === "Escape"){
        e.preventDefault();
        closeModal();
      }
      return;
    }
  });
}

/* ---------- Fullscreen ---------- */
function openFullscreen(){
  els.fs.hidden = false;
  els.fs.setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";
  renderFullscreenCurrent();

  // ✅ ensure swing starts every time you open fullscreen
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
  els.fsQ.textContent = TOPICS[idx].text;

  // ✅ sometimes browsers pause animations during text update; restart
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

function wireFullscreen(){
  els.fsClose.addEventListener("click", (e)=>{
    e.preventDefault();
    e.stopPropagation();
    closeFullscreen();
  }, true);

  els.fsNext.addEventListener("click",(e)=>{ e.preventDefault(); e.stopPropagation(); fsNext(); });
  els.fsPrev.addEventListener("click",(e)=>{ e.preventDefault(); e.stopPropagation(); fsPrev(); });

  els.fsTag.addEventListener("click", ()=>fsNext());

  document.addEventListener("keydown",(e)=>{
    if(els.fs.hidden) return;
    if(!els.modal.hidden) return;

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
  wireModal();

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
