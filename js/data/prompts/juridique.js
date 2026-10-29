export default [
  {
    id: "jur-revue-contrat",
    metier: "juridique",
    categorie: "analyse",
    niveau: "Avancé",
    titre: "Revue de contrat : clauses à risque",
    resume: "Une première revue clause par clause, avec niveau de risque, rédaction proposée et priorités de négociation.",
    tags: ["contrat", "clauses", "négociation", "responsabilité", "revue"],
    prompt: `Tu es juriste d'affaires expérimenté. Tu fais une première revue de contrat pour identifier les risques et proposer des modifications, en vue d'une validation par un professionnel du droit.

## Contexte
- Type de contrat : {{type_contrat}}
- Partie représentée : {{partie}}
- Priorités : {{priorites}}
- Droit applicable présumé : {{pays}}
- Contrat (anonymisé) :
<contrat>
{{contrat}}
</contrat>

## Ta mission
1. Résume l'économie du contrat en 5 lignes : qui s'engage à quoi, pour combien, pour combien de temps.
2. Analyse les clauses dans cet ordre : objet et périmètre, prix et paiement, durée et résiliation, responsabilité et plafonds, garanties, propriété intellectuelle, confidentialité, données personnelles, exclusivité ou non-concurrence, force majeure, droit applicable et litiges.
3. Repère les clauses absentes qui devraient y figurer.

## Format de réponse
- Tableau : Clause (numéro et titre) | Risque pour la partie représentée | Niveau (élevé, moyen, faible) | Pourquoi | Modification proposée (rédaction).
- Les 5 points à négocier en priorité.
- Les clauses manquantes.
- Les questions à poser au client ou à l'autre partie.

## Règles
- Cite les clauses par leur numéro et reprends le texte exact quand tu t'y réfères.
- Ne cite un article de loi ou une décision que si tu es certain de sa référence, et marque-la [À VÉRIFIER]. N'invente jamais de jurisprudence.
- Signale les points qui dépendent d'un autre droit que celui indiqué.`,
    resultat: "Une revue clause par clause avec le niveau de risque, des propositions de rédaction et les priorités de négociation.",
    verifier: [
      "Toute référence légale ou jurisprudentielle est vérifiée sur Légifrance ou dans une base juridique.",
      "Le contrat est anonymisé avant d'être collé : secret professionnel et confidentialité s'appliquent.",
      "Un professionnel du droit relit et valide la revue avant tout envoi.",
    ],
    relance: "Rédige le mail à l'autre partie qui présente nos 5 demandes de modification : ferme sur le fond, courtois dans la forme.",
  },
  {
    id: "jur-fiche-arret",
    metier: "juridique",
    categorie: "analyse",
    niveau: "Essentiel",
    titre: "Fiche d'arrêt",
    resume: "Faits, procédure, prétentions, problème de droit, solution et portée, selon la méthode classique.",
    tags: ["fiche d'arrêt", "jurisprudence", "décision", "étudiant", "commentaire"],
    prompt: `Tu es enseignant en droit et praticien. Tu rédiges des fiches d'arrêt rigoureuses, selon la méthode classique.

## Contexte
- Usage de la fiche : {{usage_fiche}}
- Décision :
<decision>
{{decision}}
</decision>

## Ta mission
Rédige la fiche d'arrêt.

## Format de réponse
1. Références : juridiction, formation, date, numéro (tels qu'ils figurent dans le texte).
2. Faits : neutres et chronologiques, avec la qualification juridique des parties.
3. Procédure : les étapes précédentes et l'auteur du recours.
4. Prétentions des parties : les arguments de chacune.
5. Problème de droit : une question juridique générale, en une phrase.
6. Solution : rejet ou cassation, et motif déterminant, avec les passages clés cités.
7. Portée : ce que la décision apporte (confirmation, revirement, précision), en séparant ce qui est certain de ce qui est une interprétation.

## Règles
- Utilise uniquement le texte fourni : n'ajoute ni contexte ni doctrine que tu ne peux pas sourcer.
- Si le texte est incomplet (motifs ou dispositif manquants), dis-le.
- Ne qualifie pas la décision de « revirement » ou d'« arrêt de principe » sans indice dans le texte : présente-le comme une hypothèse à vérifier.`,
    resultat: "Une fiche d'arrêt complète selon la méthode classique : faits, procédure, prétentions, problème de droit, solution et portée.",
    verifier: [
      "Les références de la décision sont recopiées du texte, pas déduites.",
      "La portée est confrontée aux commentaires publiés et à la jurisprudence ultérieure.",
    ],
    relance: "À partir de cette fiche, propose un plan de commentaire d'arrêt en deux parties, avec deux sous-parties chacune.",
  },
  {
    id: "jur-mise-en-demeure",
    metier: "juridique",
    categorie: "redaction",
    niveau: "Essentiel",
    titre: "Mise en demeure",
    resume: "Une mise en demeure précise et ferme, sans menace disproportionnée, avec la liste des pièces à joindre.",
    tags: ["mise en demeure", "impayé", "litige", "courrier", "recouvrement"],
    prompt: `Tu es avocat. Tu rédiges des mises en demeure précises, fermes et sans menace disproportionnée.

## Contexte
- Expéditeur : {{expediteur}}
- Destinataire : {{destinataire}}
- Faits :
<faits>
{{faits_litige}}
</faits>
- Fondement : {{fondement}}
- Demande : {{demande}}
- Délai accordé : {{delai_md}}
- Droit applicable : {{pays}}

## Ta mission
Rédige la mise en demeure.

## Format de réponse
1. En-tête : expéditeur, destinataire, date, mode d'envoi recommandé, objet comportant les mots « Mise en demeure ».
2. Rappel des faits, daté et factuel.
3. Fondement de la demande.
4. Demande précise : quoi, combien, comment.
5. Délai, à compter de la réception.
6. Conséquences en cas d'inexécution, sans menace excessive.
7. Formule de conclusion et signature.

Puis la liste des pièces à joindre et les points à vérifier avant l'envoi.

## Règles
- Ton ferme, sans agressivité ni accusation non prouvée.
- Ne cite aucun article de loi dont tu n'es pas sûr : marque-le [À VÉRIFIER].
- Reprends les montants et les dates exactement comme fournis.`,
    resultat: "Une mise en demeure structurée, prête à relire, avec la liste des pièces à joindre.",
    verifier: [
      "Les montants, les dates et les références contractuelles sont exacts.",
      "Les références légales marquées [À VÉRIFIER] sont contrôlées.",
      "Le mode d'envoi (recommandé avec accusé de réception, commissaire de justice) est adapté aux suites envisagées.",
    ],
    relance: "Le destinataire conteste : [colle sa réponse]. Analyse ses arguments et propose la suite (relance, négociation ou action).",
  },
  {
    id: "jur-vulgarisation",
    metier: "juridique",
    categorie: "relation",
    niveau: "Essentiel",
    titre: "Expliquer un point de droit à un client",
    resume: "Ton analyse traduite en réponse claire : l'essentiel, les options comparées, ta recommandation.",
    tags: ["client", "vulgarisation", "conseil", "note", "pédagogie"],
    prompt: `Tu es avocat reconnu pour la clarté de ses explications. Tu traduis une analyse juridique en conseils compréhensibles, sans perdre en exactitude.

## Contexte
- Question du client : {{question_client}}
- Profil du client : {{profil_client}}
- Mon analyse :
<analyse>
{{analyse_juridique}}
</analyse>

## Ta mission
Rédige la réponse au client.

## Format de réponse
1. La réponse courte, en 2 phrases.
2. Ce que ça veut dire concrètement pour lui.
3. Les options : tableau Option | Avantages | Risques | Coût et délai indicatifs (si mon analyse les donne).
4. Ma recommandation et pourquoi.
5. Ce dont j'ai besoin de sa part (documents, décisions).
6. Les prochaines étapes et les échéances à ne pas manquer.

## Règles
- Chaque terme juridique est expliqué en une phrase.
- N'ajoute aucune règle de droit absente de mon analyse.
- Signale ce qui dépend des faits ou de l'appréciation d'un juge.`,
    resultat: "Une réponse claire au client : l'essentiel en 2 phrases, les options comparées, une recommandation et les prochaines étapes.",
    verifier: [
      "La simplification ne déforme pas ton analyse : relis chaque phrase en juriste.",
      "Les délais et échéances mentionnés sont exacts.",
    ],
    relance: "Transforme cette réponse en note d'une page à remettre au client, avec un encadré « À retenir ».",
  },
  {
    id: "jur-rgpd",
    metier: "juridique",
    categorie: "strategie",
    niveau: "Avancé",
    titre: "Fiche de registre RGPD d'un traitement",
    resume: "Finalités, bases légales, durées de conservation, écarts de conformité et plan d'action.",
    tags: ["rgpd", "registre", "données personnelles", "conformité", "cnil"],
    prompt: `Tu es délégué à la protection des données. Tu aides à documenter un traitement de données personnelles de façon conforme et réaliste.

## Contexte
- Organisme : {{activite}}
- Traitement : {{traitement}}
- Fonctionnement :
<description>
{{description_traitement}}
</description>
- Outils et prestataires : {{outils_prestataires}}

## Ta mission
1. Remplis la fiche de registre du traitement.
2. Repère les écarts de conformité et propose des actions.

## Format de réponse
**Fiche de registre**
- Finalités, une par ligne
- Base légale de chaque finalité (consentement, contrat, obligation légale, intérêt légitime…), avec la justification
- Catégories de personnes concernées
- Catégories de données (en signalant les données sensibles)
- Destinataires internes et externes, sous-traitants
- Transferts hors de l'Union européenne et garanties
- Durées de conservation par catégorie de données
- Mesures de sécurité

**Écarts et actions** : tableau Écart | Risque | Action | Priorité.

**Questions à éclaircir** avec les équipes concernées.

## Règles
- N'affirme pas qu'un traitement est conforme : indique ce qui doit être vérifié.
- Signale si une analyse d'impact (AIPD) semble nécessaire, et pourquoi.
- Ne cite un article du RGPD ou une recommandation de la CNIL que si tu es sûr de la référence ; sinon, marque [À VÉRIFIER].`,
    resultat: "Une fiche de registre complète pour le traitement, les écarts de conformité et un plan d'action priorisé.",
    verifier: [
      "Les durées de conservation sont confrontées aux référentiels de la CNIL et aux obligations légales du secteur.",
      "Les contrats avec les sous-traitants contiennent les clauses exigées par le RGPD.",
      "Ton DPO ou ton conseil valide la fiche.",
    ],
    relance: "Rédige la mention d'information destinée aux personnes concernées par ce traitement, claire et complète.",
  },
  {
    id: "jur-argumentation",
    metier: "juridique",
    categorie: "strategie",
    niveau: "Avancé",
    titre: "Construire une argumentation et anticiper l'adversaire",
    resume: "Plan d'argumentation relié aux pièces, meilleurs arguments adverses et faiblesses du dossier.",
    tags: ["contentieux", "plaidoirie", "conclusions", "stratégie", "preuves"],
    prompt: `Tu es avocat plaidant. Tu construis une argumentation solide en commençant par identifier ses faiblesses.

## Contexte
- Position à défendre : {{position}}
- Droit applicable : {{pays}}
- Faits :
<faits>
{{faits_litige}}
</faits>
- Pièces disponibles :
<pieces>
{{pieces}}
</pieces>
- Arguments adverses connus : {{arguments_adverses}}

## Ta mission
1. Identifie les questions juridiques à trancher.
2. Construis l'argumentation, en partant de l'argument le plus solide.
3. Joue l'avocat de la partie adverse : ses meilleurs arguments et ses angles d'attaque sur nos faiblesses.
4. Prépare les réponses.

## Format de réponse
- Les questions juridiques à trancher.
- Le plan de l'argumentation : arguments principaux et subsidiaires, chacun relié à des faits et à des pièces.
- Tableau : Argument adverse | Force (élevée, moyenne, faible) | Notre réponse | Pièce à l'appui.
- Les faiblesses du dossier, dites franchement, et comment les traiter.
- Les éléments de preuve à obtenir.

## Règles
- N'invente aucune jurisprudence ni aucun article : si une source est nécessaire, décris ce qu'il faut chercher et marque [RECHERCHE À FAIRE].
- Distingue les faits prouvés par une pièce des faits simplement allégués.`,
    resultat: "Une argumentation structurée, les meilleurs arguments adverses avec leurs réponses, et les faiblesses du dossier à traiter.",
    verifier: [
      "Chaque source juridique est recherchée et vérifiée dans une base officielle.",
      "Chaque fait invoqué est rattaché à une pièce.",
      "Les données du dossier sont anonymisées avant d'être collées.",
    ],
    relance: "Rédige l'introduction et le premier argument des conclusions à partir de ce plan.",
  },
];
