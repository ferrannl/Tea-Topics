const TOPICS = [
  // =========================
  // LUCHTIG & FUN
  // =========================
  {text:"Wat is jouw favoriete ijssmaak?",cat:"Luchtig & Fun"},
  {text:"Wat is de leukste mop die je ooit hebt gehoord?",cat:"Luchtig & Fun"},
  {text:"Ben jij een ochtend- of een avondmens?",cat:"Luchtig & Fun"},
  {text:"Zing je wel eens onder de douche?",cat:"Luchtig & Fun"},
  {text:"Wat is het gekste dat je ooit hebt gedaan?",cat:"Luchtig & Fun"},
  {text:"Welk dier past het best bij jouw persoonlijkheid?",cat:"Luchtig & Fun"},
  {text:"Wat is jouw favoriete spel?",cat:"Luchtig & Fun"},
  {text:"Hou je meer van zoet of van hartig?",cat:"Luchtig & Fun"},
  {text:"Wat eet je het liefst bij het ontbijt?",cat:"Luchtig & Fun"},
  {text:"Wat is jouw favoriete feestdag?",cat:"Luchtig & Fun"},

  // =========================
  // PERSOONLIJK
  // =========================
  {text:"Wat maakt jou uniek?",cat:"Persoonlijk"},
  {text:"Waar ben je het meest trots op?",cat:"Persoonlijk"},
  {text:"Wat is jouw sterkste eigenschap?",cat:"Persoonlijk"},
  {text:"Wat wil je deze week bereiken?",cat:"Persoonlijk"},
  {text:"Hoe voel je je vandaag?",cat:"Persoonlijk"},
  {text:"Wat is jouw grootste wens?",cat:"Persoonlijk"},
  {text:"Wie kent jou het beste?",cat:"Persoonlijk"},
  {text:"Wat maakt jouw huis een thuis?",cat:"Persoonlijk"},
  {text:"Wat zou je willen veranderen aan jezelf?",cat:"Persoonlijk"},

  // =========================
  // HERINNERINGEN
  // =========================
  {text:"Wat is je mooiste jeugdherinnering?",cat:"Herinneringen"},
  {text:"Waar werd je als kind blij van?",cat:"Herinneringen"},
  {text:"Wat was jouw eerste baan?",cat:"Herinneringen"},
  {text:"Wat was de mooiste dag van je leven?",cat:"Herinneringen"},
  {text:"Welke geur brengt je terug naar vroeger?",cat:"Herinneringen"},
  {text:"Wat was je favoriete speelgoed?",cat:"Herinneringen"},

  // =========================
  // RELATIES
  // =========================
  {text:"Wie maakt jou blij?",cat:"Relaties"},
  {text:"Met wie zou je graag een kopje thee drinken?",cat:"Relaties"},
  {text:"Wie inspireert jou?",cat:"Relaties"},
  {text:"Wie zou je vandaag kunnen helpen?",cat:"Relaties"},
  {text:"Van wie word jij altijd vrolijk?",cat:"Relaties"},
  {text:"Wie zou je beter willen leren kennen?",cat:"Relaties"},

  // =========================
  // DROMEN & TOEKOMST
  // =========================
  {text:"Wat is jouw grootste droom?",cat:"Dromen & Toekomst"},
  {text:"Waar zie je jezelf over vijf jaar?",cat:"Dromen & Toekomst"},
  {text:"Wat zou je doen als alles mogelijk was?",cat:"Dromen & Toekomst"},
  {text:"Welke uitdaging wil je nog aangaan?",cat:"Dromen & Toekomst"},
  {text:"Welke taal zou je graag willen leren?",cat:"Dromen & Toekomst"},

  // =========================
  // REFLECTIE
  // =========================
  {text:"Wat heb je het afgelopen jaar geleerd?",cat:"Reflectie"},
  {text:"Wat betekent geluk voor jou?",cat:"Reflectie"},
  {text:"Wat is de belangrijkste les in je leven?",cat:"Reflectie"},
  {text:"Waar ben je dankbaar voor?",cat:"Reflectie"},
  {text:"Wat geeft jouw leven betekenis?",cat:"Reflectie"},

  // =========================
  // DAGELIJKS LEVEN
  // =========================
  {text:"Hoe ziet jouw ochtendritueel eruit?",cat:"Dagelijks Leven"},
  {text:"Wat doe jij het liefst in het weekend?",cat:"Dagelijks Leven"},
  {text:"Wat stel je vaak uit?",cat:"Dagelijks Leven"},
  {text:"Waar krijg jij energie van?",cat:"Dagelijks Leven"},
  {text:"Wat maakt een gewone dag goed?",cat:"Dagelijks Leven"},

  // =========================
  // THEE & RUST
  // =========================
  {text:"Waar kom jij echt tot rust?",cat:"Thee & Rust"},
  {text:"Wanneer drink jij het liefst thee?",cat:"Thee & Rust"},
  {text:"Wat doe jij om te ontspannen?",cat:"Thee & Rust"},
  {text:"Hoe laad jij jezelf op?",cat:"Thee & Rust"},
  {text:"Wat is jouw favoriete thee-moment?",cat:"Thee & Rust"},

  // =========================
  // CREATIVITEIT & INSPIRATIE
  // =========================
  {text:"Hoe uit jij je creativiteit?",cat:"Creativiteit & Inspiratie"},
  {text:"Wat inspireert jou?",cat:"Creativiteit & Inspiratie"},
  {text:"Welke muziek raakt jou?",cat:"Creativiteit & Inspiratie"},
  {text:"Welke film heeft indruk op je gemaakt?",cat:"Creativiteit & Inspiratie"},
  {text:"Wat zou je graag nog willen leren?",cat:"Creativiteit & Inspiratie"}
];

const grid = document.getElementById("grid");
const search = document.getElementById("search");
const filter = document.getElementById("categoryFilter");
const randomBtn = document.getElementById("randomBtn");

const categories = ["Alle", ...new Set(TOPICS.map(t=>t.cat))];
filter.innerHTML = categories.map(c=>`<option>${c}</option>`).join("");

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

search.oninput = filter.onchange = render;

randomBtn.onclick = ()=>{
  const list = TOPICS;
  const pick = list[Math.floor(Math.random()*list.length)];
  alert(pick.text);
};

render();
