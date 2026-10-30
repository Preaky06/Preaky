import { sec, line, steps } from "../../lib/kit.js";

export default {
  id: "discours",
  nom: "Discours ou message perso",
  icon: "mic",
  couleur: "sun",
  description: "Mariage, anniversaire, départ, hommage, carte : des mots qui touchent juste, sans mettre personne mal à l'aise.",
  exemples: ["Mon discours de témoin pour le mariage de mon frère", "Un mot pour le pot de départ de ma collègue", "Un message pour les 30 ans de ma meilleure amie"],
  motsCles: [
    ["discours", 4], ["toast", 4], ["temoin", 4], ["mariage", 2], ["anniversaire", 2], ["carte", 2], ["mot pour", 3],
    ["message pour", 3], ["felicitation", 3], ["retraite", 3], ["pot de depart", 4], ["eloge", 4], ["hommage", 4],
    ["remerciement", 3], ["condoleance", 4], ["voeux", 3], ["speech", 4],
  ],
  questions: [
    {
      id: "occasion",
      type: "choice",
      label: "Pour quelle occasion ?",
      pourquoi: "Chaque occasion a ses codes : ce qu'on y attend, ce qu'on évite.",
      options: [
        { v: "mariage", label: "Mariage", match: ["mariage", "temoin", "noces"] },
        { v: "anniversaire", label: "Anniversaire", match: ["anniversaire", "ans"] },
        { v: "depart", label: "Départ (retraite, pot de départ)", match: ["retraite", "depart", "pot"] },
        { v: "hommage", label: "Hommage ou éloge", match: ["hommage", "eloge", "deces", "obseques", "funerailles"] },
        { v: "remerciements", label: "Remerciements", match: ["merci", "remerciement"] },
        { v: "carte", label: "Message écrit (carte, mot)", match: ["carte", "mot pour", "message"] },
      ],
    },
    {
      id: "lien",
      type: "text",
      label: "Quel est ton lien avec la personne concernée ?",
      pourquoi: "Un témoin, une fille ou un collègue ne parlent pas avec la même légitimité ni le même ton.",
      suggestions: ["Témoin et ami d'enfance du marié", "Collègue depuis 8 ans", "Sa fille aînée", "Sa meilleure amie"],
    },
    {
      id: "personne",
      type: "text",
      label: "Son prénom, et ce qui la caractérise en quelques mots",
      pourquoi: "Ses traits de caractère deviennent le fil conducteur du texte.",
      suggestions: ["Marc : généreux, toujours en retard, fou de vélo", "Claire : discrète, drôle, la meilleure cuisinière du monde"],
    },
    {
      id: "public",
      type: "text",
      label: "Qui va écouter ou lire ?",
      pourquoi: "Une anecdote drôle entre amis peut tomber à plat devant des grands-parents.",
      suggestions: ["120 invités, les deux familles", "L'équipe, une vingtaine de personnes", "Seulement elle"],
    },
    {
      id: "anecdotes",
      type: "long",
      label: "Deux ou trois anecdotes ou souvenirs précis",
      pourquoi: "Une anecdote vraie vaut dix adjectifs : c'est ce dont les gens se souviendront.",
      suggestions: ["Le jour où il a raté son train et fini la route en stop", "Notre premier projet ensemble, monté en une nuit", "Ses gâteaux du dimanche"],
    },
    {
      id: "ton",
      type: "choice",
      label: "Quel ton ?",
      pourquoi: "Rire, émouvoir, ou les deux : le dosage se décide avant d'écrire.",
      options: [
        { v: "emouvant", label: "Émouvant" },
        { v: "drole", label: "Drôle" },
        { v: "equilibre", label: "Équilibré (drôle puis émouvant)" },
        { v: "solennel", label: "Solennel et sobre" },
      ],
    },
    {
      id: "duree",
      type: "choice",
      label: "Quelle durée ?",
      pourquoi: "Au-delà de 5 minutes, un discours perd la salle ; on calcule environ 130 mots par minute.",
      options: [
        { v: "1", label: "1 minute (environ 130 mots)" },
        { v: "3", label: "3 minutes (environ 400 mots)" },
        { v: "5", label: "5 minutes (environ 650 mots)" },
        { v: "ecrit", label: "Message écrit court", match: ["carte", "message", "mot pour"] },
      ],
    },
    {
      id: "fin",
      type: "choice",
      label: "Comment finir ?",
      pourquoi: "La dernière phrase est celle qu'on retient.",
      auto: true,
      options: [
        { v: "toast", label: "En levant son verre" },
        { v: "direct", label: "Par un message direct à la personne" },
        { v: "citation", label: "Par une citation" },
      ],
    },
    {
      id: "eviter",
      type: "long",
      label: "Des sujets à éviter absolument ?",
      pourquoi: "Ce qui doit rester hors du texte compte autant que ce qu'on y met.",
      optional: true,
      suggestions: ["Les ex", "Les histoires de famille", "Son âge", "Les blagues sur le travail"],
    },
  ],
  build(c) {
    const ecrit = c.is("duree", "ecrit") || c.is("occasion", "carte");
    const conclusion = { toast: "en invitant la salle à lever son verre", direct: "par un message adressé directement à la personne", citation: "par une citation courte et peu connue, reliée à la personne" }[c.raw("fin")] || "par une phrase forte qui se retient";

    return {
      role: "Tu es une plume professionnelle : tu écris des discours et des messages personnels qui touchent juste, avec de l'humour quand il le faut, sans jamais mettre quelqu'un mal à l'aise.",
      sections: [
        sec(
          "Le contexte",
          line("Occasion", c.l("occasion")),
          line("Mon lien avec la personne", c.v("lien")),
          line("La personne", c.v("personne")),
          line("Public", c.v("public")),
          line("Ton", c.l("ton")),
          line("Durée", c.l("duree")),
        ),
        c.has("anecdotes") ? sec("Matière à utiliser", c.v("anecdotes")) : null,
        c.has("eviter") ? sec("Sujets à ne surtout pas aborder", c.v("eviter")) : null,
        sec(
          "Structure",
          ecrit
            ? steps([
                "Une première phrase personnelle, sans formule toute faite.",
                "Un souvenir ou une qualité précise, racontés en deux ou trois phrases.",
                "Le message principal.",
                "Une fin chaleureuse.",
              ])
            : steps([
                "Accroche (10 secondes) : une phrase ou une anecdote qui capte l'attention.",
                "Qui je suis et mon lien avec la personne, en une phrase.",
                "Deux anecdotes racontées comme de courtes histoires, chacune reliée à une qualité.",
                c.is("occasion", "mariage")
                  ? "Le message principal : ce que la personne représente, puis ce qui rend le couple fort."
                  : "Le message principal : ce que la personne représente pour moi et pour les autres.",
                `La conclusion, ${conclusion}.`,
              ]),
          !ecrit && "Écris pour l'oral : phrases courtes, mots simples, une idée par phrase. Indique les pauses avec [pause] et les moments où regarder la personne.",
          !ecrit && "Respecte la durée : environ 130 mots par minute.",
          c.is("occasion", "hommage") && "Garde un ton digne et chaleureux : célèbre la vie et les qualités de la personne, sans pathos excessif.",
        ),
        sec(
          "Format de la réponse",
          ecrit ? "Le message, puis 2 variantes plus courtes." : "Le texte complet, prêt à lire. Puis une version raccourcie de moitié, au cas où il faudrait couper.",
        ),
        sec(
          "À éviter",
          "- Les blagues qui humilient la personne ou excluent une partie du public.",
          "- Les private jokes que personne d'autre ne comprend.",
          "- Les citations trop connues et les formules creuses (« on ne présente plus Marc »).",
        ),
      ].filter(Boolean),
      relances: [
        "Ajoute une touche d'humour au début, sans changer la suite.",
        "Raccourcis à 1 minute en gardant la meilleure anecdote.",
        "Donne-moi 5 conseils pour bien dire ce texte le jour J.",
      ],
    };
  },
};
