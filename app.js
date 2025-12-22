
/* Tea Topics — app.js (NL)
   Fixes:
   - ✕ werkt altijd (geen parent click, echte event-capture)
   - fullscreen nooit scrollen + stabiel layout
   - kaart altijd vierkant, knoppen gelijk
   - animatie: swing op tag
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
  const t=text.toLowerCase();
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
  applyFilters();

  fsOrder=shuffle([...Array(TOPICS.length).keys()]);
  fsIndex=Math.floor(Math.random()*Math.max(1,fsOrder.length));
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

function applyFilters(){
  const q=norm(els.search.value).toLowerCase();
  const cat=els.category.value;

  filtered=TOPICS.filter(t=>{
    if(cat && cat!=="Alle categorieën" && t.category!==cat) return false;
    if(q && !t.text.toLowerCase().includes(q)) return false;
    return true;
  });

  renderGrid(filtered);
  els.shown.textContent=String(filtered.length);
}

function renderGrid(list){
  els.grid.innerHTML="";
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

    els.grid.appendChild(wrap);
  }
}

/* Fullscreen */
function openFullscreen(){
  els.fs.hidden=false;
  els.fs.setAttribute("aria-hidden","false");
  document.body.style.overflow="hidden"; // geen scroll
  renderFullscreenCurrent();
}

function closeFullscreen(){
  els.fs.hidden=true;
  els.fs.setAttribute("aria-hidden","true");
  document.body.style.overflow="";
}

function renderFullscreenCurrent(){
  if(!TOPICS.length){
    els.fsQ.textContent="Geen topics geladen…";
    els.fsCat.textContent="";
    return;
  }
  const idx=fsOrder[fsIndex];
  const t=TOPICS[idx];

  // kleine “pop” animatie: opnieuw starten
  els.fsTag.classList.remove("swing");
  void els.fsTag.offsetWidth; // reflow trigger
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
  els.search.addEventListener("input", applyFilters);
  els.category.addEventListener("change", applyFilters);

  els.clear.addEventListener("click", ()=>{
    els.search.value="";
    els.category.value="Alle categorieën";
    applyFilters();
  });

  els.randomBtn.addEventListener("click", ()=>{
    fsOrder=shuffle([...Array(TOPICS.length).keys()]);
    fsIndex=0;
    openFullscreen();
  });

  els.darkBtn.addEventListener("click", ()=>{
    const isDark=document.body.classList.contains("dark");
    setDarkMode(!isDark);
  });

  // --- ✕ SUPER HARD FIX (capture + stopImmediatePropagation) ---
  els.fsClose.addEventListener("pointerdown", (e)=>{
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }, true);

  els.fsClose.addEventListener("click", (e)=>{
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    closeFullscreen();
  }, true);

  // knoppen
  els.fsNext.addEventListener("click",(e)=>{e.preventDefault();e.stopPropagation();fsNext();});
  els.fsPrev.addEventListener("click",(e)=>{e.preventDefault();e.stopPropagation();fsPrev();});

  // klik op kaart = volgende (NIET op knoppen/close)
  els.fsTag.addEventListener("click",(e)=>{
    if(e.target === els.fsClose) return;
    fsNext();
  });

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
  loadDarkMode();
  wireEvents();

  try{
    await loadTopics();
    openFullscreen();
  }catch(err){
    console.error(err);
    els.total.textContent="0";
    els.shown.textContent="0";
    els.grid.innerHTML=`<div class="hangWrap"><div class="hangTag topicCard"><div class="tagInner"><p class="q">Kon topics niet laden. Zet topics.json naast index.html.</p><div class="badge">Fout</div></div></div></div>`;
    openFullscreen();
    els.fsQ.textContent="Kon topics.json niet laden…";
    els.fsCat.textContent="";
  }
})();
