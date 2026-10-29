// Métiers, catégories de tâches et parcours (enchaînements de prompts).
// Pour ajouter un métier : une entrée ici + un fichier dans js/data/prompts/.

export const METIERS = [
  {
    id: "cm",
    nom: "Community manager",
    icon: "megaphone",
    accroche: "Calendrier, accroches, scripts, modération : du contenu qui sert un objectif.",
    taches: ["Calendrier éditorial", "Accroches et scripts vidéo", "Commentaires négatifs"],
  },
  {
    id: "design",
    nom: "Graphiste & DA",
    icon: "pen",
    accroche: "Du brief flou à la proposition défendue devant le client.",
    taches: ["Brief créatif", "Directions artistiques", "Prompts d'images"],
  },
  {
    id: "commercial",
    nom: "Commercial B2B",
    icon: "briefcase",
    accroche: "Préparer, prospecter, répondre aux objections, conclure.",
    taches: ["Préparation de rendez-vous", "Séquences de prospection", "Objections"],
  },
  {
    id: "rh",
    nom: "RH & recrutement",
    icon: "users",
    accroche: "Recruter avec méthode, sans biais, et intégrer pour de bon.",
    taches: ["Fiches de poste", "Entretiens structurés", "Intégration 30-60-90"],
  },
  {
    id: "immo",
    nom: "Agent immobilier",
    icon: "home",
    accroche: "Annonces, avis de valeur, prospection : chaque étape du mandat.",
    taches: ["Annonces", "Avis de valeur", "Prospection vendeurs"],
  },
  {
    id: "juridique",
    nom: "Juriste & avocat",
    icon: "scale",
    accroche: "Revue de contrat, fiche d'arrêt, mise en demeure, sans jurisprudence inventée.",
    taches: ["Revue de contrat", "Fiche d'arrêt", "Mise en demeure"],
  },
  {
    id: "finance",
    nom: "Compta & gestion",
    icon: "chart",
    accroche: "Écarts, trésorerie, reporting : des chiffres qui mènent à des décisions.",
    taches: ["Budget / réel", "Trésorerie 12 mois", "Relances d'impayés"],
  },
  {
    id: "ecommerce",
    nom: "E-commerce",
    icon: "bag",
    accroche: "Fiches produit, service client, avis, publicités : tout ce qui fait vendre.",
    taches: ["Fiches produit", "Service client", "Analyse des avis"],
  },
];

export const CATEGORIES = [
  { id: "strategie", nom: "Stratégie" },
  { id: "creation", nom: "Création" },
  { id: "redaction", nom: "Rédaction" },
  { id: "analyse", nom: "Analyse" },
  { id: "relation", nom: "Relation client" },
];

// Chaque parcours enchaîne des prompts existants pour mener une mission de bout en bout.
export const PARCOURS = [
  {
    metier: "cm",
    titre: "Lancer un mois de contenu",
    etapes: [
      { id: "cm-audit", note: "Pars de ce qui marche déjà" },
      { id: "cm-calendrier", note: "Planifie 4 semaines" },
      { id: "cm-hooks", note: "Écris les accroches" },
      { id: "cm-script", note: "Scénarise les vidéos" },
    ],
  },
  {
    metier: "design",
    titre: "Du brief à la validation",
    etapes: [
      { id: "design-brief", note: "Clarifie la demande" },
      { id: "design-directions", note: "Propose 3 pistes" },
      { id: "design-image-prompts", note: "Produis les visuels" },
      { id: "design-defendre", note: "Fais valider" },
    ],
  },
  {
    metier: "commercial",
    titre: "Signer un nouveau client",
    etapes: [
      { id: "com-preparation", note: "Prépare le rendez-vous" },
      { id: "com-compte-rendu", note: "Assure le suivi" },
      { id: "com-objections", note: "Lève les freins" },
      { id: "com-proposition", note: "Envoie la proposition" },
    ],
  },
  {
    metier: "rh",
    titre: "Recruter et intégrer",
    etapes: [
      { id: "rh-fiche-poste", note: "Publie l'offre" },
      { id: "rh-grille-entretien", note: "Structure les entretiens" },
      { id: "rh-analyse-cv", note: "Prépare chaque entretien" },
      { id: "rh-onboarding", note: "Réussis l'arrivée" },
    ],
  },
  {
    metier: "immo",
    titre: "Du mandat à la vente",
    etapes: [
      { id: "immo-avis-valeur", note: "Fixe le bon prix" },
      { id: "immo-objections-mandat", note: "Signe le mandat" },
      { id: "immo-annonce", note: "Publie l'annonce" },
      { id: "immo-compte-rendu-visite", note: "Rends compte au vendeur" },
    ],
  },
  {
    metier: "juridique",
    titre: "Traiter un litige contractuel",
    etapes: [
      { id: "jur-revue-contrat", note: "Relis le contrat" },
      { id: "jur-mise-en-demeure", note: "Mets en demeure" },
      { id: "jur-argumentation", note: "Prépare le dossier" },
      { id: "jur-vulgarisation", note: "Explique au client" },
    ],
  },
  {
    metier: "finance",
    titre: "Clôturer le mois",
    etapes: [
      { id: "fin-controle", note: "Contrôle les données" },
      { id: "fin-ecarts", note: "Explique les écarts" },
      { id: "fin-tresorerie", note: "Mets à jour la trésorerie" },
      { id: "fin-reporting", note: "Informe la direction" },
    ],
  },
  {
    metier: "ecommerce",
    titre: "Relancer un produit qui vend mal",
    etapes: [
      { id: "ecom-avis", note: "Écoute les clients" },
      { id: "ecom-fiche-produit", note: "Réécris la fiche" },
      { id: "ecom-pubs", note: "Teste des publicités" },
      { id: "ecom-panier", note: "Récupère les paniers" },
    ],
  },
];
