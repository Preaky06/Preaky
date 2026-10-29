export default [
  {
    id: "ecom-fiche-produit",
    metier: "ecommerce",
    categorie: "redaction",
    niveau: "Essentiel",
    titre: "Fiche produit qui vend et se référence",
    resume: "Titre, bénéfices, description, FAQ, balises SEO et textes alternatifs, sans caractéristique inventée.",
    tags: ["fiche produit", "seo", "description", "meta description", "boutique"],
    prompt: `Tu es rédacteur e-commerce et spécialiste du référencement naturel. Tu écris des fiches produit qui répondent aux questions de l'acheteur et se positionnent sur Google.

## Contexte
- Produit :
<produit>
{{produit}}
</produit>
- Cible : {{cible}}
- Ton de la marque : {{ton}}
- Requête principale : {{mot_cle}}
- Ce que disent les clients : {{avis_resume}}

## Ta mission
Rédige la fiche produit.

## Format de réponse
1. Titre produit (70 caractères maximum), avec la requête principale formulée naturellement.
2. Accroche (2 phrases) : le bénéfice principal pour la cible.
3. 5 bénéfices en puces, chacun relié à une caractéristique (« Grâce à…, vous… »).
4. Description détaillée (150 à 250 mots) : usages, situations, ce qui différencie le produit.
5. Caractéristiques techniques en tableau.
6. FAQ : 4 questions que posent réellement les acheteurs, avec les réponses.
7. Balise title (60 caractères maximum) et meta description (155 caractères maximum).
8. Texte alternatif pour 3 photos.

## Règles
- N'invente aucune caractéristique, certification, origine ou performance. Si une information utile manque, écris [À COMPLÉTER].
- Pas de bourrage de mots-clés : la requête apparaît dans le titre, l'accroche et une fois dans la description.
- Aucune allégation de santé, environnementale (« écologique », « durable ») ou de performance sans preuve fournie.`,
    resultat: "Une fiche produit complète : titre, bénéfices, description, caractéristiques, FAQ, balises SEO et textes alternatifs.",
    verifier: [
      "Toutes les caractéristiques sont exactes et vérifiables sur le produit.",
      "Les allégations environnementales sont strictement encadrées en France et dans l'Union européenne : supprime celles que tu ne peux pas prouver.",
      "Les longueurs du titre et de la meta description sont respectées.",
    ],
    relance: "Écris 3 variantes du titre et de l'accroche pour un test A/B, chacune centrée sur un motif d'achat différent.",
  },
  {
    id: "ecom-sav",
    metier: "ecommerce",
    categorie: "relation",
    niveau: "Essentiel",
    titre: "Réponse au service client",
    resume: "Diagnostic du cas, réponse prête à envoyer et actions internes, dans le respect des droits du consommateur.",
    tags: ["sav", "service client", "retour", "remboursement", "livraison"],
    prompt: `Tu es responsable du service client d'une boutique en ligne. Tu règles les problèmes vite et avec empathie, en respectant la politique de la boutique et les droits du consommateur.

## Contexte
- Boutique : {{activite}}
- Ton de la marque : {{ton}}
- Pays : {{pays}}
- Message du client :
<message>
{{message_client}}
</message>
- Ce que je sais de la commande :
<situation>
{{situation_commande}}
</situation>

## Ta mission
1. Identifie la demande réelle et l'émotion du client.
2. Classe le cas : retard, produit défectueux, erreur de commande, retour ou rétractation, remboursement, autre.
3. Rédige la réponse.

## Format de réponse
- Diagnostic en 2 lignes.
- La réponse au client (150 mots maximum) : reconnaître le problème, expliquer ce qui se passe, donner la solution et le délai, indiquer la prochaine étape.
- Les actions internes à mener (qui, quand).
- Si le cas sort de la politique habituelle : 2 gestes commerciaux possibles, avec leur coût, à faire valider.

## Règles
- N'invente aucun statut de commande ni aucun délai : utilise la situation fournie, sinon pose la question au client.
- Ne refuse jamais un droit légal du consommateur (rétractation, garantie de conformité) ; en cas de doute sur un délai ou une règle, marque [À VÉRIFIER].
- Aucune formule toute faite : la réponse montre qu'on a lu le message.`,
    resultat: "Un diagnostic du cas, une réponse client prête à envoyer et les actions internes à lancer.",
    verifier: [
      "Pour une vente en ligne en France, le consommateur dispose en général de 14 jours pour se rétracter et d'une garantie légale de conformité de 2 ans : ta réponse ne doit pas les restreindre.",
      "Le statut de commande et les délais annoncés sont vérifiés dans ton back-office.",
    ],
    relance: "Crée 8 réponses types pour les demandes les plus fréquentes de ma boutique, avec les champs à personnaliser.",
  },
  {
    id: "ecom-avis",
    metier: "ecommerce",
    categorie: "analyse",
    niveau: "Avancé",
    titre: "Analyser les avis clients",
    resume: "Thèmes, irritants prioritaires et formulations de clients à réutiliser dans tes fiches et tes publicités.",
    tags: ["avis clients", "verbatims", "voix du client", "irritants", "analyse"],
    prompt: `Tu es analyste de l'expérience client. Tu transformes des avis bruts en priorités d'amélioration et en arguments de vente.

## Contexte
- Produit ou boutique : {{produit_ou_boutique}}
- Objectif : {{objectif_analyse}}
- Avis :
<avis>
{{avis}}
</avis>

## Ta mission
1. Compte les avis analysés et donne la répartition des notes si elles sont présentes.
2. Regroupe les avis par thème (qualité, taille, livraison, emballage, service client, prix, usage…) avec leur fréquence et leur tonalité.
3. Identifie les irritants à corriger en priorité (fréquence × gravité).
4. Repère les bénéfices que les clients citent spontanément, avec leurs mots.

## Format de réponse
- Tableau : Thème | Nombre d'avis | Positif ou négatif | Citation représentative.
- Les 3 irritants prioritaires, chacun avec une action corrective et le service concerné.
- Les 5 bénéfices les plus cités, avec les formulations des clients à réutiliser dans la fiche produit et les publicités.
- Les questions récurrentes à ajouter à la FAQ.
- 3 réponses publiques à des avis négatifs représentatifs.

## Règles
- Cite les avis mot pour mot, sans les modifier.
- Ne généralise pas à partir d'un seul avis : indique toujours le nombre.
- Si l'échantillon est faible (moins de 20 avis), dis-le.`,
    resultat: "Une cartographie des avis par thème, les irritants à corriger en priorité et les formulations de clients à réutiliser.",
    verifier: [
      "Compte toi-même les avis collés : sur un long extrait, l'IA peut en oublier.",
      "Les citations réutilisées en publicité sont authentiques et anonymes.",
    ],
    relance: "Réécris la fiche produit en intégrant les 5 bénéfices cités par les clients et en répondant aux 3 irritants dans la FAQ.",
  },
  {
    id: "ecom-panier",
    metier: "ecommerce",
    categorie: "redaction",
    niveau: "Essentiel",
    titre: "Séquence d'emails de panier abandonné",
    resume: "Trois emails qui lèvent les freins à l'achat au lieu d'empiler les promotions, avec objets à tester.",
    tags: ["panier abandonné", "emailing", "relance", "conversion", "automation"],
    prompt: `Tu es spécialiste de l'emailing e-commerce. Tu écris des relances de panier abandonné qui lèvent les freins plutôt que d'empiler les promotions.

## Contexte
- Boutique : {{activite}}
- Ton : {{ton}}
- Produits concernés : {{produits_panier}}
- Freins connus : {{freins}}
- Incitation possible : {{offre}}

## Ta mission
Écris une séquence de 3 emails.

## Méthode
- Email 1 (1 à 4 heures après l'abandon) : rappel simple et service (le panier, une aide si besoin), sans promotion.
- Email 2 (24 heures après) : lever le frein principal (avis clients, garantie, retours, guide des tailles, livraison).
- Email 3 (48 à 72 heures après) : dernier rappel, avec l'incitation seulement si elle est prévue.

## Format de réponse
Pour chaque email : délai, objet (40 caractères maximum) et 2 variantes, texte de prévisualisation, corps (100 mots maximum), bouton d'action, visuel conseillé.
Puis les indicateurs à suivre et le premier test A/B à lancer.

## Règles
- Aucune fausse urgence, aucun faux stock limité.
- Les avis, garanties et délais cités doivent être ceux fournis ; sinon, écris [À COMPLÉTER].`,
    resultat: "Une séquence de 3 emails avec objets à tester, délais d'envoi et indicateurs à suivre.",
    verifier: [
      "Tes relances reposent sur une base légale valable (client existant ou consentement) et contiennent un lien de désinscription.",
      "Les garanties et délais de livraison cités sont exacts.",
      "Le code promo éventuel est actif et limité comme prévu.",
    ],
    relance: "Adapte cette séquence pour les paniers de plus de [montant] €, avec un ton plus premium et un contact humain proposé.",
  },
  {
    id: "ecom-seo-categories",
    metier: "ecommerce",
    categorie: "strategie",
    niveau: "Avancé",
    titre: "Plan de contenu SEO pour la boutique",
    resume: "Intentions de recherche, pages catégories, articles de guide reliés et calendrier sur 3 mois.",
    tags: ["seo", "référencement", "catégories", "cocon sémantique", "contenu"],
    prompt: `Tu es consultant SEO e-commerce. Tu construis des plans de contenu qui attirent des visiteurs prêts à acheter, pas seulement du trafic.

## Contexte
- Boutique : {{activite}}
- Catégories : {{categories}}
- Cible : {{cible}}
- Concurrents : {{concurrents}}

## Ta mission
1. Pour chaque catégorie, liste les intentions de recherche probables : achat (« acheter », « prix »), comparaison (« meilleur », « ou »), information (« comment », « pourquoi »).
2. Organise-les en cocons : une page catégorie (intention d'achat) reliée à des articles de guide (intention d'information).
3. Priorise.

## Format de réponse
- Tableau : Catégorie | Requête visée | Intention | Type de page | Titre proposé | Pages à relier.
- Pour chaque page catégorie : une introduction de 80 mots et les 3 questions à traiter en bas de page.
- Les 10 articles de guide prioritaires, avec leur plan en 4 à 6 intertitres.
- Un calendrier de publication sur 3 mois.

## Règles
- Tu n'as pas accès aux volumes de recherche : présente les requêtes comme des hypothèses à valider dans un outil SEO (Google Search Console, Google Keyword Planner…).
- Deux pages ne visent jamais la même requête.`,
    resultat: "Une architecture de contenu SEO par catégorie, des textes d'introduction, 10 plans d'articles et un calendrier sur 3 mois.",
    verifier: [
      "Les requêtes et leurs volumes sont validés dans un outil SEO avant rédaction.",
      "Les pages proposées n'entrent pas en concurrence avec des pages existantes de ton site.",
    ],
    relance: "Rédige l'article de guide n°1 en entier (1 200 mots), avec les liens internes vers les pages catégories.",
  },
  {
    id: "ecom-pubs",
    metier: "ecommerce",
    categorie: "creation",
    niveau: "Essentiel",
    titre: "Angles et variantes de publicités",
    resume: "Cinq angles de vente, accroches et concepts visuels, plus un plan de test adapté à ton budget.",
    tags: ["publicité", "meta ads", "tiktok ads", "créa", "test a/b"],
    prompt: `Tu es media buyer et concepteur-rédacteur publicitaire. Tu sais que l'angle compte plus que la formulation, et tu testes méthodiquement.

## Contexte
- Produit : {{produit}}
- Cible : {{cible}}
- Bénéfices et preuves : {{benefices}}
- Plateforme : {{plateforme}}
- Budget de test : {{budget_test}}

## Ta mission
1. Propose 5 angles de vente différents : problème, désir, preuve sociale, comparaison, objection levée.
2. Pour chaque angle, écris les publicités.
3. Propose un plan de test adapté au budget.

## Format de réponse
Pour chaque angle :
- La motivation d'achat visée, en une phrase
- 3 accroches (125 caractères maximum, pour rester visibles avant « Voir plus »)
- 1 titre (40 caractères maximum)
- Le concept visuel ou vidéo, avec les 3 premières secondes décrites
- L'appel à l'action

Puis le plan de test (angles à tester d'abord, nombre de variantes, durée, indicateur de décision) et les critères pour couper ou augmenter une publicité.

## Règles
- Aucune promesse que le produit ne tient pas, aucun avant/après trompeur, aucune fausse urgence.
- Respecte les règles publicitaires de la plateforme : pas d'interpellation sur des caractéristiques personnelles (« Vous êtes en surpoids ? »).
- N'invente aucun avis ni aucun chiffre.`,
    resultat: "5 angles publicitaires avec accroches, titres et concepts visuels, et un plan de test adapté à ton budget.",
    verifier: [
      "Les publicités respectent la politique publicitaire de la plateforme (catégories sensibles, allégations).",
      "Les preuves citées (avis, chiffres) sont réelles et vérifiables.",
      "Les longueurs de texte conviennent aux emplacements choisis.",
    ],
    relance: "Voici les résultats après 7 jours : [colle les chiffres par publicité]. Dis-moi quoi couper, quoi garder et quelles variantes lancer.",
  },
];
