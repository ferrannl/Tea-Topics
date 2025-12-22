
/* Tea Topics — app.js (NL)
   - Laadt topics.json
   - Fullscreen random mode bij opstart
   - Vorige/Volgende + kruisje rechtsboven
   - Klik/spatie = volgende, Esc = sluiten
   - Dark mode toggle (localStorage)
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
  fsContent: document.getElementById("fsContent"),
  fsQ: document.getElementById("fsQuestion"),
  fsCat: document.getElementById("fsCategory"),
  fsPrev: document.getElementById("fsPrev"),
  fsNext: document.getElementById("fsNext"),

  toast: document.getElementById("toast"),
};

let TOPICS = [];           // { text, category }
let filtered = [];         // huidige grid lijst

// Fullscreen volgorde
let fsOrder = [];          // array van indices naar TOPICS
let fsIndex = 0;

// ---------- Helpers ----------
function norm(s) {
  return (s || "")
    .toString()
    .trim()
    .replace(/\s+/g, " ");
}

function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => els.toast.classList.remove("show"), 1200);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function setDarkMode(isDark) {
  document.body.classList.toggle("dark", !!isDark);
  localStorage.setItem("tea_dark", isDark ? "1" : "0");
}

function loadDarkMode() {
  const saved = localStorage.getItem("tea_dark");
  if (saved === "1") setDarkMode(true);
}

function safeCopy(text) {
  const t = norm(text);
  if (!t) return;

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(t).then(() => showToast("Gekopieerd ✓"));
  } else {
    // fallback
    const ta = document.createElement("textarea");
    ta.value = t;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    showToast("Gekopieerd ✓");
  }
}

// ---------- Topics laden & opschonen ----------
function parseRawTopics(raw) {
  // Pak vooral regels die eindigen op ? (jouw “Neem de tijd” etc. valt dan weg)
  const lines = (raw || "")
    .split(/\r?\n/)
    .map(norm)
    .filter(Boolean);

  const out = [];
  for (const line of lines) {
    // Skip rommel
    if (/^pickwic/i.test(line)) continue;
    if (/^neem( em)? de tijd/i.test(line)) continue;
    if (line.length < 8) continue;

    // Als er meerdere vragen in 1 regel staan: split op ? en voeg ? terug
    if (line.includes("?") && !line.trim().endsWith("?")) {
      const parts = line.split("?").map(p => norm(p)).filter(Boolean);
      for (const p of parts) {
        const q = p.endsWith("?") ? p : (p + "?");
        if (q.length >= 10) out.push(q);
      }
      continue;
    }

    // Alleen echte vragen
    if (!line.includes("?")) continue;
    if (!line.endsWith("?")) continue;

    out.push(line);
  }

  // Dedup (case-insensitive)
  const seen = new Set();
  const unique = [];
  for (const q of out) {
    const key = q.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(q);
  }
  return unique;
}

function inferCategory(text) {
  const t = text.toLowerCase();
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

async function loadTopics() {
  const res = await fetch("topics.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Kan topics.json niet laden.");
  const data = await res.json();

  // ondersteunt:
  //  - { topics: [{text, category}] }
  //  - { topicsRaw: "..." }
  if (Array.isArray(data.topics)) {
    TOPICS = data.topics
      .map(x => ({
        text: norm(x.text || x),
        category: norm(x.category) || inferCategory(x.text || x),
      }))
      .filter(x => x.text && x.text.includes("?"));
  } else if (typeof data.topicsRaw === "string") {
    const list = parseRawTopics(data.topicsRaw);
    TOPICS = list.map(q => ({ text: q, category: inferCategory(q) }));
  } else {
    TOPICS = [];
  }

  // eind-dedup nogmaals
  const seen = new Set();
  TOPICS = TOPICS.filter(t => {
    const k = t.text.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  els.total.textContent = String(TOPICS.length);

  buildCategorySelect();
  applyFilters();

  // Fullscreen order (shuffle zodat “random” echt random voelt)
  fsOrder = shuffle([...Array(TOPICS.length).keys()]);
  fsIndex = Math.floor(Math.random() * Math.max(1, fsOrder.length));
}

// ---------- UI: categorie + grid ----------
function buildCategorySelect() {
  const cats = ["Alle categorieën", ...Array.from(new Set(TOPICS.map(t => t.category))).sort((a,b)=>a.localeCompare(b, "nl"))];
  els.category.innerHTML = "";
  for (const c of cats) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    els.category.appendChild(opt);
  }
}

function applyFilters() {
  const q = norm(els.search.value).toLowerCase();
  const cat = els.category.value;

  filtered = TOPICS.filter(t => {
    if (cat && cat !== "Alle categorieën" && t.category !== cat) return false;
    if (q && !t.text.toLowerCase().includes(q)) return false;
    return true;
  });

  renderGrid(filtered);
  els.shown.textContent = String(filtered.length);
}

function renderGrid(list) {
  els.grid.innerHTML = "";
  for (const item of list) {
    const card = document.createElement("article");
    card.className = "card";
    card.tabIndex = 0;

    const p = document.createElement("p");
    p.textContent = item.text;

    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = item.category;

    card.appendChild(p);
    card.appendChild(badge);

    card.addEventListener("click", () => safeCopy(item.text));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        safeCopy(item.text);
      }
    });

    els.grid.appendChild(card);
  }
}

// ---------- Fullscreen ----------
function openFullscreen() {
  els.fs.hidden = false;
  document.body.style.overflow = "hidden";
  renderFullscreenCurrent();
}

function closeFullscreen() {
  els.fs.hidden = true;
  document.body.style.overflow = "";
}

function renderFullscreenCurrent() {
  if (!TOPICS.length) {
    els.fsQ.textContent = "Geen topics geladen…";
    els.fsCat.textContent = "";
    return;
  }
  const idx = fsOrder[fsIndex];
  const t = TOPICS[idx];
  els.fsQ.textContent = t.text;
  els.fsCat.textContent = t.category ? `Categorie: ${t.category}` : "";
}

function fsNext() {
  if (!TOPICS.length) return;
  fsIndex = (fsIndex + 1) % fsOrder.length;
  renderFullscreenCurrent();
}

function fsPrev() {
  if (!TOPICS.length) return;
  fsIndex = (fsIndex - 1 + fsOrder.length) % fsOrder.length;
  renderFullscreenCurrent();
}

// ---------- Events ----------
function wireEvents() {
  els.search.addEventListener("input", applyFilters);
  els.category.addEventListener("change", applyFilters);

  els.clear.addEventListener("click", () => {
    els.search.value = "";
    els.category.value = "Alle categorieën";
    applyFilters();
  });

  els.randomBtn.addEventListener("click", () => {
    // maak nieuwe shuffle zodat het écht random voelt
    fsOrder = shuffle([...Array(TOPICS.length).keys()]);
    fsIndex = 0;
    openFullscreen();
  });

  els.darkBtn.addEventListener("click", () => {
    const isDark = document.body.classList.contains("dark");
    setDarkMode(!isDark);
  });

  els.fsClose.addEventListener("click", closeFullscreen);
  els.fsNext.addEventListener("click", (e) => { e.stopPropagation(); fsNext(); });
  els.fsPrev.addEventListener("click", (e) => { e.stopPropagation(); fsPrev(); });

  // Klik op fullscreen content = volgende (behalve buttons)
  els.fsContent.addEventListener("click", (e) => {
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
    if (tag === "button") return;
    fsNext();
  });

  // Keyboard
  document.addEventListener("keydown", (e) => {
    if (els.fs.hidden) return;

    if (e.key === "Escape") {
      e.preventDefault();
      closeFullscreen();
      return;
    }
    if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      fsNext();
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      fsNext();
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      fsPrev();
      return;
    }
  });
}

// ---------- Init ----------
(async function init() {
  loadDarkMode();
  wireEvents();

  try {
    await loadTopics();

    // Start meteen fullscreen met random topic
    openFullscreen();
  } catch (err) {
    console.error(err);
    els.total.textContent = "0";
    els.shown.textContent = "0";
    els.grid.innerHTML = `<div class="card"><p>Kon topics niet laden. Controleer of topics.json naast index.html staat.</p><div class="badge">Fout</div></div>`;
    openFullscreen();
    els.fsQ.textContent = "Kon topics.json niet laden…";
    els.fsCat.textContent = "";
  }
})();
