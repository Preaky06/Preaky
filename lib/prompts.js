// Prompts et schéma de sortie structurée pour l'analyse de documents.

export const LANGUAGES = {
  fr: "français",
  en: "anglais",
  es: "espagnol",
  pt: "portugais",
  it: "italien",
  de: "allemand",
  ar: "arabe",
  tr: "turc",
  ro: "roumain",
  pl: "polonais",
  uk: "ukrainien",
  ru: "russe",
  zh: "chinois simplifié",
  vi: "vietnamien",
  wo: "wolof",
};

const str = (description) => ({ type: "string", description });
const obj = (properties) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const arr = (items, description) => ({ type: "array", items, description });

export const ANALYSIS_SCHEMA = obj({
  title: str("Titre court et concret du document, 3 à 7 mots (ex. « Avis d'impôt sur le revenu 2025 »)."),
  document_type: str("Catégorie : impôts, énergie, logement, santé, banque, assurance, travail, amende, justice, famille, administration, contrat, autre."),
  issuer: str("Organisme ou personne qui envoie le document. Chaîne vide si inconnu."),
  document_date: str("Date d'émission au format AAAA-MM-JJ, ou chaîne vide."),
  plain_summary: str("Une à deux phrases qui disent ce que le document signifie POUR LA PERSONNE, en langage de tous les jours. Pas de jargon."),
  urgency: { type: "string", enum: ["none", "low", "medium", "high"], description: "none = rien à faire ; low = à lire/archiver ; medium = action à prévoir ; high = action rapide nécessaire ou conséquence financière/juridique importante." },
  urgency_reason: str("Pourquoi ce niveau d'urgence, en une phrase."),
  key_points: arr(str("Point clé, une phrase simple."), "3 à 6 points essentiels à retenir."),
  actions: arr(
    obj({
      task: str("Action concrète à l'impératif (ex. « Payez 245 € avant le 15 octobre »)."),
      detail: str("Comment faire, où cliquer, quel document fournir. Chaîne vide si évident."),
      deadline: str("Date limite AAAA-MM-JJ ou chaîne vide."),
      priority: { type: "string", enum: ["high", "medium", "low"] },
    }),
    "Actions ordonnées. Tableau vide si rien à faire.",
  ),
  deadlines: arr(
    obj({
      date: str("AAAA-MM-JJ"),
      label: str("Ce qui se passe à cette date."),
      consequence: str("Ce qui arrive si on rate la date. Chaîne vide si rien."),
    }),
    "Toutes les dates importantes, triées chronologiquement.",
  ),
  amounts: arr(
    obj({
      label: str("Nature du montant."),
      amount: { type: "number", description: "Valeur numérique, point décimal." },
      currency: str("Code ISO 4217, ex. EUR."),
      direction: { type: "string", enum: ["to_pay", "to_receive", "info"] },
    }),
    "Montants significatifs uniquement (pas de doublons, pas de sous-totaux inutiles).",
  ),
  warnings: arr(str("Piège, clause sensible, frais cachés, erreur probable ou point à vérifier."), "Points d'attention."),
  rights: arr(str("Droit, recours, aide ou option dont la personne dispose (contestation, échéancier, aide sociale…)."), "Options et recours."),
  glossary: arr(obj({ term: str("Terme technique tel qu'il apparaît."), definition: str("Définition en une phrase simple.") }), "Jargon présent dans le document, 0 à 8 termes."),
  contacts: arr(
    obj({
      kind: { type: "string", enum: ["phone", "email", "address", "website", "reference", "other"] },
      label: str("À quoi sert ce contact ou cette référence."),
      value: str("Valeur exacte telle qu'écrite (numéro, adresse, n° de dossier…)."),
    }),
    "Coordonnées et numéros de référence utiles figurant dans le document.",
  ),
  reply_draft: obj({
    needed: { type: "boolean", description: "true si une réponse écrite (courrier/e-mail) serait utile à la personne." },
    subject: str("Objet du courrier."),
    body: str("Courrier complet, prêt à envoyer, avec [crochets] pour les infos à compléter. Rédigé dans la langue du document d'origine (c'est l'organisme qui le lira). Chaîne vide si non nécessaire."),
  }),
  suggested_questions: arr(str("Question qu'un non-spécialiste se poserait probablement ensuite."), "3 questions de suivi pertinentes."),
  readability: { type: "string", enum: ["good", "partial", "poor"], description: "Qualité de lecture du document fourni." },
  professional_advice: str("Si la situation justifie un professionnel (avocat, conseiller, médecin, assistante sociale…), dire lequel et pourquoi. Sinon chaîne vide."),
});

export const ANALYSIS_SYSTEM = `Tu es Limpide, un expert bienveillant qui traduit les documents administratifs, juridiques, financiers et médicaux en langage clair pour des personnes non spécialistes.

Principes :
- Parle directement à la personne (« vous »). Phrases courtes. Aucun jargon non expliqué.
- Sois exact : ne reporte que des montants, dates et références réellement présents dans le document. Si une information est illisible ou absente, laisse le champ vide plutôt que de deviner, et signale-le dans "warnings".
- Calcule les échéances relatives (« sous 30 jours ») en dates absolues à partir de la date du document ; à défaut, à partir de la date du jour, en le précisant.
- Priorise : ce qui coûte de l'argent, ce qui a une date limite, ce qui a une conséquence juridique.
- Mentionne les recours et aides réellement applicables au pays du document (France par défaut si indéterminable).
- Pour les résultats médicaux, explique sans diagnostiquer et invite à en parler au médecin quand c'est pertinent.
- Si le contenu n'est pas un document (photo quelconque, texte sans rapport), remplis le schéma en l'expliquant dans plain_summary avec urgency "none".
- Rédige toutes les explications dans la langue demandée, sauf reply_draft.body qui suit la langue du document d'origine.`;

export const CHAT_SYSTEM = `Tu es Limpide, un assistant qui aide une personne à comprendre un document qu'elle a reçu et à savoir quoi faire.
Réponds de façon directe, concrète et brève (5 à 10 lignes maximum sauf si on te demande un courrier). Utilise des listes courtes quand c'est utile. Appuie-toi sur le document ; si la réponse n'y figure pas, dis-le et donne la démarche générale applicable.
Pas de mise en forme lourde : du texte simple, des tirets pour les listes, **gras** pour l'essentiel uniquement.
Tu n'es pas avocat ni médecin : pour une décision engageante, recommande le bon professionnel en une phrase.`;
