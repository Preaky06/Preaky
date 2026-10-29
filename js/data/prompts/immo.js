export default [
  {
    id: "immo-annonce",
    metier: "immo",
    categorie: "redaction",
    niveau: "Essentiel",
    titre: "Annonce immobilière qui donne envie de visiter",
    resume: "Trois titres, une visite écrite pièce par pièce, le bloc des mentions obligatoires et une version courte.",
    tags: ["annonce", "description", "portail", "dpe", "mandat"],
    prompt: `Tu es agent immobilier expérimenté et rédacteur d'annonces. Tes annonces décrivent le bien honnêtement et donnent envie de visiter aux bons acheteurs.

## Contexte
- Bien :
<bien>
{{bien}}
</bien>
- Quartier : {{quartier}}
- Prix et honoraires : {{prix_bien}}
- Performance énergétique : {{dpe}}
- Acquéreurs visés : {{cible}}

## Ta mission
Rédige l'annonce.

## Format de réponse
1. 3 titres (60 caractères maximum), chacun centré sur un atout différent.
2. Accroche (2 phrases) : la vie qu'on mène dans ce bien, pour les acquéreurs visés.
3. Description : un parcours de visite logique, pièce par pièce, avec les surfaces et les atouts concrets.
4. Environnement : distances et services, uniquement d'après les informations fournies.
5. Informations pratiques : charges, taxe foncière, copropriété, si fournies.
6. Bloc des mentions obligatoires, avec [À COMPLÉTER] pour chaque information manquante.
7. Une version courte (500 caractères) pour les portails et les réseaux sociaux.

## Règles
- Aucun superlatif vide (« rare », « coup de cœur assuré », « exceptionnel ») sans fait qui le justifie.
- N'invente aucune caractéristique, distance ou surface.
- Ne cache pas les défauts importants : formule-les honnêtement (« travaux de rafraîchissement à prévoir »).`,
    resultat: "Une annonce complète avec 3 titres, une description structurée, le bloc des mentions obligatoires et une version courte.",
    verifier: [
      "En France, l'annonce doit afficher les classes énergie et climat du DPE, l'estimation des dépenses énergétiques annuelles, le prix et la part des honoraires à la charge de l'acquéreur, et pour une copropriété le nombre de lots, les charges annuelles et les procédures en cours.",
      "Les surfaces citées correspondent aux diagnostics.",
      "Les distances et services du quartier sont exacts.",
    ],
    relance: "Écris le texte d'une vidéo de visite de 45 secondes pour ce bien, plan par plan.",
  },
  {
    id: "immo-avis-valeur",
    metier: "immo",
    categorie: "strategie",
    niveau: "Avancé",
    titre: "Argumenter un avis de valeur face au vendeur",
    resume: "Comparables ajustés, fourchette justifiée et discours pour aligner le vendeur sur le bon prix.",
    tags: ["estimation", "avis de valeur", "comparables", "prix", "vendeur"],
    prompt: `Tu es agent immobilier expert en estimation. Tu aides le vendeur à fixer le bon prix avec des faits, sans le braquer.

## Contexte
- Bien :
<bien>
{{bien}}
</bien>
- Comparables :
<comparables>
{{comparables}}
</comparables>
- Prix souhaité par le vendeur : {{prix_vendeur}}
- Mon estimation : {{estimation}}

## Ta mission
1. Analyse les comparables : prix au m², différences de caractéristiques, ajustements justifiés (étage, extérieur, état, DPE).
2. Construis l'argumentaire de l'avis de valeur.
3. Prépare l'échange avec le vendeur si son prix dépasse l'estimation.

## Format de réponse
- Tableau des comparables : Bien | Surface | Prix | Prix au m² | Différences avec le bien estimé | Ajustement proposé.
- La fourchette qui en ressort, avec le calcul.
- Les points forts et les points faibles du bien, du point de vue d'un acheteur.
- Le discours au vendeur en 5 étapes : écouter ses attentes, montrer le marché, comparer, expliquer les risques d'un prix trop haut (bien qui stagne, négociation plus dure), proposer une stratégie de prix et un point d'étape daté.
- Les réponses à : « Une autre agence m'en donne plus », « J'ai fait des travaux », « Je ne suis pas pressé ».

## Règles
- Appuie-toi uniquement sur les comparables fournis : n'invente aucun prix de marché.
- Distingue les prix de vente constatés des prix affichés en annonce.
- Signale si les comparables sont trop peu nombreux ou trop différents pour conclure.`,
    resultat: "Une analyse des comparables avec leurs ajustements, une fourchette justifiée et le discours pour en parler au vendeur.",
    verifier: [
      "Les prix de vente proviennent de sources fiables (base DVF, notaires, ventes de l'agence).",
      "Les calculs de prix au m² sont justes.",
      "Ton avis de valeur respecte la forme imposée par ton réseau.",
    ],
    relance: "Rédige l'avis de valeur écrit d'une page à remettre au vendeur.",
  },
  {
    id: "immo-prospection",
    metier: "immo",
    categorie: "relation",
    niveau: "Essentiel",
    titre: "Script d'appel à un vendeur particulier",
    resume: "Ouverture, questions, apport de valeur, réponses aux refus, message vocal et SMS de suivi.",
    tags: ["prospection", "pige", "téléphone", "script", "vendeur"],
    prompt: `Tu es agent immobilier performant en prospection téléphonique. Ton approche est respectueuse : tu apportes une information utile avant de demander quoi que ce soit.

## Contexte
- Agence : {{activite}}
- Secteur : {{zone}}
- Situation : {{situation_appel}}
- Mon atout réel : {{atout}}

## Ta mission
Écris le script d'appel.

## Format de réponse
1. Ouverture (15 secondes) : qui je suis, pourquoi j'appelle cette personne, une question pour obtenir la permission de continuer.
2. 5 questions de découverte : projet, délai, raison de la vente, retours obtenus, critères de choix d'un professionnel.
3. L'apport de valeur : une information concrète sur le marché local, tirée de mon atout.
4. La proposition : un rendez-vous d'estimation ou un point dans 15 jours, avec 2 créneaux.
5. Les réponses à : « Je vends seul », « Pas d'agence », « Vos honoraires sont trop chers », « Rappelez-moi plus tard ».
6. Une version message vocal (25 secondes) et un SMS de suivi.

## Règles
- Ton naturel, phrases courtes, écrites pour l'oral.
- Aucune fausse promesse : pas de « J'ai un acheteur pour votre bien » si ce n'est pas vrai.
- Respecte un refus clair et termine poliment.`,
    resultat: "Un script d'appel complet avec questions, réponses aux refus, message vocal et SMS de suivi.",
    verifier: [
      "Les règles du démarchage téléphonique s'appliquent (en France : liste d'opposition Bloctel, jours et horaires autorisés).",
      "Chaque information de marché citée est exacte et vérifiable.",
    ],
    relance: "Joue un vendeur particulier méfiant qui veut vendre seul. Je fais l'appel, puis tu me dis ce qui a marché et ce qui a bloqué.",
  },
  {
    id: "immo-compte-rendu-visite",
    metier: "immo",
    categorie: "relation",
    niveau: "Essentiel",
    titre: "Compte-rendu de visites au vendeur",
    resume: "Retours regroupés par thème, ce qui se corrige et ce qui ne se corrige pas, recommandations.",
    tags: ["visites", "compte-rendu", "vendeur", "retours acheteurs", "baisse de prix"],
    prompt: `Tu es agent immobilier. Tu tiens ton vendeur informé avec des comptes-rendus factuels qui préparent, si nécessaire, une discussion sur le prix ou la présentation du bien.

## Contexte
- Bien : {{bien}}
- Prix affiché : {{prix_bien}}
- Nombre de visites et période : {{nb_visites}}
- Retours des visiteurs :
<retours>
{{retours_visites}}
</retours>

## Ta mission
Rédige le compte-rendu au vendeur.

## Format de réponse
1. Synthèse en 3 lignes : activité, tendance des retours, recommandation.
2. Les retours regroupés par thème (prix, état, agencement, luminosité, environnement…) avec leur fréquence.
3. Ce qui plaît, avec des citations courtes.
4. Ce qui freine, en séparant ce qui se corrige (rangement, petits travaux, photos) de ce qui ne se corrige pas.
5. 2 ou 3 recommandations concrètes, dont une sur le prix si les retours le justifient.
6. La prochaine étape et la date du prochain point.

## Règles
- Factuel et bienveillant : le vendeur est attaché à son bien.
- N'exagère ni les retours positifs ni les négatifs.
- Ne cite aucune donnée personnelle des visiteurs.`,
    resultat: "Un compte-rendu de visites structuré par thème, avec des recommandations concrètes au vendeur.",
    verifier: [
      "Les retours rapportés sont fidèles à tes notes.",
      "La recommandation sur le prix s'appuie sur des faits (nombre de visites, offres reçues, comparables).",
    ],
    relance: "Prépare l'appel au vendeur pour proposer une baisse de prix de [X] %, avec ses objections probables et mes réponses.",
  },
  {
    id: "immo-contenu-local",
    metier: "immo",
    categorie: "creation",
    niveau: "Essentiel",
    titre: "Contenus locaux pour les réseaux",
    resume: "Un mois de publications qui font de toi la référence du secteur, sans annonces à répétition.",
    tags: ["réseaux sociaux", "contenu local", "quartier", "newsletter", "notoriété"],
    prompt: `Tu es agent immobilier et créateur de contenu local. Tu deviens la référence de ton secteur en publiant des informations utiles, pas des annonces à répétition.

## Contexte
- Agence : {{activite}}
- Secteur : {{zone}}
- Ce que je connais du secteur :
<secteur>
{{connaissance_zone}}
</secteur>
- Réseaux : {{reseaux}}

## Ta mission
Propose un mois de contenus locaux : 8 publications.

## Méthode
Varie les angles :
- Vie de quartier (adresses, événements, portraits de commerçants)
- Marché local expliqué simplement (à partir de mes données uniquement)
- Conseils aux vendeurs et aux acheteurs
- Coulisses du métier
- Un bien vendu raconté comme une histoire (avec l'accord des clients)

## Format de réponse
Pour chaque publication : angle, format (carrousel, vidéo courte, photo, story), accroche, texte complet, appel à l'action discret.
Puis une idée de newsletter mensuelle pour les propriétaires du secteur.

## Règles
- N'invente aucune adresse, aucun commerce, aucun chiffre : utilise ce que je fournis, sinon écris [À COMPLÉTER].
- 2 publications sur 8 au maximum parlent de l'agence elle-même.`,
    resultat: "8 publications locales prêtes à adapter et une idée de newsletter pour les propriétaires du secteur.",
    verifier: [
      "Les commerces et lieux cités existent et acceptent d'être mentionnés.",
      "Les clients ont donné leur accord pour l'histoire d'un bien vendu.",
      "Les chiffres du marché viennent de tes données.",
    ],
    relance: "Écris le script de la vidéo « 3 choses à savoir avant d'acheter dans [quartier] », en 40 secondes.",
  },
  {
    id: "immo-objections-mandat",
    metier: "immo",
    categorie: "relation",
    niveau: "Avancé",
    titre: "Défendre un mandat exclusif et tes honoraires",
    resume: "Les 5 objections de vendeur les plus courantes, ce qu'elles cachent et comment y répondre.",
    tags: ["mandat exclusif", "honoraires", "objections", "vendeur", "négociation"],
    prompt: `Tu es agent immobilier expérimenté et formateur en négociation. Tu défends la valeur de ton travail sans dénigrer la concurrence.

## Contexte
- Agence : {{activite}}
- Mes services concrets : {{services}}
- Honoraires : {{honoraires}}
- Résultats vérifiables : {{resultats}}

## Ta mission
Prépare les réponses à ces objections :
1. « Je préfère un mandat simple, avec plusieurs agences. »
2. « Vos honoraires sont trop élevés. »
3. « Je peux vendre seul sur Internet. »
4. « Une autre agence prend moins. »
5. « Je veux d'abord essayer à mon prix. »

## Format de réponse
Pour chaque objection :
- Ce que le vendeur craint vraiment
- La question à poser avant de répondre
- La réponse, appuyée sur mes services et mes résultats
- Une preuve à montrer (document, chiffre, exemple)

Termine par une présentation de ma méthode de vente en 2 minutes, à dire au rendez-vous.

## Règles
- Aucun chiffre que je n'ai pas fourni.
- Aucune critique des autres agences, aucune pression.`,
    resultat: "Des réponses argumentées aux 5 objections les plus courantes et une présentation de ta méthode en 2 minutes.",
    verifier: [
      "Les résultats cités sont vérifiables dans ton historique.",
      "Les conditions du mandat exclusif (durée, résiliation) sont présentées conformément à la loi et à ton contrat.",
    ],
    relance: "Joue un vendeur qui hésite entre deux agences. Je présente ma méthode, puis tu me dis ce qui t'aurait convaincu ou non.",
  },
];
