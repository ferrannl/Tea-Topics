/* Tea Topics — app.js (simpel + snel)
   - Geen darkmode / filters / categorie UI
   - Pagination: alleen Vorige / Volgende (boven en onder)
   - Onder: Prev | Random (center) | Next
   - Fullscreen: kaart swingt + sluit werkt altijd
*/

const els = {
  grid: document.getElementById("topicsGrid"),

  pagerTop: document.getElementById("pagerTop"),
  pagerBottom: document.getElementById("pagerBottom"),

  fs: document.getElementById("fullscreen"),
  fsClose: document.getElementById("fsClose"),
  fsQ: document.getElementById("fsQuestion"),
  fsPrev: document.getElementById("fsPrev"),
  fsNext: document.getElementById("fsNext"),
  fsTag: document.getElementById("fsTag"),

  toast: document.getElementById("toast"),
};

let TOPICS = [];      // { text }
let filtered = [];    // nu gewoon alles
let page = 1;

// kleine pagina => weinig tegelijk swingen => geen lag
const PAGE_SIZE = 12;

// fullscreen order
let fsOrder = [];
let fsIndex = 0;

function norm(s){ return (s||"").toString().trim().replace(/\s+/g," "); }

function showToast(msg){
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>els.toast.classList.remove("show"), 1000);
}

function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
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

async function loadTopics(){
  const res=await fetch("topics.json",{cache:"no-store"});
  if(!res.ok) throw new Error("Kan topics.json niet laden.");
  const data=await res.json();

  let list = [];
  if(Array.isArray(data.topics)){
    list = data.topics.map(x => norm(x.text || x)).filter(Boolean);
  }else if(typeof data.topicsRaw === "string"){
    list = data.topicsRaw.split(/\r?\n/).map(norm).filter(Boolean);
  }

  // houd alleen vragen-achtige regels
  list = list
    .map(t => (t.includes("?") ? (t.endsWith("?") ? t : t + "?") : t))
    .filter(t => t.includes("?") && t.length >= 10);

  // unique
  const seen=new Set();
  TOPICS = list
    .map(text => ({ text }))
    .filter(t => {
      const k=t.text.toLowerCase();
      if(seen.has(k)) return false;
      seen.add(k);
      return true;
    });

  filtered = TOPICS.slice();

  // fullscreen shuffle
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

function buildPagers(){
  // TOP: prev/next
  els.pagerTop.innerHTML = "";
  const topPrev = mkBtn("← Vorige", "topPrev");
  const topNext = mkBtn("Volgende →", "topNext");
  els.pagerTop.appendChild(topPrev);
  els.pagerTop.appendChild(topNext);

  // BOTTOM: prev/random/next
  els.pagerBottom.innerHTML = "";
  const botPrev = mkBtn("← Vorige", "botPrev");
  const botRand = mkBtn("🎲 Willekeurige Tea Topic", "botRand");
  botRand.classList.add("random");
  const botNext = mkBtn("Volgende →", "botNext");

  els.pagerBottom.appendChild(botPrev);
  els.pagerBottom.appendChild(botRand);
  els.pagerBottom.appendChild(botNext);

  // actions
  topPrev.addEventListener("click", ()=>{ if(page>1){ page--; renderPage(); } });
  topNext.addEventListener("click", ()=>{ if(page<maxPage()){ page++; renderPage(); } });

  botPrev.addEventListener("click", ()=>{ if(page>1){ page--; renderPage(); } });
  botNext.addEventListener("click", ()=>{ if(page<maxPage()){ page++; renderPage(); } });

  botRand.addEventListener("click", ()=>{
    fsOrder = shuffle([...Array(TOPICS.length).keys()]);
    fsIndex = 0;
    openFullscreen();
  });
}

function mkBtn(label, id){
  const b = document.createElement("button");
  b.type = "button";
  b.className = "pbtn";
  b.id = id;
  b.textContent = label;
  return b;
}

function updatePagerDisabled(){
  const m = maxPage();
  const disablePrev = (page <= 1);
  const disableNext = (page >= m);

  const ids = ["topPrev","botPrev"].map(id=>document.getElementById(id));
  const ids2= ["topNext","botNext"].map(id=>document.getElementById(id));

  ids.forEach(b=>{ if(b) b.disabled = disablePrev; });
  ids2.forEach(b=>{ if(b) b.disabled = disableNext; });
}

function renderPage(rebuild=false){
  clampPage();
  if(rebuild) buildPagers();
  updatePagerDisabled();

  const start = (page-1) * PAGE_SIZE;
  const list = filtered.slice(start, start + PAGE_SIZE);

  renderGrid(list);
}

function renderGrid(list){
  els.grid.innerHTML = "";
  const frag = document.createDocumentFragment();

  for(const item of list){
    const wrap=document.createElement("div");
    wrap.className="hangWrap";

    const card=document.createElement("article");
    card.className="hangTag topicCard swing";
    card.tabIndex=0;

    const inner=document.createElement("div");
    inner.className="tagInner";

    const p=document.createElement("p");
    p.className="q";
    p.textContent=item.text;

    inner.appendChild(p);
    card.appendChild(inner);
    wrap.appendChild(card);

    card.addEventListener("click", ()=>safeCopy(item.text));
    card.addEventListener("keydown", (e)=>{
      if(e.key==="Enter" || e.key===" "){
        e.preventDefault();
        safeCopy(item.text);
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
  // close ALWAYS works
  els.fsClose.addEventListener("click", (e)=>{
    e.preventDefault();
    e.stopPropagation();
    closeFullscreen();
  }, true);

  els.fsNext.addEventListener("click",(e)=>{ e.preventDefault(); e.stopPropagation(); fsNext(); });
  els.fsPrev.addEventListener("click",(e)=>{ e.preventDefault(); e.stopPropagation(); fsPrev(); });

  // tap op kaart = volgende
  els.fsTag.addEventListener("click", ()=>fsNext());

  // keyboard
  document.addEventListener("keydown",(e)=>{
    if(els.fs.hidden) return;

    if(e.key==="Escape"){ e.preventDefault(); closeFullscreen(); return; }
    if(e.key===" " || e.key==="Spacebar"){ e.preventDefault(); fsNext(); return; }
    if(e.key==="ArrowRight"){ e.preventDefault(); fsNext(); return; }
    if(e.key==="ArrowLeft"){ e.preventDefault(); fsPrev(); return; }
  });
}

(async function init(){
  wireFullscreen();
  try{
    await loadTopics();
    // jij wilt: start meteen fullscreen
    openFullscreen();
  }catch(err){
    console.error(err);
    els.grid.innerHTML = `
      <div class="hangWrap">
        <div class="hangTag topicCard">
          <div class="tagInner">
            <p class="q">Kon topics.json niet laden. Zet topics.json naast index.html.</p>
          </div>
        </div>
      </div>`;
    buildPagers();
    updatePagerDisabled();
    openFullscreen();
    els.fsQ.textContent="Kon topics.json niet laden…";
  }
})();
