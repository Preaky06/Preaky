// Outils d'écriture des prompts : chaque type d'idée construit ses sections
// avec ces fonctions, puis assemble() produit le texte final.

export const AUTO = "__auto";

// Les réponses de la personne sont encadrées par ces deux caractères :
// le texte copié les retire, l'aperçu les surligne.
const OPEN = "\u0001";
const CLOSE = "\u0002";
const AUTO_TEXT = "à toi de choisir ce qui sert le mieux mon objectif (indique ton choix en une phrase)";

export const mark = (s) => `${OPEN}${s}${CLOSE}`;
export const clean = (s) => String(s ?? "").replace(/[\u0001\u0002]/g, "");

// « - Libellé : valeur », ou rien si la valeur est vide
export function line(label, value) {
  return value ? `- ${label} : ${value}` : null;
}

// Liste numérotée, sans les entrées vides
export function steps(items) {
  return items.filter(Boolean).map((s, i) => `${i + 1}. ${s}`);
}

// Section : titre + lignes (les lignes vides sont ignorées, une section vide disparaît)
export function sec(titre, ...lignes) {
  return { titre, lignes: lignes.flat().filter(Boolean) };
}

// Un libellé de choix s'insère dans une phrase : « Tendre » devient « tendre »,
// sauf les noms propres et sigles (option.keep, ou deux capitales au début).
function inSentence(option) {
  const label = option.label;
  if (option.keep || /^[A-Z0-9]{2}/.test(label)) return label;
  return label.charAt(0).toLowerCase() + label.slice(1);
}

export function context(type, idea, answers) {
  const byId = Object.fromEntries(type.questions.map((q) => [q.id, q]));
  const raw = (id) => answers[id];
  const isAuto = (id) => raw(id) === AUTO;
  const text = (id) => {
    const v = raw(id);
    if (v == null || v === AUTO || Array.isArray(v)) return "";
    return String(v).trim();
  };
  const options = (id) => {
    const q = byId[id];
    const v = raw(id);
    if (!q || v == null || v === "" || v === AUTO) return [];
    return (Array.isArray(v) ? v : [v]).map((x) => q.options?.find((o) => o.v === x)).filter(Boolean);
  };

  return {
    idea: mark(clean(idea).replace(/\s+/g, " ").trim()),
    raw,
    auto: isAuto,
    has: (id) => (Array.isArray(raw(id)) ? raw(id).length > 0 : raw(id) != null && String(raw(id)).trim() !== ""),
    is: (id, value) => (Array.isArray(raw(id)) ? raw(id).includes(value) : raw(id) === value),
    // texte saisi
    v: (id) => {
      if (isAuto(id)) return AUTO_TEXT;
      const t = clean(text(id));
      // chaque ligne est marquée à part, pour que le surlignage suive les retours à la ligne
      return t ? t.split("\n").map((row) => (row.trim() ? mark(row) : row)).join("\n") : "";
    },
    // libellé(s) des options choisies, prêts à insérer dans une phrase
    l: (id) => {
      if (isAuto(id)) return AUTO_TEXT;
      const opts = options(id);
      return opts.length ? mark(opts.map(inSentence).join(", ")) : "";
    },
  };
}

export const DEFAULT_OPTS = { questions: true, variantes: false, explique: false };

export function assemble(type, idea, answers, opts = DEFAULT_OPTS) {
  const c = context(type, idea, answers);
  const { role, sections, relances = [] } = type.build(c);

  const fin = [];
  if (opts.variantes) fin.push("Propose 2 ou 3 versions nettement différentes, puis dis laquelle tu recommandes et pourquoi.");
  if (opts.explique) fin.push("Termine par 3 lignes maximum qui expliquent tes principaux choix.");
  fin.push(
    opts.questions
      ? "Si une information essentielle te manque, pose-moi d'abord jusqu'à 3 questions courtes et attends mes réponses."
      : "Ne me pose pas de questions : fais des hypothèses raisonnables, signale-les en une ligne, puis réponds.",
  );
  fin.push("Réponds en français.");

  const all = [sec("Mon idée, en quelques mots", `« ${c.idea} »`), ...sections, sec("Avant de commencer", fin)].filter((s) => s && s.lignes.length);
  const marked = [role, ...all.map((s) => `## ${s.titre}\n${s.lignes.join("\n")}`)].join("\n\n");

  return { text: clean(marked), html: toHtml(marked), relances };
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

function toHtml(marked) {
  return marked
    .split("\n")
    .map((row) => {
      const html = escapeHtml(row).replace(/\u0001([\s\S]*?)\u0002/g, '<mark class="v">$1</mark>');
      return row.startsWith("## ") ? `<span class="p-h">${html}</span>` : html;
    })
    .join("\n");
}
