import { sec, line, steps } from "../../lib/kit.js";

const FENCE = "```";

const METHODES = {
  script: [
    "Reformule le besoin en entrées, traitement et sorties, et liste les cas limites.",
    "Écris le code complet.",
    "Donne un exemple d'utilisation et le résultat attendu.",
    "Explique comment l'exécuter.",
  ],
  bug: [
    "Explique ce que fait le code actuellement et pourquoi l'erreur se produit : la cause, pas seulement le symptôme.",
    "Propose la correction la plus simple.",
    "Donne le code corrigé en entier.",
    "Explique comment vérifier que c'est réglé, et comment éviter ce type d'erreur.",
  ],
  app: [
    "Propose l'architecture la plus simple qui répond au besoin, et dis ce que tu as écarté.",
    "Donne l'arborescence des fichiers.",
    "Écris le code complet des fichiers essentiels.",
    "Explique comment le lancer en local, puis comment le mettre en ligne.",
  ],
  formule: [
    "Donne la formule prête à coller.",
    "Explique chaque partie de la formule.",
    "Indique la version minimale du tableur nécessaire, et une alternative si la fonction n'existe pas dans ma version.",
    "Donne un exemple avec quelques lignes de données et le résultat attendu.",
  ],
  auto: [
    "Choisis l'outil le plus adapté à mon niveau et à mes outils actuels, en expliquant pourquoi.",
    "Décris l'automatisation étape par étape, avec les réglages précis.",
    "Indique ce qu'il faut tester avant de l'activer pour de bon.",
  ],
  comprendre: [
    "Explique ce que fait le code globalement, en 3 phrases.",
    "Explique-le ensuite bloc par bloc.",
    "Montre une exécution sur des données simples.",
    "Signale les faiblesses ou les risques éventuels.",
  ],
  ameliorer: [
    "Liste les problèmes (lisibilité, performance, sécurité, bugs potentiels), du plus important au moins important.",
    "Propose la version améliorée.",
    "Explique chaque changement. Ne modifie pas le comportement sans le signaler.",
  ],
};

const EXIGENCES = {
  commentaires: "Code commenté pour un débutant.",
  tests: "Des tests qui couvrent les cas normaux et les cas limites.",
  sans_dependance: "Aucune bibliothèque externe.",
  securise: "Sécurité : valider les entrées, ne jamais exposer de secret.",
  performant: "Performant sur de gros volumes de données.",
};

// Repère la technologie citée dans l'idée, pour pré-remplir
function technoDepuis(idea) {
  const known = [
    ["python", "Python"], ["javascript", "JavaScript"], ["typescript", "TypeScript"], ["php", "PHP"], ["java ", "Java"],
    ["sql", "SQL"], ["html", "HTML et CSS"], ["react", "React"], ["wordpress", "WordPress"], ["google sheets", "Google Sheets"],
    ["excel", "Excel"], ["vba", "VBA (Excel)"], ["notion", "Notion"], ["zapier", "Zapier"], ["swift", "Swift"], ["kotlin", "Kotlin"],
  ];
  const text = ` ${idea.toLowerCase()} `;
  return known.filter(([k]) => text.includes(k)).map(([, label]) => label).join(", ");
}

export default {
  id: "code",
  nom: "Code & outils",
  icon: "code",
  couleur: "ink",
  description: "Script, bug, site, formule Excel, automatisation : du code qui marche, expliqué à ton niveau.",
  exemples: ["Une formule Excel pour calculer des commissions", "Corriger une erreur dans mon script Python", "Créer un site vitrine pour mon association"],
  motsCles: [
    ["code", 4], ["coder", 4], ["script", 2], ["python", 5], ["javascript", 5], ["typescript", 5], ["php", 5], ["html", 4],
    ["css$", 4], ["sql$", 5], ["react", 4], ["site web", 3], ["site internet", 3], ["site vitrine", 3], ["application", 2], ["appli", 2],
    ["bug", 4], ["erreur", 2], ["excel", 3], ["google sheets", 4], ["formule", 3], ["macro", 4], ["vba", 5], ["api$", 4],
    ["zapier", 4], ["automatiser", 2], ["programme", 2], ["programmer", 4], ["wordpress", 4], ["base de donnees", 4],
  ],
  questions: [
    {
      id: "besoin",
      type: "choice",
      label: "De quoi as-tu besoin ?",
      pourquoi: "Écrire, corriger, expliquer ou améliorer du code demandent des démarches différentes.",
      options: [
        { v: "script", label: "Écrire un script ou une fonction", match: ["script", "fonction"] },
        { v: "bug", label: "Corriger un bug", match: ["bug", "erreur", "marche pas", "plante", "crash"] },
        { v: "app", label: "Créer un site ou une appli", match: ["site", "appli", "application"] },
        { v: "formule", label: "Une formule Excel ou Google Sheets", match: ["excel", "sheets", "formule", "tableur"] },
        { v: "auto", label: "Automatiser une tâche (macro, Zapier ou Make)", match: ["automatiser", "macro", "zapier", "make", "n8n"] },
        { v: "comprendre", label: "Comprendre un code", match: ["comprendre", "explique"] },
        { v: "ameliorer", label: "Améliorer un code existant", match: ["ameliorer", "optimiser", "refactor", "nettoyer"] },
      ],
    },
    {
      id: "techno",
      type: "text",
      label: "Quel langage, outil ou plateforme ?",
      pourquoi: "Une réponse en Python ne sert à rien si tu travailles sur Google Sheets.",
      auto: true,
      prefill: technoDepuis,
      suggestions: ["Python", "JavaScript", "Excel 365", "Google Sheets", "WordPress"],
    },
    {
      id: "niveau",
      type: "choice",
      label: "Quel est ton niveau ?",
      pourquoi: "Les explications et les étapes d'installation s'adaptent à ton niveau.",
      options: [
        { v: "debutant", label: "Débutant" },
        { v: "intermediaire", label: "Intermédiaire" },
        { v: "dev", label: "Développeur" },
      ],
    },
    {
      id: "description",
      type: "long",
      label: "Que doit faire exactement le code ?",
      pourquoi: "Les entrées, le traitement et le résultat attendu : c'est ce qui évite un code à côté du besoin.",
      prefill: (idea) => idea,
      suggestions: ["En entrée : un fichier CSV de commandes. En sortie : le total par client.", "Quand on envoie le formulaire, je reçois un mail"],
    },
    {
      id: "existant",
      type: "long",
      label: "Le code ou la formule actuelle, et le message d'erreur",
      pourquoi: "Sans le code et l'erreur exacte, l'IA devine la cause au lieu de la trouver.",
      when: (a) => ["bug", "comprendre", "ameliorer"].includes(a.besoin),
    },
    {
      id: "environnement",
      type: "text",
      label: "Où le code va-t-il tourner ?",
      pourquoi: "Un script pour Windows, un navigateur ou un serveur ne s'écrit pas tout à fait pareil.",
      optional: true,
      suggestions: ["Sur mon ordinateur (Windows)", "Sur mon Mac", "Dans le navigateur", "Sur un serveur Linux", "Excel 365"],
    },
    {
      id: "exigences",
      type: "multi",
      label: "Des exigences particulières ?",
      pourquoi: "Mieux vaut les dire avant que de devoir tout réécrire.",
      optional: true,
      options: [
        { v: "commentaires", label: "Bien commenté pour un débutant" },
        { v: "tests", label: "Avec des tests" },
        { v: "sans_dependance", label: "Sans bibliothèque externe" },
        { v: "securise", label: "Sécurisé" },
        { v: "performant", label: "Rapide sur de gros volumes" },
      ],
    },
  ],
  build(c) {
    const besoin = c.raw("besoin");
    const exigences = (c.raw("exigences") || []).map((e) => `- ${EXIGENCES[e]}`);
    return {
      role: `Tu es développeur senior${besoin === "formule" ? ", expert des tableurs," : ""} et excellent pédagogue. Tu écris du code simple, correct et facile à maintenir, et tu expliques tes choix${c.is("niveau", "debutant") ? " sans jargon" : ""}.`,
      sections: [
        sec(
          "Le besoin",
          line("Type de demande", c.l("besoin")),
          line("Langage ou outil", c.v("techno")),
          line("Mon niveau", c.l("niveau")),
          line("Ce que le code doit faire", c.v("description")),
          line("Environnement", c.v("environnement")),
        ),
        c.has("existant") ? sec("Code actuel et message d'erreur", FENCE, c.v("existant"), FENCE) : null,
        sec(
          "Méthode",
          steps([
            ...(METHODES[besoin] || METHODES.script),
            c.is("niveau", "debutant") && "Explique chaque étape comme à un débutant, y compris comment installer et lancer ce qu'il faut.",
          ]),
        ),
        sec("Exigences", exigences, "- Gère les erreurs probables : fichier absent, donnée vide, format inattendu."),
        sec(
          "Garde-fous",
          "- N'invente aucune fonction, bibliothèque ou option : si tu n'es pas sûr qu'elle existe dans la version utilisée, dis-le.",
          "- Ne mets jamais de mot de passe ni de clé d'API en clair dans le code : utilise des variables d'environnement.",
          "- S'il manque une information pour écrire un code correct, demande-la plutôt que de supposer.",
        ),
      ].filter(Boolean),
      relances: [
        "Ajoute des tests qui couvrent les cas limites.",
        "Explique-moi ce code ligne par ligne, comme à un débutant.",
        "Comment je mets ça en production, étape par étape ?",
      ],
    };
  },
};
