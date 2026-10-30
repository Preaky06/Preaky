import { sec, line, steps } from "../../lib/kit.js";

const FORMATS = {
  etapes: "Une explication pas à pas, avec des intertitres.",
  analogies: "Au moins une analogie du quotidien pour chaque notion clé.",
  exemples: "Des exemples concrets, tirés de mon cadre quand c'est possible.",
  schema: "Un schéma en texte (flèches, arborescence) qui relie les notions entre elles.",
  fiche: "Une fiche de révision d'une page à la fin : définitions, points clés, pièges.",
  quiz: "Un quiz de 5 questions, avec les réponses à la toute fin.",
  plan: "Un programme sur plusieurs séances, avec l'objectif de chaque séance.",
};

const ATTENTE = {
  bases: "Explique-moi l'essentiel de ce sujet, assez clairement pour que je puisse l'expliquer à mon tour.",
  examen: "Aide-moi à maîtriser ce qui compte pour l'examen et à le restituer clairement le jour J.",
  appliquer: "Explique-moi ce qu'il faut savoir pour passer à l'action, appliqué à ma situation.",
  approfondir: "Va au-delà des bases : mécanismes, nuances, cas limites, débats entre spécialistes.",
  avis: "Donne-moi de quoi me forger mon propre avis : les faits, les meilleurs arguments de chaque camp et les vrais points de désaccord.",
};

export default {
  id: "apprendre",
  nom: "Comprendre un sujet",
  icon: "book",
  couleur: "sky",
  description: "Se renseigner, réviser, maîtriser une notion : une explication à ton niveau, avec des exemples de ton univers.",
  exemples: ["Comprendre comment fonctionne la blockchain", "Réviser la Révolution française pour le bac", "Les bases de l'investissement en bourse"],
  motsCles: [
    ["comprendre", 3], ["comprend", 3], ["explique", 3], ["apprendre", 3], ["apprends", 3], ["reviser", 3], ["revision", 3],
    ["examen", 2], ["bac$", 2], ["partiel", 2], ["concours", 2], ["cours$", 2], ["c est quoi", 3], ["qu est ce que", 2],
    ["comment fonctionne", 3], ["comment ca marche", 3], ["fonctionnement", 2], ["renseign", 3], ["en savoir plus", 3],
    ["maitriser", 2], ["les bases", 2], ["notion", 2], ["theorie", 2], ["histoire de", 3], ["s informer", 2], ["decouvrir", 1],
  ],
  questions: [
    {
      id: "objectif",
      type: "choice",
      label: "Qu'est-ce que tu veux en faire ?",
      pourquoi: "Comprendre pour soi, réussir un examen ou passer à l'action : la profondeur et les exemples changent du tout au tout.",
      options: [
        { v: "bases", label: "Comprendre les bases", match: ["les bases", "c est quoi", "comment fonctionne", "comment ca marche"] },
        { v: "examen", label: "Préparer un examen ou un oral", match: ["examen", "bac", "partiel", "reviser", "concours", "oral"] },
        { v: "appliquer", label: "L'appliquer concrètement", match: ["appliquer", "utiliser", "mettre en pratique"] },
        { v: "approfondir", label: "Approfondir un point précis", match: ["approfondir", "en detail"] },
        { v: "avis", label: "Me faire un avis éclairé", match: ["debat", "avis", "pour ou contre"] },
      ],
    },
    {
      id: "niveau",
      type: "choice",
      label: "Quel est ton niveau sur le sujet ?",
      pourquoi: "Évite qu'on t'explique ce que tu sais déjà, ou qu'on te perde dès la première phrase.",
      options: [
        { v: "zero", label: "Je pars de zéro" },
        { v: "notions", label: "J'ai quelques notions" },
        { v: "bon", label: "Je connais bien, je veux aller plus loin" },
        { v: "expert", label: "Je suis expert d'un domaine proche" },
      ],
    },
    {
      id: "examen",
      type: "text",
      label: "Quel examen, et dans combien de temps ?",
      pourquoi: "Le programme et le délai décident de ce qui est prioritaire.",
      when: (a) => a.objectif === "examen",
      suggestions: ["Bac de français dans 3 semaines", "Partiel de microéconomie dans 10 jours", "Oral de concours en juin"],
    },
    {
      id: "application",
      type: "text",
      label: "Sur quoi veux-tu l'appliquer ?",
      pourquoi: "Les exemples et le plan d'action partiront de ta situation réelle.",
      when: (a) => a.objectif === "appliquer",
      suggestions: ["Mon budget personnel", "Mon projet de site web", "Mon travail en entreprise"],
    },
    {
      id: "cadre",
      type: "text",
      label: "Dans quel cadre veux-tu comprendre ce sujet ?",
      pourquoi: "L'IA choisira des exemples tirés de ton univers, ils se retiennent mieux.",
      optional: true,
      suggestions: ["Mes études (lycée, licence ou BTS)", "Mon travail", "Par curiosité"],
    },
    {
      id: "blocage",
      type: "long",
      label: "Ce que tu sais déjà, ou ce qui te bloque",
      pourquoi: "Une bonne explication part de là où tu en es, pas du début du manuel.",
      optional: true,
      suggestions: ["Je confonds deux notions proches", "J'ai lu des articles mais tout se mélange", "Je bloque sur les calculs"],
    },
    {
      id: "formats",
      type: "multi",
      label: "Sous quelle forme veux-tu l'explication ?",
      pourquoi: "Certains comprennent par l'exemple, d'autres par le schéma : choisis ce qui marche pour toi.",
      options: [
        { v: "etapes", label: "Explication pas à pas" },
        { v: "analogies", label: "Analogies du quotidien" },
        { v: "exemples", label: "Exemples concrets" },
        { v: "schema", label: "Schéma en texte" },
        { v: "fiche", label: "Fiche de révision", match: ["fiche", "reviser", "revision"] },
        { v: "quiz", label: "Quiz pour vérifier" },
        { v: "plan", label: "Programme sur plusieurs jours" },
      ],
    },
    {
      id: "duree",
      type: "choice",
      label: "Combien de temps veux-tu y consacrer ?",
      pourquoi: "Ça fixe la longueur de la réponse et son niveau de détail.",
      auto: true,
      options: [
        { v: "5", label: "5 minutes de lecture" },
        { v: "30", label: "Une demi-heure" },
        { v: "plusieurs", label: "Plusieurs séances" },
      ],
    },
    {
      id: "sources",
      type: "choice",
      label: "Quelle exigence sur les sources ?",
      pourquoi: "Une IA peut inventer des références : mieux vaut lui dire ce que tu attends.",
      options: [
        { v: "citer", label: "Des sources que je pourrai vérifier" },
        { v: "distinguer", label: "Distinguer faits établis et débats" },
        { v: "aucune", label: "Pas besoin de sources" },
      ],
    },
  ],
  build(c) {
    const niveau = {
      zero: "Aucun terme technique sans définition simple, et pas de raccourcis.",
      notions: "Rappelle brièvement les bases, puis avance.",
      bon: "Va directement aux mécanismes, aux nuances et aux cas limites.",
      expert: "Appuie-toi sur mes connaissances d'un domaine proche et fais des parallèles avec lui.",
    }[c.raw("niveau")];

    const formats = (c.raw("formats") || []).map((f) => FORMATS[f]);
    return {
      role: "Tu es un pédagogue expert du sujet ci-dessous. Tu expliques avec clarté, sans jargon inutile, et tu vérifies que j'ai compris avant d'aller plus loin.",
      sections: [
        sec(
          "Mon contexte",
          line("Ce que je veux en faire", c.l("objectif")),
          line("Mon niveau", c.l("niveau")),
          line("Examen et délai", c.v("examen")),
          line("Où je veux l'appliquer", c.v("application")),
          line("Cadre", c.v("cadre")),
          line("Ce que je sais déjà ou ce qui me bloque", c.v("blocage")),
          line("Temps disponible", c.l("duree")),
        ),
        sec("Ce que j'attends de toi", ATTENTE[c.raw("objectif")] || ATTENTE.bases),
        sec(
          "Méthode",
          steps([
            "Commence par une vue d'ensemble en 3 phrases : de quoi il s'agit, à quoi ça sert, pourquoi c'est important.",
            "Découpe ensuite le sujet en 3 à 5 notions clés, de la plus fondamentale à la plus avancée.",
            `Pour chaque notion : une définition simple${c.is("formats", "analogies") ? ", une analogie du quotidien" : ""}, un exemple concret et l'erreur de compréhension la plus fréquente.`,
            niveau,
            c.is("objectif", "examen") && "Signale ce qui est prioritaire pour l'examen, les pièges classiques et la façon de rédiger une bonne réponse.",
            c.is("objectif", "appliquer") && "Termine par un plan d'action concret pour l'appliquer à ma situation.",
            c.is("objectif", "avis") && "Présente honnêtement chaque position avec ses meilleurs arguments, sans trancher à ma place.",
          ]),
        ),
        sec(
          "Format de la réponse",
          formats.length ? formats.map((f) => `- ${f}`) : "- Des intertitres clairs, des paragraphes courts et un résumé en 5 points à la fin.",
          c.has("duree") && !c.auto("duree") ? `- Une longueur adaptée à ce temps : ${c.l("duree")}.` : null,
        ),
        sec(
          "Exigences de qualité",
          "- Si tu n'es pas sûr d'une information, dis-le clairement au lieu de l'affirmer.",
          c.is("sources", "citer") && "- Cite des sources fiables et identifiables (ouvrages, institutions, articles de référence) que je pourrai vérifier. N'invente aucune référence : si tu n'en connais pas de sûre, dis-le.",
          c.is("sources", "distinguer") && "- Distingue clairement ce qui fait consensus, ce qui est débattu et ce qui relève de l'opinion.",
          "- Si le sujet a pu évoluer récemment, préviens-moi que tes informations peuvent dater et indique quoi vérifier.",
        ),
        sec("Pour finir", "Pose-moi 3 questions pour vérifier que j'ai compris, puis propose la suite logique pour aller plus loin."),
      ],
      relances: [
        "Explique-moi le point [X] autrement, avec une autre analogie.",
        "Fais-moi passer un mini-oral : pose une question, attends ma réponse, corrige-moi, puis passe à la suivante.",
        "Résume tout ce qu'on a vu en une fiche d'une page.",
      ],
    };
  },
};
