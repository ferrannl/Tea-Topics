/* Tea Topics — app.js
   - Swing blijft, maar beperkt tot MAX_SWING tegelijk (dus geen 50+ lag)
   - Pagination
   - Fullscreen sluit écht + body lock/unlock correct
   - Mobile: grotere fsQuestion via CSS clamp()
*/

const els = {
  grid: document.getElementById("topicsGrid"),
  search: document.getElementById("searchInput"),
  category: document.getElementById("categorySelect"),
  shown: document.getElementById("shownCount"),
  total: document.getElementById("totalCount"),
  clear: document.getElementById("clearFiltersBtn"),
  randomBtn: document.getElementById("randomBtn"),
  darkBtn: document.getElementById("darkToggleBtn"),

  fs: document.getElementById("fullscreen"),
  fsClose: document.getElementById("fsClose"),
  fsQ: document.getElementById("fsQuestion"),
  fsCat: document.getElementById("fsCategory"),
  fsPrev: document.getElementById("fsPrev"),
  fsNext: document.getElementById("fsNext"),
  fsTag: document.getElementById("fsTag"),

  toast: document.getElementById("toast"),
};

let TOPICS = [];      // { text, category }
let filtered = [];

let fsOrder = [];
let fsIndex = 0;

// Pagination
let page = 1;
const PAGE_SIZE = 24;

// ✅ Swing limiter
const MAX_SWING = 12; // hoeveel kaarten tegelijk mogen swingen

// Pager DOM
let pagerEls = { wrap:null, prev:null, next:null, info:null };

function norm(s){ return (s||"").toString().trim().replace(/\s+/g," "); }

function debounce(fn, ms){
  let t;
  return (...args)=>{
    clearTimeout(t);
    t = setTimeout(()=>fn(...args), ms);
  };
}

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

function setDarkMode(isDark){
  document.body.classList.toggle("dark", !!isDark);
  localStorage.setItem("tea_dark", isDark ? "1" : "0");
}
function loadDarkMode(){
  const saved = localStorage.getItem("tea_dark");
  if(saved==="1") setDarkMode(true);
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

function parseRawTopics(raw){
  const lines=(raw||"").split(/\r?\n/).map(norm).filter(Boolean);
  const out=[];
  for(const line of lines){
    if(/^pickwic/i.test(line)) continue;
    if(/^neem( em)? de tijd/i.test(line)) continue;
    if(/^\*{3,}/.test(line)) continue;
    if(line==="V") continue;
    if(line.length<8) continue;

    if(line.includes("?") && !line.trim().endsWith("?")){
      const parts=line.split("?").map(p=>norm(p)).filter(Boolean);
      for(const p of parts){
        const q=p.endsWith("?")?p:(p+"?");
        if(q.length>=10) out.push(q);
      }
      continue;
    }

    if(!line.includes("?")) continue;
    if(!line.endsWith("?")) continue;
    out.push(line);
  }

  const seen=new Set();
  const unique=[];
  for(const q of out){
    const k=q.toLowerCase();
    if(seen.has(k)) continue;
    seen.add(k);
    unique.push(q);
  }
  return unique;
}

function inferCategory(text){
  const t=(text||"").toLowerCase();
  if (/(thee|kopje|theesmaak|picknick)/.test(t)) return "Thee";
  if (/(droom|nachtmerrie)/.test(t)) return "Dromen";
  if (/(vakantie|reis|vliegen|wereldreis|museum|strand|bergen|stad|dorp)/.test(t)) return "Reizen";
  if (/(familie|oma|vader|moeder|broer|zus|vriend|vriendin|date|relatie|liefde|ex)/.test(t)) return "Relaties";
  if (/(werk|baan|beroep|collega|kantoor|thuiswerken|droombaan)/.test(t)) return "Werk";
  if (/(muziek|lied|playlist|concert|karaoke)/.test(t)) return "Muziek";
  if (/(film|serie|tv|televisie|programma)/.test(t)) return "Media";
  if (/(eten|koken|gerecht|ontbijt|snacks|snoep)/.test(t)) return "Eten";
  if (/(sport|olympisch|wedstrijd)/.test(t)) return "Sport";
  if (/(geld|euro|rijk|loterij|winkelen)/.test(t)) return "Geld";
  return "Algemeen";
}

async function loadTopics(){
  const res=await fetch("topics.json",{cache:"no-store"});
  if(!res.ok) throw new Error("Kan topics.json niet laden.");
  const data=await res.json();

  if(Array.isArray(data.topics)){
    TOPICS=data.topics
      .map(x=>({ text:norm(x.text||x), category:norm(x.category)||inferCategory(x.text||x) }))
      .filter(x=>x.text && x.text.includes("?"));
  }else if(typeof data.topicsRaw==="string"){
    const list=parseRawTopics(data.topicsRaw);
    TOPICS=list.map(q=>({ text:q, category:inferCategory(q) }));
  }else{
    TOPICS=[];
  }

  const seen=new Set();
  TOPICS=TOPICS.filter(t=>{
    const k=t.text.toLowerCase();
    if(seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  els.total.textContent=String(TOPICS.length);

  buildCategorySelect();

  fsOrder=shuffle([...Array(TOPICS.length).keys()]);
  fsIndex=Math.floor(Math.random()*Math.max(1,fsOrder.length));

  applyFilters(true);
}

function buildCategorySelect(){
  const cats=["Alle categorieën", ...Array.from(new Set(TOPICS.map(t=>t.category))).sort((a,b)=>a.localeCompare(b,"nl"))];
  els.category.innerHTML="";
  for(const c of cats){
    const opt=document.createElement("option");
    opt.value=c;
    opt.textContent=c;
    els.category.appendChild(opt);
  }
}

/* Pager */
function ensurePager(){
  if(pagerEls.wrap) return;

  const head = document.querySelector(".gridHead");
  const wrap = document.createElement("div");
  wrap.className = "pager";
  wrap.setAttribute("aria-label","Paginering");

  const prev = document.createElement("button");
  prev.className = "pbtn";
  prev.type = "button";
  prev.textContent = "← Vorige pagina";

  const info = document.createElement("div");
  info.className = "pinfo";
  info.textContent = "Pagina 1";

  const next = document.createElement("button");
  next.className = "pbtn";
  next.type = "button";
  next.textContent = "Volgende pagina →";

  prev.addEventListener("click", ()=>{
    if(page>1){ page--; renderGridPaged(); window.scrollTo({top:0, behavior:"smooth"}); }
  });
  next.addEventListener("click", ()=>{
    const max = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if(page<max){ page++; renderGridPaged(); window.scrollTo({top:0, behavior:"smooth"}); }
  });

  wrap.appendChild(prev);
  wrap.appendChild(info);
  wrap.appendChild(next);

  head.insertAdjacentElement("afterend", wrap);
  pagerEls = { wrap, prev, next, info };
}

function applyFilters(resetPage=false){
  const q=norm(els.search.value).toLowerCase();
  const cat=els.category.value;

  filtered = TOPICS.filter(t=>{
    if(cat && cat!=="Alle categorieën" && t.category!==cat) return false;
    if(q && !t.text.toLowerCase().includes(q)) return false;
    return true;
  });

  if(resetPage) page = 1;

  ensurePager();
  renderGridPaged();
}

function renderGridPaged(){
  const maxPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if(page > maxPage) page = maxPage;

  els.shown.textContent = String(filtered.length);

  pagerEls.info.textContent = `Pagina ${page} / ${maxPage} • ${PAGE_SIZE} per pagina`;
  pagerEls.prev.disabled = (page<=1);
  pagerEls.next.disabled = (page>=maxPage);

  const start = (page-1)*PAGE_SIZE;
  const list = filtered.slice(start, start + PAGE_SIZE);

  renderGrid(list);
}

/* ✅ swing limiter:
   - geef class .swing aan een subset kaarten
   - herhaal rustig om de paar seconden (zodat het “levend” blijft)
*/
let swingTimer = null;

function applySwingLimiter(){
  if(swingTimer) clearInterval(swingTimer);

  const cards = Array.from(els.grid.querySelectorAll(".hangTag.topicCard"));
  cards.forEach(c => c.classList.remove("swing"));

  if(cards.length === 0) return;

  // kies random subset en zet swing aan
  const pickSubset = ()=>{
    cards.forEach(c => c.classList.remove("swing"));
    const shuffled = shuffle(cards);
    const n = Math.min(MAX_SWING, shuffled.length);
    for(let i=0;i<n;i++) shuffled[i].classList.add("swing");
  };

  pickSubset();

  // elke 3.5 sec nieuw setje laten swingen
  swingTimer = setInterval(pickSubset, 3500);
}

function renderGrid(list){
  els.grid.innerHTML="";
  const frag = document.createDocumentFragment();

  for(const item of list){
    const wrap=document.createElement("div");
    wrap.className="hangWrap";

    const card=document.createElement("article");
    card.className="hangTag topicCard";
    card.tabIndex=0;

    const inner=document.createElement("div");
    inner.className="tagInner";

    const p=document.createElement("p");
    p.className="q";
    p.textContent=item.text;

    const badge=document.createElement("div");
    badge.className="badge";
    badge.textContent=item.category;

    inner.appendChild(p);
    inner.appendChild(badge);
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
  applySwingLimiter(); // ✅ only few cards swing
}

/* Fullscreen */
function openFullscreen(){
  els.fs.hidden=false;
  els.fs.setAttribute("aria-hidden","false");
  document.body.classList.add("fsOpen");
  renderFullscreenCurrent();
}

function closeFullscreen(){
  els.fs.hidden=true;
  els.fs.setAttribute("aria-hidden","true");
  document.body.classList.remove("fsOpen");
}

function renderFullscreenCurrent(){
  if(!TOPICS.length){
    els.fsQ.textContent="Geen topics geladen…";
    els.fsCat.textContent="";
    return;
  }
  const idx=fsOrder[fsIndex];
  const t=TOPICS[idx];

  // fullscreen kaart mag wél swingen (1 kaart is cheap)
  els.fsTag.classList.add("swing");

  els.fsQ.textContent=t.text;
  els.fsCat.textContent=t.category ? `Categorie: ${t.category}` : "";
}

function fsNext(){
  if(!TOPICS.length) return;
  fsIndex=(fsIndex+1)%fsOrder.length;
  renderFullscreenCurrent();
}
function fsPrev(){
  if(!TOPICS.length) return;
  fsIndex=(fsIndex-1+fsOrder.length)%fsOrder.length;
  renderFullscreenCurrent();
}

function wireEvents(){
  els.search.addEventListener("input", debounce(()=>applyFilters(true), 150));
  els.category.addEventListener("change", ()=>applyFilters(true));

  els.clear.addEventListener("click", ()=>{
    els.search.value="";
    els.category.value="Alle categorieën";
    applyFilters(true);
  });

  els.randomBtn.addEventListener("click", ()=>{
    fsOrder=shuffle([...Array(TOPICS.length).keys()]);
    fsIndex=0;
    openFullscreen();
  });

  els.darkBtn.addEventListener("click", ()=>{
    setDarkMode(!document.body.classList.contains("dark"));
  });

  // close button (werkt op mobile)
  const stop = (e)=>{
    e.stopPropagation();
    e.stopImmediatePropagation();
  };

  els.fsClose.addEventListener("pointerdown", stop, true);
  els.fsClose.addEventListener("touchstart", stop, {capture:true, passive:true});
  els.fsClose.addEventListener("click", (e)=>{
    e.preventDefault();
    stop(e);
    closeFullscreen();
  }, true);

  els.fsNext.addEventListener("click",(e)=>{e.preventDefault();e.stopPropagation();fsNext();});
  els.fsPrev.addEventListener("click",(e)=>{e.preventDefault();e.stopPropagation();fsPrev();});

  els.fsTag.addEventListener("click", ()=>fsNext());

  document.addEventListener("keydown",(e)=>{
    if(els.fs.hidden) return;

    if(e.key==="Escape"){ e.preventDefault(); closeFullscreen(); return; }
    if(e.key===" " || e.key==="Spacebar"){ e.preventDefault(); fsNext(); return; }
    if(e.key==="ArrowRight"){ e.preventDefault(); fsNext(); return; }
    if(e.key==="ArrowLeft"){ e.preventDefault(); fsPrev(); return; }
  });
}

(async function init(){
  loadDarkMode();
  wireEvents();

  try{
    await loadTopics();
    openFullscreen(); // start fullscreen zoals jij wilde
  }catch(err){
    console.error(err);
    els.total.textContent="0";
    els.shown.textContent="0";
    els.grid.innerHTML=`<div class="hangWrap"><div class="hangTag topicCard"><div class="tagInner"><p class="q">Kon topics.json niet laden. Zet topics.json naast index.html.</p><div class="badge">Fout</div></div></div></div>`;
    ensurePager();
    pagerEls.info.textContent = "Pagina 1 / 1";
    pagerEls.prev.disabled = true;
    pagerEls.next.disabled = true;

    openFullscreen();
    els.fsQ.textContent="Kon topics.json niet laden…";
    els.fsCat.textContent="";
  }
})();
