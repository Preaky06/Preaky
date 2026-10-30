// Vérifie les types d'idées avant publication : node scripts/check.mjs
import { TYPES, visibleQuestions } from "../js/data/types/index.js";
import { assemble, AUTO } from "../js/lib/kit.js";
import { detect } from "../js/lib/detect.js";
import { CATALOGUE, CATEGORIES, DOMAINES, MODELES, UNIVERS, UNIVERS_BY_ID } from "../js/data/catalogue/index.js";
import { buildPrompt, champ, fieldsOf, placeholder, DEFAULT_OPTS } from "../js/lib/compose.js";
import { readFileSync } from "node:fs";
import { FILE as STATS_FILE, statsSource } from "./stats.mjs";

const errors = [];
const fail = (msg) => errors.push(msg);
const ids = new Set();

// Cas de détection : idée → type attendu
const CASES = [
  ["Un conte pour endormir ma fille de 5 ans", "histoire"],
  ["Écrire une histoire de pirates pour mon neveu", "histoire"],
  ["Comprendre comment fonctionne la blockchain", "apprendre"],
  ["Réviser l'histoire de la Révolution française", "apprendre"],
  ["Un poème pour les 60 ans de ma mère", "poeme"],
  ["Les paroles d'une chanson d'amour", "poeme"],
  ["Discours de témoin pour le mariage de mon frère", "discours"],
  ["Un mot pour le pot de départ de ma collègue", "discours"],
  ["Lancer un food truck à Lyon", "business"],
  ["Écrire le business plan de ma startup", "business"],
  ["Des posts Instagram pour ma boulangerie", "contenu"],
  ["Un script TikTok pour présenter mon appli", "contenu"],
  ["Je suis chef de projet, gagner du temps sur mes comptes rendus", "travail"],
  ["Être plus efficace au travail", "travail"],
  ["Une lettre de motivation pour un stage en marketing", "ecrit"],
  ["Un mail pour demander une augmentation", "ecrit"],
  ["Choisir entre un CDI à Paris ou rester freelance", "decision"],
  ["J'hésite entre acheter et louer", "decision"],
  ["Organiser un road trip de 10 jours en Italie", "planifier"],
  ["Mon déménagement à Nantes en juillet", "planifier"],
  ["Une formule Excel pour calculer des commissions", "code"],
  ["Corriger une erreur dans mon code Python", "code"],
  ["Un logo pour mon club de foot", "image"],
  ["Une image style aquarelle de mon chat avec Midjourney", "image"],
  ["", "autre"],
  ["blablabla zzz", "autre"],
];

const BAD = [/…/, /^- [^:\n]+ : [^\n]*?(?<!\d) : /m, /undefined/, /\bnull\b/, /NaN/, /\[object/, /\u0001|\u0002/, /^- [^:\n]+ : *$/m, / {2,}\S/, / [,.](\s|$)/m, /\n{3,}/];

function sampleAnswers(type, mode) {
  const a = {};
  for (const q of type.questions) {
    if (mode === "auto" && q.auto) a[q.id] = AUTO;
    else if (q.type === "choice") a[q.id] = q.options[mode === "last" ? q.options.length - 1 : 0].v;
    else if (q.type === "multi") a[q.id] = mode === "last" ? q.options.map((o) => o.v) : [q.options[0].v];
    else a[q.id] = q.type === "long" ? "Première ligne de détail\nDeuxième ligne" : "Une réponse courte";
  }
  return a;
}

let total = 0;
for (const type of TYPES) {
  if (ids.has(type.id)) fail(`${type.id} : identifiant en double`);
  ids.add(type.id);
  for (const field of ["nom", "icon", "couleur", "description", "exemples", "questions", "build", "motsCles"]) if (!type[field]) fail(`${type.id} : « ${field} » manquant`);
  for (const t of [type.nom, type.description, ...type.exemples]) if (t.includes("…")) fail(`${type.id} : « … » dans « ${t} »`);

  const qids = new Set();
  for (const q of type.questions) {
    total++;
    if (qids.has(q.id)) fail(`${type.id}.${q.id} : question en double`);
    qids.add(q.id);
    if (!q.label || !q.pourquoi) fail(`${type.id}.${q.id} : libellé ou « pourquoi » manquant`);
    // Aucun texte d'interface ne doit sembler coupé
    const texts = [q.label, q.pourquoi, ...(q.suggestions || []), ...(q.options || []).map((o) => o.label)];
    for (const t of texts) if (t.includes("…")) fail(`${type.id}.${q.id} : « … » dans « ${t} »`);
    if (!["choice", "multi", "text", "long"].includes(q.type)) fail(`${type.id}.${q.id} : type inconnu`);
    if ((q.type === "choice" || q.type === "multi") && !q.options?.length) fail(`${type.id}.${q.id} : options manquantes`);
    const vs = new Set((q.options || []).map((o) => o.v));
    if (q.options && vs.size !== q.options.length) fail(`${type.id}.${q.id} : options en double`);
  }

  for (const mode of ["empty", "first", "last", "auto"]) {
    const answers = mode === "empty" ? {} : sampleAnswers(type, mode);
    for (const opts of [{ questions: true, variantes: false, explique: false }, { questions: false, variantes: true, explique: true }]) {
      let out;
      try {
        out = assemble(type, "Mon idée de test, avec un détail", answers, opts);
      } catch (e) {
        fail(`${type.id} (${mode}) : erreur à l'assemblage : ${e.message}`);
        continue;
      }
      for (const re of BAD) {
        const m = out.text.match(re);
        if (m) fail(`${type.id} (${mode}) : motif interdit ${re} → « ${out.text.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\n/g, "⏎")} »`);
      }
      if (out.text.length < 400) fail(`${type.id} (${mode}) : prompt trop court (${out.text.length})`);
      if (!out.relances?.length) fail(`${type.id} : aucune relance`);
    }
  }

  // Les exemples affichés pour un type doivent être reconnus comme ce type
  if (type.id !== "autre") {
    for (const ex of type.exemples) {
      const got = detect(ex).best;
      if (got !== type.id) fail(`exemple « ${ex} » : détecté ${got}, attendu ${type.id}`);
    }
  }
}

for (const [idea, expected] of CASES) {
  const got = detect(idea).best;
  if (got !== expected) fail(`détection « ${idea} » : ${got} (classement ${detect(idea).ranking.join(" > ")}), attendu ${expected}`);
}

// ---------- Catalogue de prompts prêts à l'emploi ----------
const KINDS = {
  b2c: ["role", "cadre", "clients", "enjeux", "kpi", "outils", "livrables", "taches"],
  b2b: ["role", "cadre", "clients", "enjeux", "kpi", "outils", "livrables", "taches"],
  employe: ["role", "cadre", "clients", "enjeux", "kpi", "outils", "livrables", "taches"],
  sante: ["role", "cadre", "clients", "enjeux", "kpi", "outils", "livrables", "taches", "sujets_patients"],
  perso: ["role", "sujet", "objectifs", "pros", "projets"],
  relation: ["role", "sujet"],
  carriere: ["role", "situation"],
  etude: ["role", "matiere", "notions", "examens", "devoirs", "confusion"],
  creatif: ["role", "pratique", "public", "diffusion", "techniques"],
};
const catIds = new Set(CATEGORIES.map((c) => c.id));
const modeleIds = new Set(MODELES.map((m) => m.id));
const domIds = new Set();
for (const m of MODELES) {
  if (!catIds.has(m.cat)) fail(`modèle ${m.id} : catégorie inconnue ${m.cat}`);
  for (const key of m.f) if (!champ(key)) fail(`modèle ${m.id} : champ non déclaré « ${key} »`);
}
for (const d of DOMAINES) {
  if (domIds.has(d.id)) fail(`domaine ${d.id} : identifiant en double`);
  domIds.add(d.id);
  if (!UNIVERS_BY_ID[d.univers]) fail(`domaine ${d.id} : univers inconnu ${d.univers}`);
  for (const k of d.kinds) {
    if (!KINDS[k]) fail(`domaine ${d.id} : type inconnu ${k}`);
    for (const key of KINDS[k] || []) {
      const v = d[key];
      if (!v || (Array.isArray(v) && v.length === 0)) fail(`domaine ${d.id} : « ${key} » manquant`);
    }
  }
  for (const id of d.sans || []) if (!modeleIds.has(id)) fail(`domaine ${d.id} : modèle exclu inconnu ${id}`);
  if (d.sp.length !== 4) fail(`domaine ${d.id} : ${d.sp.length} prompts spécifiques au lieu de 4`);
  for (const s of d.sp) {
    if (!catIds.has(s.cat)) fail(`domaine ${d.id} : catégorie inconnue « ${s.cat} » pour « ${s.t} »`);
    if (!/[.?]$/.test(s.m)) fail(`domaine ${d.id} : mission sans ponctuation finale « ${s.t} »`);
  }
  const titres = CATALOGUE.filter((e) => e.d === d).map((e) => e.t);
  const doublons = titres.filter((t, i) => titres.indexOf(t) !== i);
  if (doublons.length) fail(`domaine ${d.id} : titres en double ${doublons.join(", ")}`);
}

const entryIds = new Set();
let shortest = Infinity;
let longest = 0;
for (const e of CATALOGUE) {
  if (entryIds.has(e.id)) fail(`prompt ${e.id} : identifiant en double`);
  entryIds.add(e.id);
  if (!e.t || !e.r || !catIds.has(e.cat)) fail(`prompt ${e.id} : titre, résumé ou catégorie manquant`);
  const keys = fieldsOf(e);
  const filled = Object.fromEntries(keys.map((k) => [k, champ(k)?.long ? "Première ligne\nDeuxième ligne" : "Une valeur de test"]));
  for (const key of keys) {
    if (!champ(key)) fail(`prompt ${e.id} : champ non déclaré « ${key} »`);
    const p = placeholder(key, e.d);
    if (/undefined|\bnull\b|NaN|…/.test(p)) fail(`prompt ${e.id} : exemple invalide pour « ${key} » : ${p}`);
  }
  for (const [values, opts] of [[{}, DEFAULT_OPTS], [filled, { questions: false, variantes: true }]]) {
    let out;
    try {
      out = buildPrompt(e, values, opts);
    } catch (err) {
      fail(`prompt ${e.id} : erreur à l'assemblage : ${err.message}`);
      continue;
    }
    for (const re of [/…/, /undefined/, /\bnull\b/, /NaN/, /\[object/, /\u0001|\u0002/, / {2,}\S/, / [,.](\s|$)/m, /\n{3,}/, /(?<!\p{L})(\p{L}+) \1(?!\p{L})/iu]) {
      const m = out.text.match(re);
      if (m) fail(`prompt ${e.id} : motif interdit ${re} → « ${out.text.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\n/g, "⏎")} »`);
    }
    if (values === filled && out.missing.length) fail(`prompt ${e.id} : champs signalés manquants alors qu'ils sont remplis`);
    shortest = Math.min(shortest, out.text.length);
    longest = Math.max(longest, out.text.length);
  }
}
if (CATALOGUE.length < 5000) fail(`catalogue : ${CATALOGUE.length} prompts, moins de 5 000`);
if (readFileSync(STATS_FILE, "utf8") !== statsSource()) fail("js/data/stats.js n'est plus à jour : lance node scripts/stats.mjs");

if (errors.length) {
  console.error(errors.join("\n"));
  console.error(`\n${errors.length} problème(s).`);
  process.exit(1);
}

const ranges = TYPES.map((t) => [visibleQuestions(t, {}).length, t.questions.length]);
const min = Math.min(...ranges.map((r) => r[0]));
const max = Math.max(...ranges.map((r) => r[1]));
const sizes = TYPES.map((t) => assemble(t, "Mon idée", sampleAnswers(t, "first")).text.length);
console.log(`OK : ${TYPES.length} types, ${total} questions (de ${min} à ${max} par parcours), ${CASES.length} cas de détection.`);
console.log(`Prompt complet : de ${Math.min(...sizes)} à ${Math.max(...sizes)} caractères.`);
const specifiques = CATALOGUE.filter((e) => e.s).length;
console.log(
  `Catalogue : ${CATALOGUE.length} prompts (${DOMAINES.length} domaines, ${UNIVERS.length} univers, ${MODELES.length} modèles, ${specifiques} prompts propres à un domaine), de ${shortest} à ${longest} caractères.`,
);
