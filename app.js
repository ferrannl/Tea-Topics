
const TOPICS = [...window.TOPICS]; // blijft zoals eerder

const grid = document.getElementById("grid");
const search = document.getElementById("search");
const filter = document.getElementById("categoryFilter");
const randomBtn = document.getElementById("randomBtn");

const darkToggle = document.getElementById("darkToggle");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const fs = document.getElementById("fullscreen");
const fsQ = document.querySelector(".fsQuestion");
const fsC = document.querySelector(".fsCategory");

const categories = ["Alle", ...new Set(TOPICS.map(t=>t.cat))];
filter.innerHTML = categories.map(c=>`<option>${c}</option>`).join("");

/* DARK MODE */
if(localStorage.dark==="1") document.body.classList.add("dark");
darkToggle.onclick=()=>{
  document.body.classList.toggle("dark");
  localStorage.dark = document.body.classList.contains("dark")?"1":"0";
};

/* RENDER */
function render(){
  const q = search.value.toLowerCase();
  const c = filter.value;
  grid.innerHTML = "";

  TOPICS.filter(t=>{
    return (c==="Alle"||t.cat===c) &&
           t.text.toLowerCase().includes(q);
  }).forEach(t=>{
    const d=document.createElement("div");
    d.className="card";
    d.innerHTML=`<p>${t.text}</p><div class="badge">${t.cat}</div>`;
    d.onclick=()=>navigator.clipboard.writeText(t.text);
    grid.appendChild(d);
  });
}

/* RANDOM */
function randomTopic(){
  return TOPICS[Math.floor(Math.random()*TOPICS.length)];
}

randomBtn.onclick=()=>{
  const t=randomTopic();
  alert(t.text);
};

/* FULLSCREEN */
fullscreenBtn.onclick=()=>{
  fs.hidden=false;
  showFs();
};

function showFs(){
  const t=randomTopic();
  fsQ.textContent=t.text;
  fsC.textContent=t.cat;
}

document.addEventListener("keydown",e=>{
  if(fs.hidden) return;
  if(e.key==="Escape") fs.hidden=true;
  if(e.key===" "||e.key==="Enter") showFs();
});

fs.onclick=showFs;

search.oninput = filter.onchange = render;
render();
