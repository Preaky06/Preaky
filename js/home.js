import { STATS } from "./data/stats.js";
import { icon } from "./lib/icons.js";
import { initHeader, initReveal, initSmoothScroll, countUp, reducedMotion } from "./lib/ui.js";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const nf = new Intl.NumberFormat("fr-FR");
const searchUrl = (q) => `bibliotheque.html?q=${encodeURIComponent(q)}`;
const ideaUrl = (idea) => `creer.html?idee=${encodeURIComponent(idea)}`;

function chipDomain(nom, univers) {
  const u = STATS.parUnivers.find((x) => x.id === univers);
  return `<span class="chip-type" data-color="${u.couleur}"><span class="chip-type__icon">${icon(u.icon)}</span>${esc(nom)}</span>`;
}

function renderExamples() {
  const hero = document.querySelector("[data-hero-examples]");
  hero?.insertAdjacentHTML(
    "beforeend",
    ["restaurant", "CV", "révisions de maths", "avis négatif", "course à pied"].map((q) => `<a class="chip" href="${searchUrl(q)}">${esc(q)}</a>`).join(""),
  );
  const custom = document.querySelector("[data-custom-examples]");
  custom?.insertAdjacentHTML(
    "beforeend",
    ["Un conte pour endormir ma fille", "Un poème pour les 60 ans de ma mère", "Discours de témoin pour le mariage de mon frère"]
      .map((idea) => `<a class="chip" href="${ideaUrl(idea)}">${esc(idea)}</a>`)
      .join(""),
  );
}

function renderUnivers() {
  const root = document.querySelector("[data-univers]");
  if (!root) return;
  root.innerHTML = STATS.parUnivers
    .map(
      (u, i) => `
    <article class="tcard ucard" data-color="${u.couleur}" data-reveal style="--d:${(i % 3) * 0.06}s">
      <div class="ucard__head">
        <span class="tcard__icon">${icon(u.icon)}</span>
        <p class="ucard__count">${nf.format(u.prompts)}&nbsp;prompts<br />${u.domaines.length}&nbsp;domaines</p>
      </div>
      <h3 class="tcard__name">${esc(u.nom)}</h3>
      <p class="tcard__text">${esc(u.description)}</p>
      <div class="ucard__doms">${u.domaines.map((d) => `<a href="bibliotheque.html?domaine=${d.id}">${esc(d.nom)}</a>`).join("")}</div>
      <a class="tcard__go" href="bibliotheque.html?univers=${u.id}">Explorer cet univers ${icon("arrow")}</a>
    </article>`,
    )
    .join("") +
    `<article class="tcard ucard ucard--all" data-reveal>
      <h3 class="tcard__name">Toute la bibliothèque</h3>
      <p class="tcard__text">${nf.format(STATS.prompts)}&nbsp;prompts, ${STATS.domaines}&nbsp;domaines. Cherche par métier, par tâche ou par matière.</p>
      <a class="tcard__go" href="bibliotheque.html">Ouvrir la bibliothèque ${icon("arrow")}</a>
    </article>`;
}

function renderCounts() {
  document.querySelectorAll("[data-stat]").forEach((el) => {
    el.textContent = nf.format(STATS[el.dataset.stat]);
  });
  document.querySelectorAll("[data-count]").forEach((el) => countUp(el, STATS[el.dataset.count]));
}

// ---------- Démo de la bibliothèque dans le hero ----------

const SCENES = [
  {
    query: "restaurant",
    domaine: ["Restaurant", "restauration"],
    results: ["Créer une carte de saison", "Calculer le coût de revient d'un plat", "Remplir le restaurant en semaine"],
    pick: 0,
    field: "Ton activité ou ta structure",
    value: "Bistrot de 40 couverts à Nantes",
    lines: [
      "Tu es un restaurateur expérimenté, également consultant en restauration.",
      "Ton activité : <mark class=\"v\">bistrot de 40 couverts à Nantes</mark>",
      "Propose une carte de saison courte (4 entrées, 5 plats, 3 desserts).",
      "Respecte l'hygiène alimentaire, les allergènes et l'affichage des prix.",
    ],
  },
  {
    query: "course à pied",
    domaine: ["Course à pied", "forme"],
    results: ["Plan pour courir 5 km", "Préparer un semi-marathon", "Choisir mes chaussures"],
    pick: 0,
    field: "Ta situation",
    value: "Jamais couru, libre 3 soirs par semaine",
    lines: [
      "Tu es un entraîneur d'athlétisme diplômé, habitué aux coureurs amateurs.",
      "Ta situation : <mark class=\"v\">jamais couru, libre 3 soirs par semaine</mark>",
      "Crée un plan de 8 semaines pour passer de zéro à 5 km sans t'arrêter.",
      "Progressivité, échauffement, avis médical en cas de doute.",
    ],
  },
  {
    query: "CV reconversion",
    domaine: ["Reconversion professionnelle", "carriere"],
    results: ["Refaire mon CV", "Tester un métier avant de me lancer", "Financer ma reconversion"],
    pick: 0,
    field: "Le poste visé",
    value: "Chargée de communication",
    lines: [
      "Tu es un conseiller en évolution professionnelle spécialisé dans les reconversions.",
      "Le poste visé : <mark class=\"v\">chargée de communication</mark>",
      "Aide-moi à refaire mon CV, dans ma situation : je prépare une reconversion.",
      "Si une information te manque, pose-moi d'abord jusqu'à 3 questions.",
    ],
  },
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function initDemo() {
  const demo = document.querySelector(".demo");
  if (!demo) return;
  const el = (name) => demo.querySelector(`[data-demo="${name}"]`);
  const query = el("idea");
  const found = el("detect");
  const q1 = el("q1");
  const opts = el("opts");
  const q2 = el("q2");
  const a2 = el("a2");
  const answer = el("answer");
  const lines = el("lines");
  const count = el("count");
  const copied = el("copied");

  let visible = true;
  new IntersectionObserver((entries) => (visible = entries[0].isIntersecting)).observe(demo);
  const gate = async () => {
    while (!visible || document.hidden) await wait(300);
  };

  const type = async (target, text, node) => {
    node.classList.add("is-typing");
    for (let i = 1; i <= text.length; i++) {
      await gate();
      target.textContent = text.slice(0, i);
      await wait(24 + Math.random() * 40);
    }
    node.classList.remove("is-typing");
  };

  const show = (scene, full) => {
    query.textContent = full ? scene.query : "";
    found.innerHTML = full ? chipDomain(...scene.domaine) : "";
    q1.textContent = full ? "Choisis un prompt" : "";
    opts.innerHTML = full ? scene.results.map((o, i) => `<span class="demo__opt${i === scene.pick ? " is-on" : ""}">${esc(o)}</span>`).join("") : "";
    q2.textContent = full ? scene.field : "";
    a2.textContent = full ? scene.value : "";
    lines.innerHTML = scene.lines.map((l) => `<span class="demo__line${full ? " is-on" : ""}">${l}</span>`).join("");
    count.textContent = full ? "Prêt à copier" : "";
  };

  if (reducedMotion) {
    show(SCENES[0], true);
    return;
  }

  const play = async () => {
    for (let s = 0; ; s = (s + 1) % SCENES.length) {
      const scene = SCENES[s];
      show(scene, false);
      await wait(500);
      await type(query, scene.query, query);
      await wait(350);
      found.innerHTML = chipDomain(...scene.domaine);
      await wait(500);
      q1.textContent = "Choisis un prompt";
      opts.innerHTML = scene.results.map((o) => `<span class="demo__opt">${esc(o)}</span>`).join("");
      await wait(800);
      await gate();
      opts.children[scene.pick].classList.add("is-on");
      const lineEls = lines.querySelectorAll(".demo__line");
      lineEls[0].classList.add("is-on");
      await wait(500);
      q2.textContent = scene.field;
      await type(a2, scene.value, answer);
      lineEls[1].classList.add("is-on");
      await wait(350);
      lineEls[2].classList.add("is-on");
      await wait(350);
      lineEls[3].classList.add("is-on");
      count.textContent = "Prêt à copier";
      await wait(700);
      copied.classList.add("is-on");
      await wait(1700);
      copied.classList.remove("is-on");
      await wait(900);
      await gate();
    }
  };
  play();
}

// Champ d'idée du créateur sur mesure : la zone grandit avec le texte (rien n'est coupé), Entrée envoie
function initIdeaForms() {
  const grows = [...document.querySelectorAll(".idea-form textarea")].map((area) => {
    const grow = () => {
      area.style.height = "auto";
      area.style.height = `${area.scrollHeight}px`;
    };
    area.addEventListener("input", grow);
    area.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.shiftKey) return;
      e.preventDefault();
      if (area.value.trim()) area.form.requestSubmit();
    });
    return grow;
  });
  const growAll = () => grows.forEach((grow) => grow());
  growAll();
  // La hauteur dépend de la police et de la largeur : on la recalcule quand elles changent
  document.fonts?.ready.then(growAll);
  window.addEventListener("resize", growAll, { passive: true });
}

renderExamples();
initIdeaForms();
renderUnivers();
renderCounts();
initHeader();
initReveal();
initSmoothScroll();
initDemo();
