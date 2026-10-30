import { sec, line, steps } from "../../lib/kit.js";

export default {
  id: "poeme",
  nom: "Poème ou chanson",
  icon: "feather",
  couleur: "violet",
  description: "Poème, haïku, slam, chanson, rap : un texte qui sonne juste, avec tes détails à toi.",
  exemples: ["Un poème pour les 60 ans de ma mère", "Les paroles d'une chanson pour notre mariage", "Un slam sur la pression des études"],
  motsCles: [
    ["poeme", 4], ["poesie", 4], ["poete", 3], ["vers$", 2], ["rime", 3], ["haiku", 4], ["sonnet", 4], ["slam", 4],
    ["chanson", 4], ["paroles", 3], ["rap$", 4], ["couplet", 3], ["refrain", 3], ["alexandrin", 4], ["acrostiche", 4],
  ],
  questions: [
    {
      id: "forme",
      type: "choice",
      label: "Quelle forme ?",
      pourquoi: "Chaque forme a ses règles : un haïku, un sonnet et un refrain ne s'écrivent pas pareil.",
      options: [
        { v: "libre", label: "Poème en vers libres", match: ["vers libres", "libre"] },
        { v: "rime", label: "Poème rimé", match: ["rime", "rimes"] },
        { v: "sonnet", label: "Sonnet", match: ["sonnet"] },
        { v: "haiku", label: "Haïku", match: ["haiku"] },
        { v: "slam", label: "Slam", match: ["slam"] },
        { v: "chanson", label: "Chanson (couplets et refrain)", match: ["chanson", "refrain", "couplet", "paroles"] },
        { v: "rap", label: "Rap", match: ["rap", "freestyle"] },
      ],
    },
    {
      id: "occasion",
      type: "text",
      label: "Pour quelle occasion, ou pour qui ?",
      pourquoi: "On n'écrit pas de la même façon pour un anniversaire, une rupture ou pour soi.",
      suggestions: ["Les 60 ans de ma mère", "Une déclaration d'amour", "Le départ à la retraite d'un collègue", "Pour moi, pour dire ce que je ressens"],
    },
    {
      id: "theme",
      type: "text",
      label: "Quel thème ou quelle émotion au centre ?",
      pourquoi: "Une émotion précise donne un texte fort ; plusieurs à la fois donnent un texte flou.",
      auto: true,
      suggestions: ["La gratitude", "La nostalgie de l'enfance", "Le temps qui passe", "La colère face à l'injustice"],
    },
    {
      id: "details",
      type: "long",
      label: "Quels détails personnels glisser dans le texte ?",
      pourquoi: "Un prénom, un souvenir, un lieu : c'est ce qui rend un texte unique, impossible à trouver ailleurs.",
      optional: true,
      suggestions: ["Prénom : Sylvie", "Nos dimanches à la plage de Biarritz", "Elle chante faux, mais tout le temps", "Le jardin de mes grands-parents"],
    },
    {
      id: "ton",
      type: "multi",
      label: "Quel ton ?",
      pourquoi: "Tendre et drôle à la fois, c'est possible ; il faut juste le dire.",
      options: [
        { v: "tendre", label: "Tendre" },
        { v: "drole", label: "Drôle" },
        { v: "melancolique", label: "Mélancolique" },
        { v: "solennel", label: "Solennel" },
        { v: "energique", label: "Énergique" },
        { v: "engage", label: "Engagé" },
      ],
    },
    {
      id: "longueur",
      type: "choice",
      label: "Quelle longueur ?",
      pourquoi: "Un texte lu à une fête ne fait pas la même taille qu'un texte écrit sur une carte.",
      options: [
        { v: "court", label: "Court (4 à 8 vers)" },
        { v: "moyen", label: "Moyen (12 à 20 vers)" },
        { v: "long", label: "Long (plus de 20 vers)" },
        { v: "complet", label: "Chanson complète (2 couplets, refrain, pont)" },
      ],
    },
    {
      id: "contraintes",
      type: "multi",
      label: "Des contraintes d'écriture ?",
      pourquoi: "Rimes, métrique, jeux de mots : autant le préciser avant plutôt que de corriger après.",
      optional: true,
      options: [
        { v: "riches", label: "Rimes riches" },
        { v: "pasrimes", label: "Pas de rimes" },
        { v: "alexandrins", label: "Alexandrins (12 syllabes)" },
        { v: "simple", label: "Vocabulaire simple" },
        { v: "jeux", label: "Jeux de mots" },
        { v: "acrostiche", label: "Acrostiche", match: ["acrostiche"] },
      ],
    },
    {
      id: "acrostiche",
      type: "text",
      label: "Quel mot ou prénom pour l'acrostiche ?",
      pourquoi: "Les premières lettres des vers formeront ce mot.",
      when: (a) => (a.contraintes || []).includes("acrostiche"),
      suggestions: ["MAMAN", "SYLVIE", "MERCI"],
    },
    {
      id: "musique",
      type: "text",
      label: "Quel style musical, ou quel artiste de référence ?",
      pourquoi: "Le rythme des paroles dépend de la musique sur laquelle elles seront posées.",
      optional: true,
      when: (a) => a.forme === "chanson" || a.forme === "rap",
      suggestions: ["Variété française douce", "Rap boom bap", "Pop entraînante", "Folk guitare-voix"],
    },
    {
      id: "partage",
      type: "choice",
      label: "Comment le texte sera-t-il partagé ?",
      pourquoi: "Un texte dit à voix haute doit se respirer ; un texte écrit peut jouer sur la mise en page.",
      optional: true,
      options: [
        { v: "lu", label: "Lu à voix haute" },
        { v: "ecrit", label: "Écrit sur une carte ou un message" },
        { v: "chante", label: "Chanté" },
        { v: "perso", label: "Gardé pour moi" },
      ],
    },
  ],
  build(c) {
    const chante = c.is("forme", "chanson") || c.is("forme", "rap");
    const forme = {
      sonnet: "Respecte la forme du sonnet : 2 quatrains puis 2 tercets, en alexandrins sauf indication contraire, avec une chute forte au dernier vers.",
      haiku: "Respecte l'esprit du haïku : 3 vers courts (environ 5, 7 et 5 syllabes), une image concrète, un instant présent, souvent une saison.",
      chanson: "Structure : couplet 1, refrain, couplet 2, refrain, pont, refrain final. Le refrain est court, mémorable et facile à chanter.",
      rap: "Structure en couplets de 16 mesures et un refrain ; soigne les rimes multisyllabiques, le flow et les phrases qui marquent.",
      slam: "Écris pour l'oral : rythme marqué, répétitions, montée en intensité jusqu'à la dernière phrase.",
    }[c.raw("forme")];

    return {
      role: chante
        ? "Tu es parolier et auteur-compositeur. Tu écris des textes qui sonnent, se chantent et touchent."
        : "Tu es poète. Tu écris des textes précis, imagés et sincères, qui évitent les formules toutes faites.",
      sections: [
        sec(
          "Le texte à écrire",
          line("Forme", c.l("forme")),
          line("Occasion ou destinataire", c.v("occasion")),
          line("Thème ou émotion centrale", c.v("theme")),
          line("Ton", c.l("ton")),
          line("Longueur", c.l("longueur")),
          line("Contraintes", c.l("contraintes")),
          line("Acrostiche sur le mot", c.v("acrostiche")),
          line("Style musical de référence", c.v("musique")),
          line("Partage", c.l("partage")),
        ),
        c.has("details") ? sec("Détails personnels à intégrer", c.v("details"), "Intègre-les naturellement, comme des images, pas comme une liste.") : null,
        sec(
          "Méthode",
          steps([
            "Trouve d'abord une image centrale forte (un objet, un geste, un lieu) qui portera tout le texte.",
            "Préfère le concret au vague : « ses mains pleines de farine » plutôt que « sa gentillesse ».",
            c.is("contraintes", "pasrimes") ? "Travaille le rythme et les sonorités (allitérations, assonances) plutôt que les rimes." : "Travaille le rythme et les sonorités ; des rimes naturelles, jamais forcées.",
            forme,
            c.is("contraintes", "acrostiche") && "Les premières lettres des vers forment le mot demandé, sans que le texte paraisse forcé.",
            c.is("partage", "lu") && "Le texte sera dit à voix haute : chaque vers doit pouvoir se dire d'une seule respiration.",
            "Termine sur une image ou une phrase qui reste en tête.",
          ]),
        ),
        sec("Format de la réponse", "Le texte avec un titre, mis en page en vers et en strophes."),
        sec(
          "À éviter",
          "- Les rimes et images usées : « amour / toujours », « cœur / bonheur », « les étoiles dans tes yeux ».",
          "- Les mots choisis seulement pour la rime, les généralités, les adjectifs empilés.",
        ),
      ].filter(Boolean),
      relances: [
        "Propose une version deux fois plus courte qui garde les meilleures images.",
        "Réécris la dernière strophe pour une fin plus forte.",
        "Remplace toutes les rimes trop attendues par des rimes plus surprenantes.",
      ],
    };
  },
};
