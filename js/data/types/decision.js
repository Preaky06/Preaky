import { sec, line, steps } from "../../lib/kit.js";

// « Choisir entre un CDI à Paris ou rester freelance » → deux options, une par ligne
function optionsDepuis(idea) {
  const sansIntro = idea.replace(/^\s*(je\s+)?(dois\s+)?(choisir|h[ée]site[r]?|d[ée]cider|comparer)\s+(entre\s+)?/i, "");
  const parts = sansIntro.split(/\s+ou\s+|\s+vs\.?\s+|\s+contre\s+/i).map((p) => p.replace(/[?.!]+$/, "").trim()).filter(Boolean);
  return parts.length >= 2 ? parts.join("\n") : "";
}

export default {
  id: "decision",
  nom: "Prendre une décision",
  icon: "compass",
  couleur: "mint",
  description: "Comparer des options, peser le pour et le contre, repérer ses biais : pour choisir en connaissance de cause.",
  exemples: ["Choisir entre un CDI à Paris ou rester freelance", "Acheter ou louer mon appartement", "Accepter ou non une promotion à l'étranger"],
  motsCles: [
    ["choisir", 3], ["choix", 3], ["decider", 3], ["decision", 4], ["comparer", 3], ["hesite", 4], ["hesiter", 4],
    ["pour ou contre", 4], ["avantages et inconvenients", 4], ["lequel", 2], ["laquelle", 2], ["vaut il mieux", 4], ["faut il", 2],
    ["accepter ou", 3], ["ou$", 1],
  ],
  questions: [
    {
      id: "options",
      type: "long",
      label: "Quelles options compares-tu ? (une par ligne)",
      pourquoi: "Lister les options oblige à voir celles qu'on oublie, à commencer par « ne rien changer ».",
      prefill: optionsDepuis,
      suggestions: ["Accepter l'offre", "Rester dans mon poste actuel", "Négocier avant de décider"],
    },
    {
      id: "enjeu",
      type: "text",
      label: "Qu'est-ce qui est en jeu ?",
      pourquoi: "Une décision réversible et une décision qui engage 10 ans ne se prennent pas de la même façon.",
      suggestions: ["Mon évolution de carrière", "Mon budget des 5 prochaines années", "Ma vie de famille", "Ma santé"],
    },
    {
      id: "criteres",
      type: "multi",
      label: "Qu'est-ce qui compte le plus pour toi ?",
      pourquoi: "Tes critères pèsent plus que des avantages génériques : ils feront la pondération.",
      options: [
        { v: "cout", label: "Le coût" },
        { v: "temps", label: "Le temps" },
        { v: "securite", label: "La sécurité" },
        { v: "plaisir", label: "Le plaisir" },
        { v: "evolution", label: "L'évolution, le potentiel" },
        { v: "proches", label: "L'impact sur mes proches" },
        { v: "reversible", label: "Pouvoir revenir en arrière" },
        { v: "valeurs", label: "Mes valeurs" },
      ],
    },
    {
      id: "contraintes",
      type: "text",
      label: "Quelles contraintes dois-tu respecter ?",
      pourquoi: "Certaines options sont éliminées d'office par un budget, un délai ou une obligation.",
      optional: true,
      suggestions: ["Pas plus de 1 000 € par mois", "Réponse avant vendredi", "Rester près de mes enfants"],
    },
    {
      id: "infos",
      type: "long",
      label: "Les informations ou chiffres dont tu disposes",
      pourquoi: "Des faits précis évitent un raisonnement dans le vide.",
      optional: true,
      suggestions: ["Salaire proposé : 42 000 € brut", "Loyer actuel : 850 €", "Prix d'achat : 210 000 €, apport de 30 000 €"],
    },
    {
      id: "delai",
      type: "choice",
      label: "Quand dois-tu décider ?",
      pourquoi: "Avec du temps, on peut tester ou se renseigner ; sans, on tranche avec ce qu'on a.",
      options: [
        { v: "aujourdhui", label: "Aujourd'hui" },
        { v: "semaine", label: "Cette semaine" },
        { v: "mois", label: "Ce mois-ci" },
        { v: "aucun", label: "Pas de date limite" },
      ],
    },
    {
      id: "penchant",
      type: "text",
      label: "Vers quelle option penches-tu, et pourquoi ?",
      pourquoi: "L'IA vérifiera si c'est un vrai argument ou un biais (peur du changement, argent déjà investi, avis des autres).",
      optional: true,
    },
  ],
  build(c) {
    return {
      role: "Tu es conseiller en prise de décision. Tu structures les choix difficiles, tu repères les biais et tu aides à décider, sans décider à ma place.",
      sections: [
        sec(
          "Les options",
          c.v("options") || "- À identifier à partir de mon idée.",
          "(Ajoute l'option « ne rien changer » si elle manque, et toute option évidente que j'aurais oubliée.)",
        ),
        sec(
          "Mon contexte",
          line("Ce qui est en jeu", c.v("enjeu")),
          line("Ce qui compte le plus pour moi", c.l("criteres")),
          line("Contraintes", c.v("contraintes")),
          line("Informations et chiffres", c.v("infos")),
          line("Délai pour décider", c.l("delai")),
          line("Mon penchant actuel", c.v("penchant")),
        ),
        sec(
          "Méthode",
          steps([
            "Reformule la décision en une question claire.",
            "Pour chaque option : avantages, inconvénients, risques, réversibilité, coût en argent, en temps et en énergie.",
            "Construis une grille de décision : mes critères pondérés de 1 à 5 selon ce que j'ai dit compter le plus, une note par option, le total. Calcul visible.",
            "Pour chaque option, deux scénarios : le meilleur cas réaliste et le pire cas réaliste.",
            `Repère les biais possibles dans mon raisonnement${c.has("penchant") ? ", notamment dans mon penchant actuel" : ""} : peur de perdre, coût déjà engagé, attachement au statu quo, influence des autres.`,
            "Liste les informations qui manquent et comment les obtenir vite.",
            "Donne ta recommandation sous forme conditionnelle (« si X compte plus que Y pour toi, alors choisis A »), puis la plus petite action à faire cette semaine.",
          ]),
        ),
        sec("Format de la réponse", "Des intertitres, la grille en tableau, et une conclusion de 5 lignes maximum."),
        sec(
          "Garde-fous",
          "- Éclaire le choix, ne décide pas à ma place.",
          "- Pour une décision juridique, financière ou médicale importante, indique ce qui doit être validé par un professionnel.",
        ),
      ],
      relances: [
        "Joue l'avocat du diable contre l'option qui arrive en tête.",
        "Imagine-moi dans 5 ans avec chaque option : décris les deux scénarios.",
        "Aide-moi à préparer la conversation pour annoncer ma décision.",
      ],
    };
  },
};
