import { sec, line, steps } from "../../lib/kit.js";

const TACHES = {
  rediger: "Crée-moi des modèles réutilisables pour mes écrits les plus fréquents, avec les parties à personnaliser entre crochets, et un prompt réutilisable pour qu'une IA les rédige à partir de mes notes.",
  analyser: "Propose une méthode d'analyse pas à pas, les indicateurs utiles pour mon métier, et les formules ou étapes concrètes dans mes outils.",
  organiser: "Propose une méthode de priorisation adaptée à mon métier, une routine quotidienne et hebdomadaire réaliste, et un modèle de liste de tâches.",
  reunion: "Prépare une trame type : objectif, ordre du jour minuté, documents à préparer, et un modèle de compte rendu avec décisions, responsables et échéances.",
  process: "Rédige une procédure claire : objectif, déclencheur, étapes numérotées, responsable de chaque étape, points de contrôle, et une checklist.",
  automatiser: "Propose des automatisations adaptées à mon niveau technique, avec les étapes précises dans mes outils (ou dans des outils gratuits courants si nécessaire), et ce qu'il faut tester avant de s'y fier.",
  former: "Construis un plan pour me former vite : les notions essentielles pour mon métier, des ressources fiables, des exercices pratiques sur des cas réels.",
};

// « je suis infirmière », « en tant que chef de projet » → le métier, pour pré-remplir
function metierDepuis(idea) {
  const m = idea.match(/(?:je suis|en tant que|je travaille comme|mon métier\s*:?)\s+(?:une?\s+|le\s+|la\s+|l')?([^,.;!?]{3,40})/i);
  return m ? m[1].trim() : "";
}

export default {
  id: "travail",
  nom: "Gagner du temps au travail",
  icon: "briefcase",
  couleur: "ink",
  description: "Selon ton métier : rédiger plus vite, analyser, s'organiser, automatiser les tâches qui reviennent.",
  exemples: ["Je suis chef de projet, mes comptes rendus me prennent trop de temps", "Organiser ma semaine d'assistante de direction", "Je suis comptable, mes relances clients me prennent des heures"],
  motsCles: [
    ["travail", 2], ["boulot", 2], ["au bureau", 3], ["mon metier", 3], ["mon job", 3], ["collegue", 2], ["manager", 2],
    ["reunion", 2], ["productivite", 4], ["efficacite", 3], ["efficace", 2], ["gagner du temps", 4], ["perdre du temps", 3],
    ["automatiser", 2], ["organiser mon travail", 4], ["mes taches", 3], ["procedure", 3], ["process", 2], ["reporting", 3],
    ["je suis", 1], ["en tant que", 2], ["tous les jours", 1], ["chaque semaine", 1], ["prend du temps", 3],
    ["prennent du temps", 3], ["prennent trop de temps", 3], ["des heures", 2], ["assistant", 3], ["chef de projet", 3],
    ["comptable", 3], ["infirmi", 3], ["enseignant", 3], ["professeur", 3], ["commercial", 2], ["recruteur", 3], ["secretaire", 3],
  ],
  questions: [
    {
      id: "metier",
      type: "text",
      label: "Quel est ton métier ?",
      pourquoi: "Les méthodes, le vocabulaire et les outils ne sont pas les mêmes pour une infirmière, un comptable ou un graphiste.",
      prefill: metierDepuis,
      suggestions: ["Assistante de direction", "Commercial terrain", "Enseignant en collège", "Chef de projet", "Comptable", "Infirmier"],
    },
    {
      id: "tache",
      type: "choice",
      label: "Sur quel type de tâche veux-tu gagner du temps ?",
      pourquoi: "On ne fait pas gagner du temps sur un mail comme sur un tableau de chiffres.",
      options: [
        { v: "rediger", label: "Rédiger plus vite (mails, rapports, documents)", match: ["mail", "rediger", "compte rendu", "rapport", "ecrire"] },
        { v: "analyser", label: "Analyser des données ou des documents", match: ["analyser", "donnees", "chiffres", "tableau"] },
        { v: "organiser", label: "Organiser mes priorités et mon temps", match: ["organiser", "priorite", "planning", "semaine"] },
        { v: "reunion", label: "Préparer une réunion ou une présentation", match: ["reunion", "presentation"] },
        { v: "process", label: "Créer une procédure ou un modèle", match: ["procedure", "process", "modele"] },
        { v: "automatiser", label: "Automatiser une tâche répétitive", match: ["automatiser", "automatique", "excel", "macro"] },
        { v: "former", label: "Me former sur un sujet de mon métier", match: ["former", "formation", "apprendre"] },
      ],
    },
    {
      id: "description",
      type: "long",
      label: "Comment cette tâche se passe-t-elle aujourd'hui ?",
      pourquoi: "Les étapes, les outils et le temps passé : c'est ce qui permet de trouver où tu perds du temps.",
      suggestions: ["Chaque lundi, je compile les chiffres de 3 fichiers Excel pour un rapport : 2 heures", "Je réponds à 30 mails par jour, souvent aux mêmes questions"],
    },
    {
      id: "outils",
      type: "text",
      label: "Avec quels outils travailles-tu ?",
      pourquoi: "La meilleure solution est souvent dans un outil que tu as déjà.",
      suggestions: ["Excel et Outlook", "Google Workspace", "Notion et Slack", "Un logiciel métier"],
    },
    {
      id: "frequence",
      type: "choice",
      label: "À quelle fréquence fais-tu cette tâche ?",
      pourquoi: "Une tâche quotidienne mérite une vraie automatisation ; une tâche ponctuelle, un bon modèle.",
      options: [
        { v: "jour", label: "Tous les jours" },
        { v: "semaine", label: "Chaque semaine" },
        { v: "mois", label: "Chaque mois" },
        { v: "ponctuel", label: "De temps en temps" },
      ],
    },
    {
      id: "resultat",
      type: "text",
      label: "À quoi ressemblerait le résultat idéal ?",
      pourquoi: "Un objectif concret permet de juger si une solution vaut le coup.",
      suggestions: ["Un rapport prêt en 20 minutes", "Des réponses types que j'adapte en 1 minute", "Une liste claire de priorités chaque matin"],
    },
    {
      id: "exemple",
      type: "long",
      label: "Un exemple de texte que tu écris souvent (anonymisé)",
      pourquoi: "L'IA reprendra ta façon d'écrire au lieu d'un style générique.",
      optional: true,
      when: (a) => a.tache === "rediger",
    },
    {
      id: "donnees",
      type: "text",
      label: "Quel type de données ou de documents ?",
      pourquoi: "Un tableau de ventes et des contrats ne s'analysent pas de la même façon.",
      when: (a) => a.tache === "analyser",
      suggestions: ["Un tableau Excel de ventes", "Des comptes rendus de réunion", "Des contrats", "Des réponses à un questionnaire"],
    },
    {
      id: "niveau",
      type: "choice",
      label: "Quel est ton niveau technique ?",
      pourquoi: "Inutile de proposer du code à quelqu'un qui préfère cliquer, et inversement.",
      when: (a) => a.tache === "automatiser",
      options: [
        { v: "clic", label: "Je ne code pas" },
        { v: "formules", label: "Je me débrouille avec les formules" },
        { v: "code", label: "Je sais coder un peu" },
      ],
    },
    {
      id: "contraintes",
      type: "multi",
      label: "Des contraintes à respecter ?",
      pourquoi: "Une solution parfaite mais interdite par ton service informatique ne sert à rien.",
      optional: true,
      options: [
        { v: "confidentiel", label: "Données confidentielles" },
        { v: "installation", label: "Je ne peux pas installer d'outils" },
        { v: "validation", label: "Validation par ma hiérarchie" },
        { v: "simple", label: "Ça doit rester simple" },
      ],
    },
  ],
  build(c) {
    const metier = c.v("metier");
    return {
      role: `Tu es consultant en efficacité au travail et tu connais bien le métier de ${metier || "la personne qui te parle"}. Tu proposes des solutions concrètes, applicables dès demain avec les outils déjà disponibles.`,
      sections: [
        sec(
          "Ma situation",
          line("Métier", metier),
          line("Type de tâche", c.l("tache")),
          line("Comment ça se passe aujourd'hui", c.v("description")),
          line("Outils", c.v("outils")),
          line("Fréquence", c.l("frequence")),
          line("Résultat idéal", c.v("resultat")),
          line("Données ou documents", c.v("donnees")),
          line("Niveau technique", c.l("niveau")),
          line("Contraintes", c.l("contraintes")),
        ),
        c.has("exemple") ? sec("Exemple de texte que j'écris souvent", c.v("exemple"), "Reprends mon style et mon vocabulaire.") : null,
        sec(
          "Méthode",
          steps([
            "Reformule la tâche en étapes et repère où part le temps : répétitions, recherches, allers-retours, mise en forme.",
            "Sépare les gains rapides, applicables aujourd'hui, des améliorations plus structurelles.",
            TACHES[c.raw("tache")] || "Propose les solutions les plus rentables pour cette tâche, du plus simple au plus ambitieux.",
            "Estime le temps gagné pour chaque proposition, en le présentant comme une estimation.",
            "Termine par un plan de mise en place sur 2 semaines.",
          ]),
        ),
        sec("Format de la réponse", "Un tableau des propositions (action, gain estimé, difficulté, outil), puis le détail des 3 plus rentables, avec les modèles ou les étapes prêts à l'emploi."),
        sec(
          "Garde-fous",
          c.is("contraintes", "confidentiel")
            ? "- Mes données sont confidentielles : privilégie des solutions qui restent dans mes outils, et rappelle-moi d'anonymiser tout ce que je colle dans une IA."
            : "- Signale toute solution qui impliquerait de partager des données sensibles avec un outil externe.",
          "- Indique ce qui doit être validé par ma hiérarchie ou mon service informatique.",
          "- N'invente aucune fonction d'outil : si tu n'es pas sûr qu'une fonction existe dans ma version, dis-le.",
        ),
      ].filter(Boolean),
      relances: [
        "Transforme la proposition n°1 en mode d'emploi pas à pas.",
        "Écris le prompt réutilisable que je pourrai coller chaque semaine pour cette tâche.",
        "Prépare un message pour présenter cette amélioration à mon responsable.",
      ],
    };
  },
};
