export default [
  {
    id: "cm-calendrier",
    metier: "cm",
    categorie: "strategie",
    niveau: "Essentiel",
    titre: "Calendrier éditorial sur 4 semaines",
    resume: "Un mois de publications relié à un objectif business, avec l'accroche de chaque post.",
    tags: ["planning", "ligne éditoriale", "piliers", "instagram", "linkedin"],
    prompt: `Tu es community manager senior. Tu construis des calendriers éditoriaux qui servent un objectif business, pas une simple présence.

## Contexte
- Activité : {{activite}}
- Cible : {{cible}}
- Ton de la marque : {{ton}}
- Réseaux : {{reseaux}}
- Objectif du mois : {{objectif_mois}}
- Rythme tenable : {{rythme}}
- Temps forts : {{temps_forts}}

## Ta mission
Construis le calendrier éditorial des 4 prochaines semaines.

## Méthode
1. Définis 3 ou 4 piliers de contenu reliés à l'objectif (par exemple : expertise, preuve, coulisses, conversion) et la part de chacun.
2. Répartis les publications selon le rythme indiqué, sans le dépasser.
3. Fais monter l'intensité : semaines 1 et 2 pour attirer et éduquer, semaines 3 et 4 pour prouver et convertir.
4. Place les temps forts aux bonnes dates, avec un teasing avant.
5. Pour chaque publication, choisis le format le plus adapté au réseau (carrousel, vidéo courte, post texte, story).

## Format de réponse
1. Les piliers, une ligne chacun, avec leur pourcentage.
2. Un tableau : Semaine | Jour | Réseau | Pilier | Format | Sujet précis | Accroche (première phrase) | Appel à l'action | Indicateur à suivre.
3. Les 3 publications à préparer en premier, et pourquoi.

## Règles
- Sujets précis et propres à cette activité : « 3 erreurs qui font fuir les clients en salon » plutôt que « conseil du jour ».
- Pas plus d'un appel à l'action commercial direct sur 4 publications.
- Si une information manque, pose-moi jusqu'à 3 questions avant de commencer.`,
    resultat: "Un calendrier de 4 semaines en tableau, prêt à copier dans Notion, Sheets ou ton outil de planification, avec l'accroche de chaque publication.",
    verifier: [
      "Le rythme proposé est tenable avec ton temps de production réel.",
      "Les dates des temps forts (jours fériés, événements) sont exactes.",
      "Les sujets correspondent à ce que tu peux vraiment produire (photos, vidéos, témoignages disponibles).",
    ],
    relance: "Développe les 3 publications prioritaires : pour chacune, la légende complète, la structure visuelle (slide par slide ou plan par plan) et 5 hashtags ciblés.",
  },
  {
    id: "cm-hooks",
    metier: "cm",
    categorie: "creation",
    niveau: "Essentiel",
    titre: "15 accroches pour une vidéo courte",
    resume: "Cinq mécaniques d'accroche testées, trois versions chacune, avec le texte à l'écran.",
    tags: ["hook", "reels", "tiktok", "shorts", "vidéo"],
    prompt: `Tu es spécialiste de la vidéo courte (Reels, TikTok, Shorts). Tu sais que les 2 premières secondes décident si la personne reste.

## Contexte
- Sujet : {{sujet_video}}
- Cible : {{cible}}
- Ton : {{ton}}
- Ce que la personne gagne en regardant : {{promesse}}

## Ta mission
Écris 15 accroches (la première phrase dite dans la vidéo), 3 par mécanique :
1. Contre-intuitif : casse une idée reçue de la cible.
2. Erreur fréquente : pointe une erreur que la cible fait sans le savoir.
3. Résultat concret : montre un bénéfice visible ou chiffré.
4. Curiosité : ouvre une question que seule la suite referme.
5. Identification : décrit une situation que la cible vit, avec ses mots.

## Format de réponse
Un tableau : N° | Mécanique | Accroche orale (12 mots max) | Texte à l'écran (6 mots max) | Premier plan à filmer.
Puis ton top 3, avec pour chacun la raison en une phrase.

## Règles
- Vocabulaire de la cible, pas du marketing : aucune formule du type « Découvrez », « Incroyable », « Vous n'allez pas y croire ».
- Chaque promesse doit être tenue par la vidéo : pas de piège à clics.
- Aucun chiffre inventé : si une accroche en demande un, écris [CHIFFRE À COMPLÉTER].`,
    resultat: "15 accroches classées par mécanique, avec le texte à afficher et le premier plan à filmer, plus une sélection argumentée.",
    verifier: [
      "Chaque accroche est tenue par le contenu réel de ta vidéo.",
      "Les chiffres à compléter viennent de tes propres données.",
      "Le texte à l'écran reste lisible hors des zones masquées par l'interface du réseau.",
    ],
    relance: "Prends l'accroche n°[X] et écris le script complet de la vidéo en 35 secondes maximum, avec un changement visuel toutes les 3 à 5 secondes.",
  },
  {
    id: "cm-script",
    metier: "cm",
    categorie: "creation",
    niveau: "Essentiel",
    titre: "Script de vidéo courte, plan par plan",
    resume: "Un script minuté, tournable avec tes moyens, avec la légende et des idées de miniature.",
    tags: ["script", "reels", "tiktok", "tournage", "vidéo"],
    prompt: `Tu es scénariste de vidéos courtes pour les réseaux sociaux. Tu écris des scripts qui retiennent l'attention jusqu'au bout et qui se tournent avec des moyens simples.

## Contexte
- Sujet : {{sujet_video}}
- Cible : {{cible}}
- Durée visée : {{duree}}
- Message à retenir : {{message_cle}}
- Action attendue à la fin : {{cta}}
- Moyens de tournage : {{moyens}}

## Ta mission
Écris le script complet de la vidéo.

## Méthode
1. Accroche (0 à 2 s) : une phrase qui crée une tension ou une promesse.
2. Contexte (2 à 6 s) : pourquoi ça concerne la personne.
3. Développement : 2 ou 3 idées maximum, une par plan, avec un changement visuel toutes les 3 à 5 secondes.
4. Résolution : le message à retenir, dit simplement.
5. Appel à l'action : une seule action, formulée comme un bénéfice.

## Format de réponse
Un tableau : Temps | Plan (ce qu'on voit) | Texte dit | Texte à l'écran | Son ou musique.
Puis la légende du post (150 mots max) et 3 idées de miniature.

## Règles
- Phrases courtes, écrites pour l'oral : chacune doit passer en une respiration.
- Respecte la durée : compte environ 2,5 mots par seconde.
- Tout doit être tournable avec les moyens indiqués.`,
    resultat: "Un script minuté plan par plan, avec le texte dit, le texte à l'écran, la légende et des idées de miniature.",
    verifier: [
      "Lis le script à voix haute avec un chrono : la durée annoncée est réaliste.",
      "Les plans sont faisables avec ton matériel et ton lieu.",
      "Les sons et musiques proposés sont utilisables légalement sur le réseau visé.",
    ],
    relance: "Fais une variante du script en 15 secondes, en gardant uniquement l'accroche, l'idée la plus forte et l'appel à l'action.",
  },
  {
    id: "cm-moderation",
    metier: "cm",
    categorie: "relation",
    niveau: "Essentiel",
    titre: "Répondre à un commentaire négatif",
    resume: "Diagnostic du commentaire, stratégie de réponse et trois versions de ton différent.",
    tags: ["modération", "crise", "avis négatif", "bad buzz", "service client"],
    prompt: `Tu es responsable de la modération et de la relation client sur les réseaux sociaux. Ton objectif : désamorcer, régler le problème et montrer aux autres lecteurs que la marque est fiable.

## Contexte
- Activité : {{activite}}
- Ton de la marque : {{ton}}
- Réseau : {{reseau}}
- Commentaire reçu :
<commentaire>
{{commentaire}}
</commentaire>
- Ce que je sais de la situation :
<situation>
{{contexte_commentaire}}
</situation>

## Ta mission
1. Classe le commentaire : critique fondée, malentendu, demande de service client, provocation ou risque de crise (sujet sensible, viralité possible).
2. Recommande une stratégie : répondre en public, répondre en public puis passer en privé, ne pas répondre, ou alerter un responsable.
3. Rédige les réponses.

## Format de réponse
- Classement et niveau de risque (faible, moyen, élevé), une ligne chacun.
- La stratégie recommandée en 2 phrases.
- La réponse publique en 3 versions (sobre, chaleureuse, ferme), 280 caractères maximum chacune.
- Le message privé de suivi, si nécessaire.
- Ce qu'il ne faut surtout pas écrire dans ce cas précis.

## Règles
- Ne reconnais aucune faute que la situation ne confirme pas, et ne promets aucun geste commercial non mentionné.
- Pas de formule toute faite (« Nous sommes navrés pour la gêne occasionnée ») : réponds sur le fond.
- Si le commentaire touche au juridique, à la santé ou à la sécurité, recommande d'abord une validation par un responsable.`,
    resultat: "Un diagnostic du commentaire, la stratégie à suivre, trois réponses publiques de ton différent et le message privé.",
    verifier: [
      "Aucun engagement (remboursement, délai, geste) n'est pris sans validation interne.",
      "Les faits cités dans la réponse correspondent à ton dossier client.",
      "Le ton reste cohérent avec tes réponses précédentes, visibles par tous.",
    ],
    relance: "La personne a répondu ceci : [colle sa réponse]. Écris la suite de l'échange en gardant la même stratégie, ou dis-moi s'il faut en changer.",
  },
  {
    id: "cm-audit",
    metier: "cm",
    categorie: "analyse",
    niveau: "Avancé",
    titre: "Diagnostic de performances d'un compte",
    resume: "Tes statistiques transformées en constats chiffrés, hypothèses testables et plan de test.",
    tags: ["statistiques", "engagement", "kpi", "analyse", "audit"],
    prompt: `Tu es analyste social media. Tu transformes des statistiques brutes en décisions éditoriales.

## Contexte
- Réseau : {{reseau}}
- Objectif du compte : {{objectif_compte}}
- Cible : {{cible}}
- Données :
<donnees>
{{stats}}
</donnees>

## Ta mission
Analyse ces données et dis-moi quoi changer dans ma ligne éditoriale.

## Méthode
1. Vérifie les données : signale les colonnes manquantes et les chiffres incohérents avant d'analyser.
2. Calcule pour chaque publication le taux d'engagement (interactions divisées par la portée) et, si disponibles, les enregistrements et partages rapportés à la portée.
3. Compare les publications par format, sujet, jour et heure : isole les 20 % les meilleures et les 20 % les moins bonnes.
4. Cherche ce qui différencie ces deux groupes (accroche, format, sujet, durée).
5. Formule des hypothèses testables, pas des certitudes.

## Format de réponse
1. Un tableau des 5 meilleures et des 5 moins bonnes publications avec leurs indicateurs.
2. 3 constats chiffrés, calcul visible.
3. 3 hypothèses sous la forme : « Si je [changement], alors [indicateur] devrait [évolution], parce que [raison] ».
4. Un plan de test sur 2 semaines.

## Règles
- Appuie-toi uniquement sur les données fournies ; n'invente aucune moyenne du secteur.
- Avec moins de 10 publications, dis clairement que les conclusions sont fragiles.
- Distingue corrélation et cause.`,
    resultat: "Un diagnostic chiffré de ton compte, ce qui sépare tes meilleurs contenus des moins bons, et un plan de test sur 2 semaines.",
    verifier: [
      "Refais un calcul au hasard : les taux annoncés correspondent à tes chiffres.",
      "La période analysée ne contient pas d'événement exceptionnel (publicité, buzz) qui fausse la comparaison.",
      "Les hypothèses sont testables avec ton rythme de publication.",
    ],
    relance: "Voici les résultats des 2 semaines de test : [colle les chiffres]. Valide ou invalide chaque hypothèse, puis propose les 2 prochains tests.",
  },
  {
    id: "cm-recyclage",
    metier: "cm",
    categorie: "creation",
    niveau: "Essentiel",
    titre: "Décliner un contenu en 8 formats",
    resume: "Un article, une vidéo ou une newsletter transformés en 8 publications prêtes à diffuser.",
    tags: ["recyclage", "déclinaison", "carrousel", "newsletter", "repurposing"],
    prompt: `Tu es content strategist. Tu tires plusieurs publications d'un seul contenu de fond, en adaptant chaque version aux codes du réseau.

## Contexte
- Cible : {{cible}}
- Réseaux utilisés : {{reseaux}}
- Contenu source :
<source>
{{contenu_source}}
</source>

## Ta mission
1. Extrais les 5 idées les plus fortes du contenu source, une phrase chacune.
2. Décline-les en 8 publications, en choisissant parmi : carrousel, vidéo courte, post texte LinkedIn, thread, story interactive (sondage ou quiz), newsletter, citation visuelle, FAQ.
3. Choisis les formats adaptés aux réseaux indiqués.

## Format de réponse
Pour chaque publication :
- Format et réseau
- Idée source utilisée
- Contenu complet, prêt à publier (slide par slide pour un carrousel, plan par plan pour une vidéo)
- Appel à l'action

Termine par un ordre de publication sur 2 semaines.

## Règles
- Chaque publication se comprend seule, sans avoir vu le contenu source.
- Garde les faits et les chiffres du contenu source ; n'en ajoute aucun.
- Deux publications ne disent jamais la même chose avec les mêmes mots.`,
    resultat: "8 publications prêtes à l'emploi tirées d'un seul contenu, avec un ordre de diffusion sur 2 semaines.",
    verifier: [
      "Les chiffres et citations repris sont fidèles au contenu source.",
      "Chaque format respecte les limites du réseau (nombre de slides, durée, caractères).",
      "Les publications d'une même semaine ne se répètent pas.",
    ],
    relance: "Transforme le carrousel en version slide par slide : pour chaque slide, un titre (8 mots max), un texte (25 mots max) et une indication visuelle.",
  },
];
