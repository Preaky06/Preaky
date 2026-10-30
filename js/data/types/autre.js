import { sec, line, steps } from "../../lib/kit.js";

export default {
  id: "autre",
  nom: "Autre chose",
  icon: "sparkle",
  couleur: "violet",
  description: "Ton idée ne rentre dans aucune case ? Des questions universelles pour cadrer n'importe quelle demande.",
  exemples: ["Des idées de cadeau pour mon père qui aime la pêche", "Préparer mon entretien d'embauche", "Négocier le prix d'une voiture d'occasion"],
  motsCles: [],
  questions: [
    {
      id: "resultat",
      type: "text",
      label: "Quel résultat concret veux-tu obtenir ?",
      pourquoi: "Une liste, un plan, un texte, une réponse : le résultat attendu oriente toute la réponse.",
      suggestions: ["Une liste d'idées", "Un plan d'action", "Un texte prêt à envoyer", "Une réponse claire à ma question"],
    },
    {
      id: "pourqui",
      type: "text",
      label: "Pour qui ?",
      pourquoi: "Le niveau de détail et le vocabulaire dépendent de la personne qui va utiliser la réponse.",
      suggestions: ["Pour moi", "Pour mon équipe", "Pour un client", "Pour mes enfants"],
    },
    {
      id: "contexte",
      type: "long",
      label: "Le contexte important",
      pourquoi: "Ce que l'IA ne sait pas, elle le remplace par du générique.",
      suggestions: ["Voici ma situation actuelle :", "Ce que j'ai déjà essayé :", "Ce qui me bloque :"],
    },
    {
      id: "format",
      type: "choice",
      label: "Sous quelle forme ?",
      pourquoi: "La forme de la réponse change son utilité : un tableau se compare, une liste se coche.",
      auto: true,
      options: [
        { v: "texte", label: "Un texte rédigé" },
        { v: "liste", label: "Une liste" },
        { v: "tableau", label: "Un tableau" },
        { v: "etapes", label: "Un plan étape par étape" },
        { v: "idees", label: "Plusieurs idées à comparer" },
        { v: "analyse", label: "Une analyse argumentée" },
      ],
    },
    {
      id: "ton",
      type: "choice",
      label: "Quel ton ?",
      pourquoi: "Le ton change la façon dont la réponse sera reçue.",
      options: [
        { v: "neutre", label: "Neutre" },
        { v: "pro", label: "Professionnel" },
        { v: "amical", label: "Amical" },
        { v: "creatif", label: "Créatif" },
        { v: "pedagogique", label: "Pédagogique" },
      ],
    },
    {
      id: "longueur",
      type: "choice",
      label: "Quelle longueur ?",
      pourquoi: "Sans consigne, l'IA écrit souvent trop long ou trop court.",
      options: [
        { v: "court", label: "Court, l'essentiel" },
        { v: "moyen", label: "Moyen" },
        { v: "detaille", label: "Détaillé" },
      ],
    },
    {
      id: "contraintes",
      type: "long",
      label: "Des contraintes ou des choses à éviter ?",
      pourquoi: "Budget, délai, sujets sensibles : ce qui est exclu compte autant que ce qui est demandé.",
      optional: true,
    },
    {
      id: "exemple",
      type: "long",
      label: "Un exemple de ce que tu aimes ?",
      pourquoi: "Un exemple montre le niveau et le style attendus mieux qu'une description.",
      optional: true,
    },
  ],
  build(c) {
    return {
      role: "Tu es un expert reconnu du domaine de ma demande. Tu réponds de façon précise, structurée et directement utilisable.",
      sections: [
        sec(
          "Mon contexte",
          line("Résultat attendu", c.v("resultat")),
          line("Pour qui", c.v("pourqui")),
          line("Contexte", c.v("contexte")),
          line("Contraintes ou choses à éviter", c.v("contraintes")),
        ),
        c.has("exemple") ? sec("Un exemple que j'aime", c.v("exemple"), "Inspire-toi du niveau et du style, sans le copier.") : null,
        sec(
          "Méthode",
          steps([
            "Reformule ma demande en une phrase pour vérifier que tu l'as bien comprise.",
            "Identifie les 3 points qui comptent le plus pour réussir ce résultat.",
            "Produis le résultat en t'appuyant sur les bonnes pratiques du domaine concerné.",
            "Relis ta réponse avant de la donner : est-elle exacte, complète, adaptée à la personne visée ?",
          ]),
        ),
        sec("Format de la réponse", line("Forme", c.l("format")), line("Ton", c.l("ton")), line("Longueur", c.l("longueur"))),
        sec(
          "Garde-fous",
          "- Si tu n'es pas sûr d'une information, dis-le au lieu de l'inventer.",
          "- Si ma demande touche à la santé, au droit ou à l'argent, indique ce qui doit être vérifié par un professionnel.",
        ),
      ].filter(Boolean),
      relances: [
        "Approfondis le point le plus important de ta réponse.",
        "Donne-moi une version plus courte, en 5 points.",
        "Qu'est-ce que j'ai oublié de te demander ?",
      ],
    };
  },
};
