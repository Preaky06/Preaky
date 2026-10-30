// Reconnaît le type d'idée à partir de quelques mots, par mots-clés pondérés.
// Un mot-clé matche en début de mot (« poem » trouve « poème », « poèmes ») ;
// terminé par « $ », il doit correspondre au mot entier (« post$ » ne trouve pas « poste »).
import { TYPES, DEFAULT_TYPE } from "../data/types/index.js";

export function normalize(text) {
  const flat = String(text).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return ` ${flat.replace(/[^a-z0-9]+/g, " ").trim()} `;
}

function hit(text, keyword) {
  return keyword.endsWith("$") ? text.includes(` ${keyword.slice(0, -1)} `) : text.includes(` ${keyword}`);
}

export function detect(idea) {
  const text = normalize(idea);
  const ranking = TYPES.map((type, order) => ({
    id: type.id,
    order,
    score: type.motsCles.reduce((sum, [kw, weight]) => (hit(text, kw) ? sum + weight : sum), 0),
  }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order);
  return { best: ranking[0]?.id ?? DEFAULT_TYPE, ranking: ranking.map((r) => r.id) };
}

// Réponse suggérée par l'idée : options dont un mot-clé apparaît, ou pré-remplissage du texte
export function suggestFromIdea(question, idea) {
  if (question.prefill) return question.prefill(idea) || undefined;
  if (!question.options) return undefined;
  const text = normalize(idea);
  const matched = question.options.filter((o) => (o.match || []).some((kw) => hit(text, kw)));
  if (!matched.length) return undefined;
  return question.type === "multi" ? matched.map((o) => o.v) : matched[0].v;
}
