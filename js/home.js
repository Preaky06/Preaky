import { TYPES, TYPE_BY_ID, visibleQuestions } from "./data/types/index.js";
import { icon } from "./lib/icons.js";
import { initHeader, initReveal, initSmoothScroll, countUp, reducedMotion } from "./lib/ui.js";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const ideaUrl = (idea) => `creer.html?idee=${encodeURIComponent(idea)}`;

function chipType(type) {
  return `<span class="chip-type" data-color="${type.couleur}"><span class="chip-type__icon">${icon(type.icon)}</span>${esc(type.nom)}</span>`;
}

function renderHeroExamples() {
  const root = document.querySelector("[data-hero-examples]");
  if (!root) return;
  const picks = ["histoire", "business", "apprendre", "poeme", "travail"].map((id) => TYPE_BY_ID[id].exemples[0]);
  root.insertAdjacentHTML("beforeend", picks.map((ex) => `<a class="chip" href="${ideaUrl(ex)}">${esc(ex)}</a>`).join(""));
}

function renderTypes() {
  const root = document.querySelector("[data-types]");
  if (!root) return;
  root.innerHTML = TYPES.map(
    (t, i) => `
    <article class="tcard" data-color="${t.couleur}" data-reveal style="--d:${(i % 3) * 0.06}s">
      <span class="tcard__icon">${icon(t.icon)}</span>
      <h3 class="tcard__name">${esc(t.nom)}</h3>
      <p class="tcard__text">${esc(t.description)}</p>
      <div class="tcard__ex">${t.exemples.slice(0, 2).map((ex) => `<a href="${ideaUrl(ex)}">« ${esc(ex)} »</a>`).join("")}</div>
      <a class="tcard__go" href="creer.html?type=${t.id}">Commencer ${icon("arrow")}</a>
    </article>`,
  ).join("");
}

function renderCounts() {
  const totals = {
    types: TYPES.length,
    questions: TYPES.reduce((n, t) => n + t.questions.length, 0),
    min: Math.min(...TYPES.map((t) => visibleQuestions(t, {}).length)),
    max: Math.max(...TYPES.map((t) => t.questions.length)),
  };
  document.querySelectorAll("[data-count]").forEach((el) => {
    const to = totals[el.dataset.count];
    if (el.classList.contains("stat__n")) countUp(el, to);
    else el.textContent = to;
  });
}

// ---------- Démo du questionnaire dans le hero ----------

const SCENES = [
  {
    idea: "Un poème pour les 60 ans de ma mère",
    type: "poeme",
    q1: "Quel ton ?",
    opts: ["Tendre", "Drôle", "Solennel", "Mélancolique"],
    on: [0, 1],
    q2: "Détails personnels à glisser",
    a2: "Sylvie, nos dimanches à Biarritz, elle chante faux",
    lines: [
      "Tu es poète. Tu écris des textes précis, imagés et sincères.",
      "Forme : <mark class=\"v\">poème rimé</mark>",
      "Ton : <mark class=\"v\">tendre, drôle</mark>",
      "Détails : <mark class=\"v\">Sylvie, nos dimanches à Biarritz, elle chante faux</mark>",
    ],
  },
  {
    idea: "Lancer un food truck à Lyon",
    type: "business",
    q1: "De quoi as-tu besoin en priorité ?",
    opts: ["Vérifier que l'idée tient la route", "Écrire un business plan", "Trouver des clients"],
    on: [0],
    q2: "Ton budget et ton temps",
    a2: "15 000 €, à temps plein",
    lines: [
      "Tu es consultant en création d'entreprise, concret et honnête sur les risques.",
      "Besoin : <mark class=\"v\">vérifier que l'idée tient la route</mark>",
      "Budget et temps : <mark class=\"v\">15 000 €, à temps plein</mark>",
      "Calcule le point mort, avec tes hypothèses écrites.",
    ],
  },
  {
    idea: "Comprendre comment fonctionne la blockchain",
    type: "apprendre",
    q1: "Quel est ton niveau sur le sujet ?",
    opts: ["Je pars de zéro", "J'ai quelques notions", "Je connais bien"],
    on: [0],
    q2: "Dans quel cadre ?",
    a2: "Pour mon travail dans une banque",
    lines: [
      "Tu es un pédagogue expert du sujet.",
      "Niveau : <mark class=\"v\">je pars de zéro</mark>",
      "Cadre : <mark class=\"v\">pour mon travail dans une banque</mark>",
      "Termine par 3 questions pour vérifier que j'ai compris.",
    ],
  },
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function initDemo() {
  const demo = document.querySelector(".demo");
  if (!demo) return;
  const el = (name) => demo.querySelector(`[data-demo="${name}"]`);
  const idea = el("idea");
  const detect = el("detect");
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
    const t = TYPE_BY_ID[scene.type];
    idea.textContent = full ? scene.idea : "";
    detect.innerHTML = full ? chipType(t) : "";
    q1.textContent = full ? scene.q1 : "";
    opts.innerHTML = full ? scene.opts.map((o, i) => `<span class="demo__opt${scene.on.includes(i) ? " is-on" : ""}">${esc(o)}</span>`).join("") : "";
    q2.textContent = full ? scene.q2 : "";
    a2.textContent = full ? scene.a2 : "";
    lines.innerHTML = scene.lines.map((l) => `<span class="demo__line${full ? " is-on" : ""}">${l}</span>`).join("");
    count.textContent = full ? "Prompt complet" : "";
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
      await type(idea, scene.idea, idea);
      await wait(350);
      detect.innerHTML = chipType(TYPE_BY_ID[scene.type]);
      const lineEls = lines.querySelectorAll(".demo__line");
      lineEls[0].classList.add("is-on");
      await wait(600);
      q1.textContent = scene.q1;
      opts.innerHTML = scene.opts.map((o) => `<span class="demo__opt">${esc(o)}</span>`).join("");
      await wait(700);
      for (const i of scene.on) {
        await gate();
        opts.children[i].classList.add("is-on");
        await wait(380);
      }
      lineEls[1].classList.add("is-on");
      await wait(300);
      q2.textContent = scene.q2;
      await type(a2, scene.a2, answer);
      lineEls[2].classList.add("is-on");
      await wait(400);
      lineEls[3].classList.add("is-on");
      count.textContent = "Prompt complet";
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

// Champs d'idée : la zone grandit avec le texte (rien n'est coupé), Entrée envoie
function initIdeaForms() {
  const grows = [...document.querySelectorAll(".idea-form")].map((form) => {
    const area = form.querySelector("textarea");
    const grow = () => {
      area.style.height = "auto";
      area.style.height = `${area.scrollHeight}px`;
    };
    area.addEventListener("input", grow);
    area.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.shiftKey) return;
      e.preventDefault();
      if (area.value.trim()) form.requestSubmit();
    });
    return grow;
  });
  const growAll = () => grows.forEach((grow) => grow());
  growAll();
  // La hauteur dépend de la police et de la largeur : on la recalcule quand elles changent
  document.fonts?.ready.then(growAll);
  window.addEventListener("resize", growAll, { passive: true });
}

renderHeroExamples();
initIdeaForms();
renderTypes();
renderCounts();
initHeader();
initReveal();
initSmoothScroll();
initDemo();
