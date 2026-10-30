import { sec, line, steps } from "../../lib/kit.js";

const PLANS = {
  voyage: "Construis un itinéraire jour par jour : étapes, temps de trajet estimés, activités du matin, de l'après-midi et du soir, type de logement et quartier où dormir, avec du temps libre.",
  evenement: "Construis un rétroplanning (J-60, J-30, J-7, J-1, jour J) et le déroulé du jour J heure par heure.",
  routine: "Propose un emploi du temps type et les règles qui le rendent tenable : temps tampons, priorités, ce qu'on laisse tomber les mauvais jours.",
  demenagement: "Construis un rétroplanning semaine par semaine, avec les démarches administratives, les résiliations, les cartons pièce par pièce et le jour J.",
  projet_perso: "Découpe le projet en étapes avec un livrable par étape, une durée estimée et ce qui dépend de quoi.",
  projet_pro: "Découpe le projet en phases avec livrables, responsables, durées estimées, dépendances et jalons de validation.",
};

export default {
  id: "planifier",
  nom: "Organiser un projet ou un voyage",
  icon: "calendar",
  couleur: "sun",
  description: "Voyage, événement, déménagement, routine, projet : un planning réaliste, un budget et une checklist.",
  exemples: ["Organiser un road trip de 10 jours en Italie", "Préparer l'anniversaire surprise de mon copain", "Une routine pour réviser et faire du sport"],
  motsCles: [
    ["organiser", 2], ["planifier", 3], ["planning", 3], ["programme", 1], ["voyage", 4], ["vacances", 4], ["itineraire", 4],
    ["road trip", 4], ["roadtrip", 4], ["week end", 2], ["sejour", 3], ["evenement", 3], ["fete", 3], ["soiree", 2], ["seminaire", 3],
    ["demenag", 4], ["routine", 4], ["surprise", 3], ["emploi du temps", 4], ["menu de la semaine", 4], ["repas de la semaine", 4], ["checklist", 2], ["preparer", 1],
  ],
  questions: [
    {
      id: "type",
      type: "choice",
      label: "Qu'est-ce que tu organises ?",
      pourquoi: "Un voyage se planifie en jours, un événement à rebours depuis la date, une routine en semaines.",
      options: [
        { v: "voyage", label: "Un voyage", match: ["voyage", "vacances", "sejour", "road trip", "roadtrip", "week end", "itineraire"] },
        { v: "evenement", label: "Un événement (fête, mariage, séminaire)", match: ["fete", "anniversaire", "soiree", "mariage", "seminaire", "evenement", "surprise"] },
        { v: "projet_perso", label: "Un projet personnel", match: ["projet"] },
        { v: "projet_pro", label: "Un projet professionnel", match: ["client", "equipe"] },
        { v: "routine", label: "Une routine ou un emploi du temps", match: ["routine", "emploi du temps", "planning", "semaine", "reviser", "sport"] },
        { v: "demenagement", label: "Un déménagement", match: ["demenag"] },
      ],
    },
    {
      id: "quand",
      type: "text",
      label: "Quand, et pour combien de temps ?",
      pourquoi: "Les dates conditionnent tout : disponibilités, prix, météo, délais de réservation.",
      suggestions: ["10 jours en août", "Le samedi 14 juin", "Sur 3 mois, à partir de septembre", "Tous les jours de la semaine"],
    },
    {
      id: "qui",
      type: "text",
      label: "Pour qui, combien de personnes ?",
      pourquoi: "On n'organise pas pareil pour deux adultes, une famille avec de jeunes enfants ou 40 invités.",
      suggestions: ["Nous deux", "Une famille avec 2 enfants de 6 et 9 ans", "40 invités", "Moi seul"],
    },
    {
      id: "budget",
      type: "text",
      label: "Quel budget ?",
      pourquoi: "Sans budget, l'IA propose des choix au hasard, souvent trop chers.",
      suggestions: ["1 500 € tout compris", "Moins de 500 €", "Pas de limite précise"],
    },
    {
      id: "depart",
      type: "text",
      label: "D'où pars-tu, et comment te déplaces-tu ?",
      pourquoi: "Le point de départ et le moyen de transport définissent les trajets possibles.",
      when: (a) => a.type === "voyage",
      suggestions: ["Depuis Paris, en train", "Depuis Lyon, en voiture", "Depuis Bruxelles, en avion"],
    },
    {
      id: "rythme",
      type: "choice",
      label: "Quel rythme ?",
      pourquoi: "Un planning trop chargé ne tient pas plus de trois jours.",
      when: (a) => a.type === "voyage" || a.type === "routine",
      options: [
        { v: "tranquille", label: "Tranquille" },
        { v: "equilibre", label: "Équilibré" },
        { v: "intense", label: "Intense" },
      ],
    },
    {
      id: "envies",
      type: "long",
      label: "Tes envies, tes priorités, tes incontournables",
      pourquoi: "C'est ce qui distingue ton plan d'un plan générique trouvé sur Internet.",
      suggestions: ["Plages calmes et bonne cuisine locale", "Une soirée dansante surprise", "Avancer une heure par jour sans y penser"],
    },
    {
      id: "contraintes",
      type: "long",
      label: "Des contraintes à respecter ?",
      pourquoi: "Santé, enfants, horaires, régime : mieux vaut les intégrer dès le départ.",
      optional: true,
      suggestions: ["Pas plus de 3 heures de route par jour", "Repas végétariens", "Horaires de travail décalés", "Accessible en fauteuil roulant"],
    },
    {
      id: "detail",
      type: "choice",
      label: "Quel niveau de détail ?",
      pourquoi: "Les grandes lignes pour décider, le détail pour exécuter.",
      options: [
        { v: "grandes_lignes", label: "Les grandes lignes" },
        { v: "detaille", label: "Un planning détaillé" },
        { v: "checklist", label: "Une checklist avec échéances" },
        { v: "tout", label: "Tout ça" },
      ],
    },
  ],
  build(c) {
    const type = c.raw("type");
    const role =
      type === "voyage"
        ? "Tu es un organisateur de voyages expérimenté. Tu conçois des itinéraires réalistes, sans courir d'une visite à l'autre."
        : type === "evenement"
          ? "Tu es organisateur d'événements : tu penses à tout, du budget au plan B."
          : type === "routine"
            ? "Tu es coach en organisation personnelle, réaliste sur le temps et l'énergie disponibles."
            : "Tu es un chef de projet rigoureux et pragmatique.";

    return {
      role,
      sections: [
        sec(
          "Les données",
          line("Ce que j'organise", c.l("type")),
          line("Dates et durée", c.v("quand")),
          line("Pour qui", c.v("qui")),
          line("Budget", c.v("budget")),
          line("Départ et transport", c.v("depart")),
          line("Rythme", c.l("rythme")),
          line("Envies et incontournables", c.v("envies")),
          line("Contraintes", c.v("contraintes")),
          line("Niveau de détail", c.l("detail")),
        ),
        sec(
          "Méthode",
          steps([
            "Vérifie d'abord la faisabilité globale (temps, budget, distances) et signale ce qui coince.",
            PLANS[type] || "Découpe l'organisation en étapes, avec une durée et une échéance pour chacune.",
            "Répartis le budget par poste, avec une marge pour les imprévus.",
            "Fais la liste de tout ce qu'il faut réserver, acheter ou préparer, avec une date limite pour chaque élément.",
            "Identifie les risques principaux et prévois un plan B pour chacun.",
          ]),
        ),
        sec("Format de la réponse", "Des tableaux pour le planning et le budget, et une checklist à cocher à la fin."),
        sec(
          "Garde-fous",
          "- Les prix, horaires et disponibilités changent : présente-les comme des estimations à vérifier.",
          "- Ne cite aucun établissement, horaire ou adresse dont tu n'es pas sûr qu'il existe encore.",
        ),
      ],
      relances: [
        "Propose une version 30 % moins chère.",
        "Prévois une version de secours pour un jour de pluie ou un imprévu.",
        "Transforme la checklist en rappels datés à mettre dans mon agenda.",
      ],
    };
  },
};
