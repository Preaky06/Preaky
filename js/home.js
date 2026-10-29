import { METIERS, CATEGORIES, PARCOURS } from "./data/metiers.js";
import { VARIABLES } from "./data/variables.js";
import { PROMPTS } from "./data/prompts/index.js";
import { compile, typo } from "./lib/prompt.js";
import { icon } from "./lib/icons.js";
import { initHeader, initReveal, initSmoothScroll, countUp, reducedMotion } from "./lib/ui.js";

const byId = Object.fromEntries(PROMPTS.map((p) => [p.id, p]));
const metierById = Object.fromEntries(METIERS.map((m) => [m.id, m]));
const PALETTE = [
  { c: "var(--blue)", fg: "var(--white)" },
  { c: "var(--night)", fg: "var(--white)" },
  { c: "var(--orange)", fg: "var(--night)" },
  { c: "var(--lime)", fg: "var(--night)" },
];

function renderMetiers() {
  const root = document.querySelector("[data-metiers]");
  if (!root) return;
  root.innerHTML = METIERS.map((m, i) => {
    const n = PROMPTS.filter((p) => p.metier === m.id).length;
    const col = PALETTE[i % PALETTE.length];
    return `
      <a class="mcard" href="bibliotheque.html?metier=${m.id}" data-reveal style="--d:${(i % 4) * 0.06}s">
        <span class="mcard__top">
          <span class="mcard__icon" style="--c:${col.c};--fg:${col.fg}">${icon(m.icon)}</span>
          <span class="mcard__count">${n} prompts</span>
        </span>
        <h3 class="mcard__name">${m.nom}</h3>
        <p class="mcard__text">${typo(m.accroche)}</p>
        <ul class="mcard__tasks">${m.taches.map((t) => `<li>${icon("check")}${t}</li>`).join("")}</ul>
        <span class="mcard__go">Voir les prompts ${icon("arrow")}</span>
      </a>`;
  }).join("");
}

function renderParcours() {
  const root = document.querySelector("[data-parcours]");
  if (!root) return;
  const shown = ["cm", "commercial", "immo", "juridique"];
  root.innerHTML = PARCOURS.filter((p) => shown.includes(p.metier))
    .map((p) => {
      const m = metierById[p.metier];
      return `
        <li><a href="bibliotheque.html?metier=${m.id}">
          <span class="plist__icon">${icon(m.icon)}</span>
          <span class="plist__name">${p.titre}<span class="plist__meta">${m.nom}</span></span>
          <span class="plist__steps">${p.etapes.length} étapes</span>
        </a></li>`;
    })
    .join("");
}

function renderCounts() {
  const totals = { prompts: PROMPTS.length, metiers: METIERS.length, parcours: PARCOURS.length };
  document.querySelectorAll("[data-count]").forEach((el) => {
    const to = totals[el.dataset.count];
    if (el.classList.contains("stat__n")) countUp(el, to);
    else el.textContent = to;
  });
}

// ---------- Démo du constructeur dans le hero ----------

const SCENARIOS = [
  {
    id: "immo-annonce",
    typed: ["bien", "quartier"],
    values: {
      bien: "T3 de 68 m², 3e étage, balcon plein sud",
      quartier: "Tram à 3 min, école à 5 min",
      prix_bien: "289 000 € honoraires inclus",
      dpe: "C / B",
      cible: "Jeunes couples, premier achat",
    },
  },
  {
    id: "rh-fiche-poste",
    typed: ["poste", "conditions"],
    values: {
      activite: "Agence web de 25 personnes à Lyon",
      poste: "Chargé·e de clientèle",
      missions: "Suivi de 40 comptes, devis, accueil des nouveaux clients",
      conditions: "CDI, 34-38 k€, 2 jours de télétravail",
      equipe: "Équipe de 5, manager présente depuis 4 ans",
      pays: "France",
    },
  },
  {
    id: "cm-hooks",
    typed: ["sujet_video", "promesse"],
    values: {
      sujet_video: "3 erreurs d'une coloration maison",
      cible: "Personnes qui font leur couleur seules",
      ton: "Direct, complice, tutoiement",
      promesse: "Éviter une couleur ratée",
    },
  },
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function initDemo() {
  const demo = document.querySelector(".demo");
  if (!demo) return;
  const q = (name) => demo.querySelector(`[data-demo="${name}"]`);
  const els = {
    metier: q("metier"),
    categorie: q("categorie"),
    titre: q("titre"),
    fields: [q("f0"), q("f1")],
    preview: q("preview"),
    copy: q("copy"),
    copied: q("copied"),
  };

  let visible = true;
  new IntersectionObserver((entries) => (visible = entries[0].isIntersecting)).observe(demo);
  const gate = async () => {
    while (!visible || document.hidden) await wait(300);
  };

  const render = (prompt, values, activeKey) => {
    els.preview.innerHTML = compile(prompt, values).html;
    const mark = activeKey && els.preview.querySelector(`mark[data-key="${activeKey}"]`);
    if (mark) els.preview.scrollTop = Math.max(0, mark.offsetTop - 48);
  };

  const setScene = (scene, values) => {
    const prompt = byId[scene.id];
    els.metier.textContent = metierById[prompt.metier].nom;
    els.categorie.textContent = CATEGORIES.find((c) => c.id === prompt.categorie).nom;
    els.titre.textContent = prompt.titre;
    scene.typed.forEach((key, i) => {
      els.fields[i].querySelector(".demo__label").textContent = VARIABLES[key].label;
      els.fields[i].querySelector(".demo__value").textContent = values[key] || "";
      els.fields[i].classList.remove("is-active");
    });
    render(prompt, values, scene.typed[0]);
    return prompt;
  };

  if (reducedMotion) {
    setScene(SCENARIOS[0], SCENARIOS[0].values);
    return;
  }

  const play = async () => {
    for (let s = 0; ; s = (s + 1) % SCENARIOS.length) {
      const scene = SCENARIOS[s];
      const values = { ...scene.values };
      scene.typed.forEach((k) => (values[k] = ""));
      const prompt = setScene(scene, values);
      await wait(700);

      for (let i = 0; i < scene.typed.length; i++) {
        const key = scene.typed[i];
        const field = els.fields[i];
        const out = field.querySelector(".demo__value");
        field.classList.add("is-active");
        const text = scene.values[key];
        for (let c = 1; c <= text.length; c++) {
          await gate();
          values[key] = text.slice(0, c);
          out.textContent = values[key];
          render(prompt, values, key);
          await wait(26 + Math.random() * 44);
        }
        await wait(350);
        field.classList.remove("is-active");
      }

      await wait(500);
      els.copy.style.scale = "0.95";
      await wait(140);
      els.copy.style.scale = "";
      els.copied.classList.add("is-on");
      await wait(1600);
      els.copied.classList.remove("is-on");
      await wait(900);
      await gate();
    }
  };
  play();
}

renderMetiers();
renderParcours();
renderCounts();
initHeader();
initReveal();
initSmoothScroll();
initDemo();
