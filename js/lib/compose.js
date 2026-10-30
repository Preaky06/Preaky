// Assemblage du texte d'un prompt du catalogue, à partir du domaine, du modèle et des champs remplis.
import { CHAMPS } from "../data/catalogue/index.js";

const OPEN = "\u0001";
const CLOSE = "\u0002";
const mark = (s) => `${OPEN}${s}${CLOSE}`;
const val = (x, d) => (typeof x === "function" ? x(d) : x);

// Méthode et format des prompts propres à un domaine, selon leur catégorie
const METHODE_SPECIFIQUE = {
  redaction: [
    "Identifie le lecteur, ce qu'il sait déjà et ce qu'il doit faire après lecture.",
    "Construis un plan simple avant de rédiger.",
    "Rédige avec des phrases courtes et des mots concrets du métier, expliqués si besoin.",
    "Relis pour supprimer le superflu et vérifier chaque information.",
  ],
  analyse: [
    "Liste les données dont tu disposes et celles qui manquent.",
    "Analyse étape par étape, calculs visibles.",
    "Sépare les constats, les hypothèses et les recommandations.",
    "Classe les recommandations par impact et par facilité.",
  ],
  strategie: [
    "Pose le point de départ et l'objectif visé.",
    "Identifie les leviers possibles et leurs risques.",
    "Choisis les priorités, en expliquant pourquoi.",
    "Transforme-les en plan d'action daté.",
  ],
  creation: [
    "Propose plusieurs pistes nettement différentes.",
    "Développe la plus prometteuse en détail.",
    "Rends chaque proposition concrète et réalisable avec mes moyens.",
    "Indique comment tester ou améliorer le résultat.",
  ],
  organisation: [
    "Liste tout ce qu'il y a à faire, sans rien oublier.",
    "Ordonne les étapes et estime le temps de chacune.",
    "Prévois les points de contrôle et les imprévus.",
    "Donne un format facile à suivre au quotidien.",
  ],
  communication: [
    "Clarifie le message principal et l'émotion à prendre en compte.",
    "Prépare les phrases clés, simples et directes.",
    "Anticipe les réactions possibles et les réponses.",
    "Termine par la suite à donner.",
  ],
  relation: [
    "Comprends la situation du point de vue de l'autre personne.",
    "Reconnais ce qui doit l'être, sans promettre ce qui n'est pas possible.",
    "Propose une solution concrète et un délai.",
    "Prévois le suivi.",
  ],
  apprentissage: [
    "Commence par l'essentiel, en quelques phrases.",
    "Explique pas à pas, avec des exemples concrets.",
    "Signale les erreurs fréquentes.",
    "Termine par un exercice ou des questions pour vérifier.",
  ],
};

const FORMAT_SPECIFIQUE = {
  redaction: "Le texte prêt à l'emploi, puis 2 variantes de la phrase d'ouverture.",
  analyse: "Des intertitres, des tableaux pour les chiffres, puis une synthèse de 5 lignes.",
  strategie: "Une synthèse, puis un plan d'action en tableau (action, responsable, échéance).",
  creation: "Les pistes en bref, puis la piste retenue en détail.",
  organisation: "Une checklist ou un planning en tableau, facile à imprimer.",
  communication: "Le déroulé, avec les phrases clés, puis ce qu'il faut éviter de dire.",
  relation: "Le message ou le script prêt à l'emploi, puis le suivi à prévoir.",
  apprentissage: "Une explication structurée avec intertitres, puis l'exercice de vérification.",
};

const PROS = ["b2c", "b2b", "employe", "sante"];

// Champs d'une entrée de catalogue
export function fieldsOf(entry) {
  if (entry.m) return entry.m.f;
  const pro = entry.d.kinds.some((k) => PROS.includes(k));
  return pro ? ["activite", "contexte_sp", "contraintes_sp"] : ["contexte_sp", "contraintes_sp"];
}

export const CHAMPS_SPECIFIQUES = {
  contexte_sp: { l: "Ta situation", p: "Les informations utiles : contexte, chiffres, contraintes, ce que tu as déjà essayé", long: true },
  contraintes_sp: { l: "Contraintes ou précisions", p: "Ex. : budget, délai, ton souhaité, ce qu'il faut éviter", long: true, opt: true },
};

export function champ(key) {
  return CHAMPS[key] || CHAMPS_SPECIFIQUES[key];
}

export function placeholder(key, d) {
  const c = champ(key);
  return c ? val(c.p, d) || "" : "";
}

function slot(key, value) {
  const c = champ(key);
  const v = String(value ?? "").trim();
  if (v) return { text: v.split("\n").map((row) => (row.trim() ? mark(row) : row)).join("\n"), state: "ok" };
  if (c?.opt) return { state: "skip" };
  return { text: mark(`[À COMPLÉTER : ${c?.l ?? key}]`), state: "miss" };
}

export const DEFAULT_OPTS = { questions: true, variantes: false };

export function buildPrompt(entry, values = {}, opts = DEFAULT_OPTS) {
  const { d, m, s } = entry;
  const missing = [];

  const contexte = [`- Domaine : ${d.nom}`];
  if (m?.ctx) contexte.push(...m.ctx(d).map((l) => `- ${l}`));
  for (const key of fieldsOf(entry)) {
    const sl = slot(key, values[key]);
    if (sl.state === "skip") continue;
    if (sl.state === "miss") missing.push(key);
    const label = champ(key)?.l ?? key;
    // « Où l'annoncer ? Instagram » plutôt que « Où l'annoncer ? : Instagram »
    const sep = label.endsWith("?") ? "" : " :";
    contexte.push(sl.text.includes("\n") ? `- ${label}${sep}\n${sl.text}` : `- ${label}${sep} ${sl.text}`);
  }

  const mission = m ? val(m.m, d) : s.m;
  const methode = (m ? val(m.s, d) : METHODE_SPECIFIQUE[s.cat] || METHODE_SPECIFIQUE.strategie).map((x, i) => `${i + 1}. ${x}`);
  const format = m ? val(m.o, d) : FORMAT_SPECIFIQUE[s.cat] || FORMAT_SPECIFIQUE.strategie;

  const regles = [];
  if (d.regles) regles.push(`- Respecte les règles propres à ce domaine (${d.regles}) et signale ce qui doit être vérifié.`);
  for (const g of m?.g || []) regles.push(`- ${g}`);
  regles.push("- N'invente aucun chiffre, aucune source ni aucun fait : si une information manque, signale-la ou marque [À COMPLÉTER].");

  const fin = [];
  if (opts.variantes) fin.push("Propose 2 ou 3 versions nettement différentes, puis dis laquelle tu recommandes.");
  fin.push(
    opts.questions
      ? "Si une information essentielle te manque, pose-moi d'abord jusqu'à 3 questions courtes et attends mes réponses."
      : "Ne me pose pas de questions : fais des hypothèses raisonnables et signale-les en une ligne.",
  );
  fin.push("Réponds en français.");

  const sections = [
    `Tu es ${d.role}.`,
    `## Contexte\n${contexte.join("\n")}`,
    `## Ta mission\n${mission}`,
    `## Méthode\n${methode.join("\n")}`,
    `## Format de réponse\n${format}`,
    `## Règles\n${regles.join("\n")}`,
    `## Avant de commencer\n${fin.join("\n")}`,
  ];
  const marked = sections.join("\n\n");
  return {
    text: marked.replace(/[\u0001\u0002]/g, ""),
    html: toHtml(marked),
    missing,
    relance: m?.rl || "Approfondis le point le plus important de ta réponse, avec un exemple concret.",
  };
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

function toHtml(marked) {
  return marked
    .split("\n")
    .map((row) => {
      const html = escapeHtml(row).replace(/\u0001([\s\S]*?)\u0002/g, (_, inner) =>
        inner.startsWith("[À COMPLÉTER") ? `<mark class="v v--miss">${inner}</mark>` : `<mark class="v">${inner}</mark>`,
      );
      return row.startsWith("## ") ? `<span class="p-h">${html}</span>` : html;
    })
    .join("\n");
}
