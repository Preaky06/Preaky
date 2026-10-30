import { sec, line, steps } from "../../lib/kit.js";

const CANDIDATURE = (a) => a.type === "motivation" || a.type === "cv";

const METHODES = {
  mail: [
    "Un objet clair qui annonce le contenu.",
    "La demande ou l'information principale dès les 2 premières lignes.",
    "Le contexte utile, rien de plus.",
    "Une action attendue précise, avec une date si besoin.",
    "Une formule de politesse adaptée à notre relation.",
  ],
  motivation: [
    "Ce qui m'attire chez ce recruteur : précis, relié à l'offre, impossible à réutiliser pour une autre entreprise.",
    "Ce que j'apporte : 2 ou 3 réalisations prouvées, reliées aux besoins du poste.",
    "Ce que nous pourrions faire ensemble, et la demande d'entretien.",
    "Une page maximum, des paragraphes courts.",
  ],
  cv: [
    "Un titre de CV qui reprend l'intitulé du poste visé.",
    "Une accroche de 3 lignes.",
    "Les expériences écrites en réalisations : verbe d'action et résultat, chiffré quand c'est possible.",
    "Les compétences liées à l'offre, en reprenant ses mots-clés.",
    "Des conseils de mise en page pour une lecture en 30 secondes et pour les logiciels de tri des candidatures.",
  ],
  courrier: [
    "Coordonnées et références (numéro de client, de contrat, de commande) aux bons endroits.",
    "Un objet précis.",
    "Le rappel des faits, datés.",
    "La demande, formulée clairement.",
    "Le délai de réponse attendu et les suites envisagées.",
    "La liste des pièces jointes, et s'il vaut mieux envoyer en recommandé avec accusé de réception.",
  ],
  rapport: [
    "La conclusion ou la recommandation en premier.",
    "Le contexte en 3 lignes.",
    "Les éléments clés, chiffrés.",
    "Les options ou décisions à prendre.",
    "Les prochaines étapes, avec responsables et dates.",
  ],
  presentation: [
    "La trame slide par slide : pour chaque slide, un titre qui dit la conclusion, le contenu et une idée de visuel.",
    "Une seule idée par slide.",
    "Une introduction qui annonce l'enjeu et une conclusion qui dit ce qu'on attend du public.",
  ],
  delicat: [
    "Ouvre de façon humaine, sans détours excessifs.",
    "Dis l'essentiel clairement, sans ambiguïté.",
    "Explique la raison en restant factuel.",
    "Propose une solution ou une suite.",
    "Termine en préservant la relation.",
  ],
};

export default {
  id: "ecrit",
  nom: "Écrit professionnel",
  icon: "mail",
  couleur: "violet",
  description: "Mail, lettre de motivation, CV, courrier, rapport, message délicat : clair, efficace, adapté à qui le lira.",
  exemples: ["Une lettre de motivation pour un stage en marketing", "Un mail pour demander une augmentation", "Une réclamation à mon opérateur internet"],
  motsCles: [
    ["mail", 3], ["email", 3], ["courriel", 3], ["lettre", 3], ["lettre de motivation", 5], ["motivation", 2], ["cv$", 5],
    ["candidature", 3], ["rapport", 2], ["compte rendu", 2], ["note de synthese", 3], ["reclamation", 4], ["resiliation", 4],
    ["courrier", 3], ["relancer", 2], ["augmentation", 3], ["demission", 3], ["refus", 2], ["presentation", 2], ["slides", 2],
  ],
  questions: [
    {
      id: "type",
      type: "choice",
      label: "Quel écrit ?",
      pourquoi: "Chaque écrit a sa structure : un mail va droit au but, une lettre de motivation raconte un lien.",
      options: [
        { v: "mail", label: "Un mail", match: ["mail", "email", "courriel"] },
        { v: "motivation", label: "Une lettre de motivation", match: ["motivation", "candidature"] },
        { v: "cv", label: "Un CV", match: ["cv", "curriculum"] },
        { v: "courrier", label: "Un courrier officiel (réclamation, résiliation, contestation)", match: ["reclamation", "resiliation", "courrier", "administration", "recommande"] },
        { v: "rapport", label: "Un rapport ou un compte rendu", match: ["rapport", "compte rendu", "synthese"] },
        { v: "presentation", label: "Une présentation (slides)", match: ["presentation", "slides", "powerpoint"] },
        { v: "delicat", label: "Un message délicat (refus, recadrage, relance)", match: ["refus", "recadr", "relance", "delicat", "excuse", "augmentation", "demission"] },
      ],
    },
    {
      id: "destinataire",
      type: "text",
      label: "À qui s'adresse-t-il, et quel est ton lien avec cette personne ?",
      pourquoi: "On n'écrit pas à son manager comme à un service client ou à un recruteur.",
      suggestions: ["Mon manager", "Un client mécontent", "Le service client de mon opérateur", "Un recruteur que je ne connais pas"],
    },
    {
      id: "objectif",
      type: "text",
      label: "Que veux-tu obtenir ?",
      pourquoi: "Un écrit efficace est construit autour de ce qu'il doit déclencher.",
      suggestions: ["Un rendez-vous", "Un remboursement", "Qu'il accepte un délai", "Décrocher un entretien"],
    },
    {
      id: "offre",
      type: "long",
      label: "L'offre visée (colle l'annonce ou résume-la)",
      pourquoi: "La candidature doit répondre aux besoins précis du poste, avec ses mots-clés.",
      when: CANDIDATURE,
    },
    {
      id: "parcours",
      type: "long",
      label: "Ton parcours : expériences, compétences, réalisations",
      pourquoi: "L'IA ne doit rien inventer : elle met en valeur ce que tu as vraiment fait.",
      when: CANDIDATURE,
      suggestions: ["Stage de 6 mois en agence : gestion de 3 comptes Instagram, +40 % d'abonnés", "BTS Communication, mention bien"],
    },
    {
      id: "infos",
      type: "long",
      label: "Les informations clés à faire passer",
      pourquoi: "Faits, dates, chiffres, références : sans eux, l'écrit reste vague ou l'IA invente.",
      when: (a) => !CANDIDATURE(a),
      suggestions: ["Commande n° 48213 du 3 mars, colis jamais reçu", "J'ai repris 2 dossiers clients depuis janvier"],
    },
    {
      id: "historique",
      type: "long",
      label: "S'il s'agit d'une réponse : l'historique de l'échange",
      pourquoi: "La réponse doit tenir compte de ce qui a déjà été dit.",
      optional: true,
      when: (a) => !CANDIDATURE(a),
    },
    {
      id: "ton",
      type: "choice",
      label: "Quel ton ?",
      pourquoi: "Le même message peut passer pour poli ou pour agressif selon le ton.",
      options: [
        { v: "formel", label: "Formel" },
        { v: "cordial", label: "Cordial" },
        { v: "direct", label: "Direct" },
        { v: "chaleureux", label: "Chaleureux" },
        { v: "ferme", label: "Ferme" },
      ],
    },
    {
      id: "longueur",
      type: "choice",
      label: "Quelle longueur ?",
      pourquoi: "Un mail de 5 lignes est lu ; un mail de 30 lignes est survolé.",
      options: [
        { v: "tres_court", label: "Très court (5 lignes)" },
        { v: "court", label: "Court" },
        { v: "detaille", label: "Détaillé" },
      ],
    },
  ],
  build(c) {
    const type = c.raw("type");
    const role =
      type === "motivation" || type === "cv"
        ? "Tu es recruteur et coach carrière. Tu sais ce qui fait retenir une candidature en 30 secondes."
        : type === "courrier"
          ? "Tu es rédacteur spécialisé dans les courriers administratifs et la défense des consommateurs."
          : type === "rapport" || type === "presentation"
            ? "Tu es consultant, habitué à synthétiser des informations pour des décideurs pressés."
            : "Tu es expert de la communication écrite professionnelle. Tu écris des messages clairs, efficaces et adaptés à leur destinataire.";

    return {
      role,
      sections: [
        sec(
          "Le contexte",
          line("Type d'écrit", c.l("type")),
          line("Destinataire", c.v("destinataire")),
          line("Ce que je veux obtenir", c.v("objectif")),
          line("Ton", c.l("ton")),
          line("Longueur", c.l("longueur")),
        ),
        c.has("offre") ? sec("L'offre visée", c.v("offre")) : null,
        c.has("parcours") ? sec("Mon parcours", c.v("parcours")) : null,
        c.has("infos") ? sec("Informations à utiliser", c.v("infos")) : null,
        c.has("historique") ? sec("Historique de l'échange", c.v("historique")) : null,
        sec("Structure", steps(METHODES[type] || METHODES.mail)),
        sec(
          "Format de la réponse",
          type === "cv"
            ? "Le contenu du CV, section par section, prêt à mettre en page."
            : `Le texte prêt à envoyer${type === "mail" || !type ? ", avec son objet" : ""}. Puis 2 variantes de la première phrase.`,
        ),
        sec(
          "Garde-fous",
          "- N'invente aucune expérience, compétence, date, référence ou chiffre : écris [À COMPLÉTER] là où il manque une information.",
          type === "courrier" && "- Si tu mentionnes un droit ou un texte de loi, signale-le comme à vérifier.",
          "- Bannis les formules creuses : « Je me permets de », « N'hésitez pas à », « Dans l'attente de votre retour » en guise de contenu.",
        ),
      ].filter(Boolean),
      relances: [
        "Rends ce texte 30 % plus court sans perdre l'essentiel.",
        "Rends le ton plus ferme, sans être désagréable.",
        "Écris la relance à envoyer si je n'ai pas de réponse dans 7 jours.",
      ],
    };
  },
};
