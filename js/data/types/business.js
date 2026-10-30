import { sec, line, steps } from "../../lib/kit.js";

const BESOINS = {
  valider: {
    tache: "Aide-moi à vérifier, avant d'investir, que cette idée répond à un vrai besoin et peut être rentable.",
    methode: [
      "Formule les 3 hypothèses dont dépend le projet : un problème réel, des clients prêts à payer, une rentabilité possible.",
      "Pour chacune, les signaux qui la confirmeraient ou l'infirmeraient.",
      "Propose 5 tests rapides et peu coûteux (par exemple : entretiens clients, page de précommande, stand test sur un marché), avec pour chacun le coût, la durée et le seuil de réussite.",
      "Calcule le point mort : combien de ventes par mois pour couvrir les charges, avec tes hypothèses écrites.",
      "Les 3 raisons d'échec les plus probables et comment les anticiper.",
      "Les critères pour décider de continuer, d'ajuster ou d'arrêter.",
    ],
  },
  bp: {
    tache: "Rédige la trame complète de mon business plan, prête à compléter avec mes chiffres.",
    methode: [
      "Parties attendues : résumé (à écrire en dernier), problème et solution, marché et clients, concurrence, offre et prix, modèle économique, stratégie commerciale, organisation, prévisionnel sur 3 ans, besoins de financement, risques.",
      "Pour chaque partie : ce qu'elle doit démontrer, les questions auxquelles elle répond, et un premier jet rédigé à partir de mes informations.",
      "Pour le prévisionnel : un tableau avec les hypothèses de calcul visibles (prix, volumes, charges), que je pourrai remplacer par mes chiffres.",
    ],
  },
  marche: {
    tache: "Fais une étude de marché structurée pour mon projet.",
    methode: [
      "Les segments de clients et leurs besoins, avec 2 ou 3 profils types.",
      "La taille du marché avec une méthode de calcul explicite : hypothèses écrites, aucun chiffre présenté comme sûr s'il ne l'est pas.",
      "Un tableau des concurrents par type (directs, indirects, solutions de remplacement) : offre, prix, forces, faiblesses.",
      "Les tendances qui jouent pour ou contre le projet.",
      "Le positionnement qui me permettrait de me différencier.",
      "Les sources fiables à consulter pour vérifier (instituts de statistique, fédérations professionnelles, études sectorielles).",
    ],
  },
  offre: {
    tache: "Aide-moi à construire mon offre et à fixer mes prix.",
    methode: [
      "La proposition de valeur : le problème résolu, le bénéfice principal, la preuve.",
      "Trois formules (essentielle, standard, premium) avec leur contenu.",
      "Le prix de chaque formule calculé de trois façons : à partir des coûts, de la concurrence et de la valeur perçue.",
      "La marge par vente et le volume nécessaire pour être rentable, calculs visibles.",
      "Ta recommandation, et comment tester les prix auprès de vrais clients.",
    ],
  },
  clients: {
    tache: "Construis mon plan pour trouver mes prochains clients.",
    methode: [
      "Le portrait précis de mon client idéal : où il se trouve, ce qu'il lit, ce qui le décide à acheter.",
      "8 canaux d'acquisition possibles, notés sur l'impact, la confiance et la facilité, puis classés.",
      "Un plan d'action sur 30 jours, semaine par semaine.",
      "Les messages à utiliser : accroche, présentation en 30 secondes, relance.",
      "Les indicateurs à suivre chaque semaine.",
    ],
  },
  pitch: {
    tache: "Prépare mon pitch.",
    methode: [
      "Le pitch en une phrase.",
      "Le pitch oral d'une minute, écrit pour être dit.",
      "La structure d'une présentation en 10 slides : le titre et le message de chacune.",
      "Les 10 questions les plus probables d'un investisseur ou d'un banquier, avec des réponses solides.",
      "Les points faibles de mon dossier à traiter avant de pitcher.",
    ],
  },
  nom: {
    tache: "Trouve un nom et une identité pour mon projet.",
    methode: [
      "15 noms classés en 3 styles (descriptif, évocateur, inventé), chacun avec sa logique.",
      "Pour les 5 meilleurs : facilité de prononciation, mémorisation, risques de confusion.",
      "Une signature (slogan) pour chacun.",
      "Une direction d'identité visuelle pour le favori : couleurs, typographie, ambiance.",
      "Les vérifications à faire : marque déjà déposée (INPI en France), nom de domaine, comptes sur les réseaux.",
    ],
  },
};

export default {
  id: "business",
  nom: "Lancer ou développer un business",
  icon: "rocket",
  couleur: "mint",
  description: "Valider une idée, business plan, étude de marché, prix, clients, pitch, nom : du concret, chiffré quand c'est possible.",
  exemples: ["Lancer un food truck à Lyon", "Trouver mes premiers clients en freelance", "Fixer le prix de mes bougies artisanales"],
  motsCles: [
    ["business", 4], ["entreprise", 2], ["startup", 4], ["start up", 4], ["lancer", 2], ["monter ma", 3], ["creer ma", 2],
    ["ma boite", 3], ["auto entrepreneur", 4], ["micro entreprise", 4], ["freelance", 2], ["business plan", 5], ["etude de marche", 5],
    ["concurren", 2], ["rentab", 3], ["chiffre d affaires", 3], ["investisseur", 3], ["levee de fonds", 4], ["pitch", 3],
    ["food truck", 4], ["boutique", 2], ["franchise", 3], ["mes prix", 3], ["prix$", 2], ["fixer le prix", 4], ["tarif", 2],
    ["clients", 2], ["marque", 2], ["vendre", 2], ["artisan", 2],
  ],
  questions: [
    {
      id: "stade",
      type: "choice",
      label: "Où en est ton projet ?",
      pourquoi: "On ne conseille pas la même chose à une idée sur un carnet et à une activité qui tourne.",
      options: [
        { v: "idee", label: "C'est encore une idée" },
        { v: "lancement", label: "Je prépare le lancement" },
        { v: "lance", label: "C'est lancé, je veux grandir" },
        { v: "pivot", label: "Je veux changer de cap" },
      ],
    },
    {
      id: "besoin",
      type: "choice",
      label: "De quoi as-tu besoin en priorité ?",
      pourquoi: "C'est ce qui détermine le livrable : un plan de test, un business plan ou une grille de prix, par exemple.",
      options: [
        { v: "valider", label: "Vérifier que l'idée tient la route", match: ["valider", "bonne idee", "viable", "tenir la route"] },
        { v: "bp", label: "Écrire un business plan", match: ["business plan", "plan d affaires"] },
        { v: "marche", label: "Étudier le marché et la concurrence", match: ["etude de marche", "concurren", "marche"] },
        { v: "offre", label: "Définir mon offre et mes prix", match: ["prix", "tarif", "offre"] },
        { v: "clients", label: "Trouver des clients", match: ["clients", "prospect", "vendre", "premiers clients"] },
        { v: "pitch", label: "Convaincre un investisseur ou une banque", match: ["pitch", "investisseur", "levee", "banque", "financement"] },
        { v: "nom", label: "Trouver un nom et une identité", match: ["nom", "logo", "identite"] },
      ],
    },
    {
      id: "activite",
      type: "long",
      label: "Ce que tu vends, à qui, et ce qui te rend différent",
      pourquoi: "C'est la base de tout le reste : sans ça, l'IA répond avec des généralités.",
      prefill: (idea) => idea,
      suggestions: ["Des burgers végétariens en food truck, avec des produits locaux", "Des sites web clés en main pour artisans, livrés en 10 jours"],
    },
    {
      id: "lieu",
      type: "text",
      label: "Où ?",
      pourquoi: "Le marché, les prix et la réglementation changent d'un endroit à l'autre.",
      suggestions: ["Lyon et alentours", "Partout en France, en ligne", "Bruxelles", "Montréal"],
    },
    {
      id: "clients",
      type: "text",
      label: "Qui sont tes clients idéaux ?",
      pourquoi: "Un client précis donne des conseils précis ; « tout le monde » donne des conseils vagues.",
      suggestions: ["Les salariés pressés d'un quartier de bureaux", "Les entreprises de moins de 10 salariés", "Les parents de jeunes enfants"],
    },
    {
      id: "ressources",
      type: "text",
      label: "Ton budget de départ et le temps que tu peux y consacrer",
      pourquoi: "Un plan à 50 000 € ne sert à rien si tu disposes de 2 000 € et de tes soirées.",
      suggestions: ["15 000 €, à temps plein", "Moins de 2 000 €, le soir et le week-end"],
    },
    {
      id: "chiffres",
      type: "long",
      label: "Les chiffres que tu connais déjà",
      pourquoi: "Avec tes vrais chiffres, l'IA calcule ; sans eux, elle fait des hypothèses, et elle devra les signaler.",
      optional: true,
      suggestions: ["Prix de vente prévu : 9 €", "Coût de revient : 3,20 €", "200 abonnés sur Instagram", "Loyer de l'emplacement : 400 € par mois"],
    },
    {
      id: "atouts",
      type: "long",
      label: "Tes atouts et tes contraintes",
      pourquoi: "Ton expérience, ton réseau ou ton statut changent la stratégie la plus réaliste pour toi.",
      optional: true,
      suggestions: ["10 ans d'expérience en restauration", "Pas encore de local", "Statut de micro-entrepreneur", "Un bon réseau dans le secteur"],
    },
  ],
  build(c) {
    const besoin = BESOINS[c.raw("besoin")];
    return {
      role: "Tu es consultant en création et en développement d'entreprise, habitué aux petites structures. Tu es concret, tu chiffres quand c'est possible et tu es honnête sur les risques.",
      sections: [
        sec(
          "Où j'en suis",
          line("Stade du projet", c.l("stade")),
          line("Mon activité", c.v("activite")),
          line("Lieu", c.v("lieu")),
          line("Clients visés", c.v("clients")),
          line("Budget et temps disponible", c.v("ressources")),
          line("Chiffres connus", c.v("chiffres")),
          line("Atouts et contraintes", c.v("atouts")),
        ),
        sec("Ce que j'attends de toi", besoin ? besoin.tache : "Analyse mon projet et donne-moi les 5 priorités pour avancer, dans l'ordre, avec la première action à faire cette semaine."),
        besoin ? sec("Méthode", steps(besoin.methode)) : null,
        sec("Format de la réponse", "Des intertitres, des tableaux dès qu'il y a des chiffres ou des comparaisons, et un plan d'action final en 5 étapes datées."),
        sec(
          "Garde-fous",
          "- Sépare toujours mes données, tes hypothèses (marquées [HYPOTHÈSE]) et ce qu'il faut vérifier. Ne présente aucun chiffre de marché comme certain.",
          "- Pour les questions juridiques, fiscales ou de financement, indique ce qui doit être validé par un professionnel (expert-comptable, chambre de commerce, juriste).",
          "- Sois franc sur les faiblesses du projet : je préfère les connaître maintenant.",
        ),
      ].filter(Boolean),
      relances: [
        "Joue l'investisseur sceptique : attaque mon projet avec tes 10 questions les plus dures.",
        "Transforme ce plan en tableau de suivi, semaine par semaine.",
        "Calcule 3 scénarios (prudent, réaliste, ambitieux) à partir de mes chiffres.",
      ],
    };
  },
};
