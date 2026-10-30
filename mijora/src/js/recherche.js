// Moteur de recherche : compréhension d'une requête en langage naturel, filtres combinables, tri,
// suggestions et rendu des cartes. Fonctionne sur l'index JSON généré à partir de la base.
import { normaliser, esc, lien, ICONES } from "./outils.js";

const VIDES = new Set("je j veux voudrais cherche chercher trouver une un des de du d la le les l recette recettes plat plats idee idees cuisine cuisiner faire a au aux en avec pour et ou qui que quelque chose sur moins plus minutes minute min mn heure heures h max maximum".split(" "));

const REGIMES_MOTS = [
  [/\b(vegetariens?|vegetariennes?|veggie)\b/, "vegetarien"],
  [/\b(vegans?|veganes?|vegetaliens?|vegetaliennes?)\b/, "vegetalien"],
  [/\b(pescetariens?|pescetariennes?|pesco vegetariens?)\b/, "pescetarien"],
  [/\bsans gluten\b/, "sans-gluten"],
  [/\bsans lactose\b/, "sans-lactose"],
  [/\b(keto|ceto|cetogenes?)\b/, "keto"],
  [/\bhalal\b/, "halal"],
  [/\b(casher|kasher|cacher|kosher)\b/, "casher"],
  [/\bomnivores?\b/, "omnivore"],
  [/\bcarnivores?\b/, "carnivore"],
  [/\briches? en proteines\b/, "riche-en-proteines"],
];
const CATEGORIES_MOTS = [
  [/\b(entrees?|starters?)\b/, "entree"],
  [/\bplats? principa(l|ux)\b/, "plat-principal"],
  [/\baccompagnements?\b/, "accompagnement"],
  [/\bdesserts?\b/, "dessert"],
  [/\b(petits? dejeuners?|petit dej|brunch)\b/, "petit-dejeuner"],
  [/\bboissons?\b/, "boisson"],
  [/\b(snacks?|en cas|encas|apero|aperitif)\b/, "snack"],
];
const CONTINENTS_MOTS = [
  [/\b(amerique du nord|nord americaine?s?)\b/, "amerique-du-nord"],
  [/\b(amerique du sud|sud americaine?s?|latino americaine?s?)\b/, "amerique-du-sud"],
  [/\b(europe|europeens?|europeennes?)\b/, "europe"],
  [/\b(asie|asiatiques?)\b/, "asie"],
  [/\b(afrique|africaine?s?)\b/, "afrique"],
  [/\b(oceanie|oceaniens?|oceaniennes?)\b/, "oceanie"],
];
const DIFFICULTE_MOTS = [[/\b(faciles?|simples?|debutants?)\b/, "facile"], [/\bintermediaires?\b/, "intermediaire"], [/\b(difficiles?|elabores?|elaborees?)\b/, "difficile"]];
const BUDGET_MOTS = [[/\b(pas chere?s?|economiques?|petit budget|bon marche)\b/, "economique"], [/\b(budget moyen)\b/, "moyen"]];

// Motif tolérant au pluriel : « fruits à coque » → « fruits? as? coques? »
const motif = (x) => normaliser(x).split(" ").map((w) => w.replace(/s$/, "") + "s?").join(" ");

// Comprend une requête : renvoie les filtres reconnus et le texte restant
export function comprendre(q, index) {
  let t = " " + normaliser(q) + " ";
  const f = { regime: [], categorie: [], sans: [], difficulte: [], budget: [] };
  const retirer = (re) => { t = t.replace(new RegExp(re.source, "g"), " "); };

  const temps = t.match(/\b(?:en )?(?:moins d|max(?:imum)?|pas plus de|<)\s*(?:e |de )?(une|\d+)\s*(h|heures?|min|minutes?|mn)\b/) || t.match(/\b(\d+)\s*(min|minutes|mn)\b/);
  if (temps) {
    const n = temps[1] === "une" ? 1 : Number(temps[1]);
    f.max = /^h/.test(temps[2]) ? n * 60 : n;
    t = t.replace(temps[0], " ");
  }
  for (const [re, s] of REGIMES_MOTS) if (re.test(t)) { f.regime.push(s); retirer(re); }
  for (const a of index.allergenes) {
    const re = new RegExp(`\\bsans (?:${motif(a.nom)}|${motif(a.slug.replace(/-/g, " "))})\\b`);
    if (re.test(t)) { f.sans.push(a.slug); retirer(re); }
  }
  for (const [re, s] of CATEGORIES_MOTS) if (re.test(t)) { f.categorie.push(s); retirer(re); }
  for (const [re, s] of DIFFICULTE_MOTS) if (re.test(t)) { f.difficulte.push(s); retirer(re); }
  for (const [re, s] of BUDGET_MOTS) if (re.test(t)) { f.budget.push(s); retirer(re); }
  for (const [re, s] of CONTINENTS_MOTS) if (re.test(t)) { f.continent = s; retirer(re); break; }

  // Pays : noms puis gentilés (« japonaise »), du plus long au plus court
  const candidats = [];
  for (const p of index.pays) {
    for (const forme of [p.n, p.dm, p.df]) {
      const x = normaliser(forme);
      if (x.length > 2) candidats.push([x, p]);
    }
  }
  candidats.sort((a, b) => b[0].length - a[0].length);
  for (const [x, p] of candidats) {
    const re = new RegExp(`\\b${x.replace(/[-]/g, "[ -]")}s?\\b`);
    if (re.test(t)) { f.pays = p.s; retirer(re); break; }
  }
  const reste = t.split(" ").filter((m) => m && !VIDES.has(m) && !/^\d+$/.test(m)).join(" ");
  return { filtres: f, reste };
}

// ---------------------------------------------------------------- filtrage et tri
export const ETAT_VIDE = () => ({ q: "", continent: "", pays: "", region: "", regime: [], strict: false, categorie: [], temps: [], max: null, difficulte: [], budget: [], famille: [], sans: [], tri: "alpha", page: 1 });

function texteRecette(r) {
  return r._t ??= { titre: normaliser(r.t), original: normaliser(r.o), ing: normaliser(r.i.join(" ")), pays: normaliser(r.pn + " " + (r.r || "")) };
}

export function score(r, termes) {
  if (!termes.length) return 1;
  const x = texteRecette(r);
  let s = 0;
  for (const m of termes) {
    const re = new RegExp(`\\b${m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
    let v = 0;
    if (re.test(x.titre)) v = 5;
    else if (re.test(x.original)) v = 4;
    else if (re.test(x.pays)) v = 3;
    else if (re.test(x.ing)) v = 2;
    if (!v) return 0;
    s += v;
  }
  return s;
}

export function filtrer(index, e) {
  const termes = normaliser(e.q).split(" ").filter((m) => m && !VIDES.has(m));
  const okRegime = e.strict ? ["compatible"] : ["compatible", "adaptable", "selon-produits"];
  const evalues = new Set(index.regimes.filter((d) => d.ev).map((d) => d.s));
  const tranches = index.temps.filter((t) => e.temps.includes(t.slug));
  const res = [];
  for (const r of index.recettes) {
    if (e.continent && r.c !== e.continent) continue;
    if (e.pays && r.ps !== e.pays) continue;
    if (e.region && r.r !== e.region) continue;
    if (e.regime.some((s) => evalues.has(s) && !okRegime.includes(r.rg[s]))) continue;
    if (e.categorie.length && !e.categorie.includes(r.k)) continue;
    if (tranches.length && !tranches.some((t) => r.tt >= t.min && (t.max == null || r.tt < t.max))) continue;
    if (e.max && r.tt > e.max) continue;
    if (e.difficulte.length && !e.difficulte.includes(r.d)) continue;
    if (e.budget.length && !e.budget.includes(r.b)) continue;
    if (e.famille.some((f) => !r.f.includes(f))) continue;
    if (e.sans.some((a) => ["contient", "selon-produit"].includes(r.al[a]))) continue;
    const s = score(r, termes);
    if (!s) continue;
    res.push({ r, s });
  }
  const rang = Object.fromEntries(index.difficultes.map((d) => [d.slug, d.rang]));
  const alpha = (a, b) => a.r.t.localeCompare(b.r.t, "fr");
  const tris = {
    pertinence: (a, b) => b.s - a.s || alpha(a, b),
    duree: (a, b) => a.r.tt - b.r.tt || alpha(a, b),
    difficulte: (a, b) => rang[a.r.d] - rang[b.r.d] || a.r.tt - b.r.tt || alpha(a, b),
    alpha,
  };
  res.sort(tris[e.tri] ?? alpha);
  return res.map((x) => x.r);
}

// ---------------------------------------------------------------- suggestions
export function suggestions(q, index, max = 7) {
  const n = normaliser(q);
  if (n.length < 2) return [];
  const commence = (s) => normaliser(s).split(" ").some((m) => m.startsWith(n)) || normaliser(s).startsWith(n);
  const out = [];
  for (const r of index.recettes) if (commence(r.t) || commence(r.o)) out.push({ type: "Recette", texte: r.t, url: r.u, img: r.img });
  for (const p of index.pays) if (commence(p.n) || commence(p.dm) || commence(p.df)) out.push({ type: p.nb ? `Pays · ${p.nb} recette${p.nb > 1 ? "s" : ""}` : "Pays", texte: p.n, url: p.u, drapeau: p.dr });
  for (const d of index.regimes) if (commence(d.n)) out.push({ type: "Alimentation", texte: d.n, url: d.u });
  for (const i of index.ingredients) {
    if (!commence(i.n)) continue;
    const nb = index.recettes.filter((r) => r.is.includes(i.s)).length;
    if (nb) out.push({ type: `Ingrédient · ${nb} recette${nb > 1 ? "s" : ""}`, texte: i.n, url: `/explorer?q=${encodeURIComponent(i.n)}` });
  }
  return out.slice(0, max);
}

// Liste de suggestions accessible (motif combobox) branchée sur un champ
export function brancherSuggestions(input, liste, indexPromesse, { surChoix } = {}) {
  let actif = -1;
  let items = [];
  const fermer = () => { liste.innerHTML = ""; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); actif = -1; };
  const marquer = () => {
    [...liste.children].forEach((li, i) => li.firstElementChild.setAttribute("aria-selected", String(i === actif)));
    if (actif >= 0) input.setAttribute("aria-activedescendant", `${liste.id}-${actif}`);
    else input.removeAttribute("aria-activedescendant");
  };
  input.addEventListener("input", async () => {
    const index = await indexPromesse;
    items = suggestions(input.value, index);
    if (!items.length) return fermer();
    liste.innerHTML = items.map((s, i) => `<li role="presentation"><a class="suggestion" role="option" id="${liste.id}-${i}" aria-selected="false" href="${esc(lien(s.url))}">${s.img ? `<img src="${esc(lien(s.img))}" alt="">` : s.drapeau ? `<span class="drapeau">${s.drapeau}</span>` : ""}<span>${esc(s.texte)}</span><span class="suggestion-type">${esc(s.type)}</span></a></li>`).join("");
    input.setAttribute("aria-expanded", "true");
    actif = -1;
  });
  input.addEventListener("keydown", (ev) => {
    if (!items.length || input.getAttribute("aria-expanded") !== "true") return;
    if (ev.key === "ArrowDown") { ev.preventDefault(); actif = (actif + 1) % items.length; marquer(); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); actif = (actif - 1 + items.length) % items.length; marquer(); }
    else if (ev.key === "Enter" && actif >= 0) { ev.preventDefault(); const a = liste.querySelectorAll("a")[actif]; if (surChoix) surChoix(items[actif], a); else location.href = a.href; }
    else if (ev.key === "Escape") { ev.stopPropagation(); fermer(); }
  });
  input.addEventListener("blur", () => setTimeout(fermer, 180));
  return fermer;
}

// ---------------------------------------------------------------- cartes
const NOMS_BADGES = { vegetalien: "Végétalien", vegetarien: "Végétarien", pescetarien: "Pescétarien", "sans-gluten": "Sans gluten", "sans-lactose": "Sans lactose" };
const minutes = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? " " + String(m % 60).padStart(2, "0") : ""}`);

function badges(r) {
  const res = [];
  for (const s of Object.keys(NOMS_BADGES)) {
    const st = r.rg[s];
    if (s === "vegetarien" && r.rg.vegetalien === "compatible") continue;
    if (s === "pescetarien" && ["compatible", "adaptable", "selon-produits"].includes(r.rg.vegetarien)) continue;
    if (st === "compatible") res.push(`<li class="badge">${NOMS_BADGES[s]}</li>`);
    else if (st === "adaptable") res.push(`<li class="badge badge-adapt" title="Avec une adaptation">${NOMS_BADGES[s]}<span class="sr"> (avec une adaptation)</span>*</li>`);
  }
  return res.length ? `<ul class="badges" aria-label="Alimentation">${res.slice(0, 3).join("")}</ul>` : "";
}

export function carte(r, index, note = "") {
  const cat = index.categories.find((c) => c.slug === r.k).nom;
  return `<article class="carte-recette">
  <div class="carte-image"><img src="${esc(lien(r.img))}" alt="" width="800" height="600" loading="lazy" decoding="async"></div>
  <div class="carte-corps">
    <p class="carte-pays"><span class="drapeau" role="img" aria-label="Drapeau : ${esc(r.pn)}">${r.dr}</span> ${esc(r.pn)}${r.r ? ` · ${esc(r.r)}` : ""}</p>
    <h3 class="carte-titre"><a href="${esc(lien(r.u))}" class="lien-etendu">${esc(r.t)}</a></h3>
    <p class="carte-meta"><span>${esc(cat)}</span><span>${ICONES.horloge}${minutes(r.tt)}</span></p>
    ${note ? `<p class="resultat-note">${esc(note)}</p>` : ""}
    ${badges(r)}
  </div>
  ${r.demo ? '<span class="etiquette-demo" title="Recette de démonstration, en attente de vérification">À vérifier</span>' : ""}
  <button type="button" class="fav" data-fav="${esc(r.s)}" aria-pressed="false" aria-label="Ajouter « ${esc(r.t)} » aux favoris">${ICONES.coeur}</button>
</article>`;
}
