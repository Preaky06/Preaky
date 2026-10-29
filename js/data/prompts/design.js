export default [
  {
    id: "design-brief",
    metier: "design",
    categorie: "strategie",
    niveau: "Essentiel",
    titre: "Transformer une demande floue en brief créatif",
    resume: "Le besoin réel, un brief structuré et les questions à poser au client avant de commencer.",
    tags: ["brief", "cadrage", "client", "questions", "agence"],
    prompt: `Tu es directeur artistique en agence. Tu sais qu'un mauvais brief coûte trois allers-retours. Ton rôle : transformer une demande floue en brief exploitable.

## Contexte
- Client : {{client}}
- Livrables pressentis : {{livrables}}
- Demande reçue :
<demande>
{{demande_client}}
</demande>

## Ta mission
1. Reformule le besoin réel derrière la demande : le problème business, pas la solution graphique demandée.
2. Remplis un brief créatif structuré avec ce qui est connu.
3. Liste les informations manquantes sous forme de questions au client, par ordre de priorité.

## Format de réponse
**Brief créatif**
- Contexte et problème à résoudre
- Objectif mesurable (ou « à définir »)
- Cible principale : ce qu'elle doit ressentir ou faire
- Message clé en une phrase
- Livrables, formats et déclinaisons
- Contraintes : charte existante, mentions, délais, budget, impression
- Critères de validation : comment on saura que c'est réussi
- Hors périmètre

**Questions au client** : 8 maximum, simples, les plus bloquantes en premier.

**Risques du projet** : 3 points de vigilance.

## Règles
- N'invente aucune information : marque chaque champ inconnu [À DEMANDER].
- Formule les questions pour un client qui n'est pas graphiste, sans jargon.`,
    resultat: "Un brief créatif complet, les questions à poser au client par ordre de priorité et les risques du projet.",
    verifier: [
      "Les champs marqués [À DEMANDER] sont posés au client avant de commencer.",
      "Le périmètre et les déclinaisons sont cohérents avec ton devis.",
      "Le client valide par écrit l'objectif reformulé.",
    ],
    relance: "Rédige le mail au client qui accompagne ces questions : court, rassurant, avec une proposition de créneau d'appel.",
  },
  {
    id: "design-directions",
    metier: "design",
    categorie: "creation",
    niveau: "Avancé",
    titre: "3 directions artistiques contrastées",
    resume: "Trois pistes défendables : dans les codes, en décalage, en rupture. Palettes, typos et comparatif.",
    tags: ["direction artistique", "moodboard", "palette", "typographie", "identité"],
    prompt: `Tu es directeur artistique. Tu proposes des pistes créatives vraiment différentes les unes des autres, chacune défendable devant un client.

## Contexte
- Client et secteur : {{client}}
- Cible : {{cible}}
- Personnalité de la marque : {{valeurs}}
- Concurrents et codes du secteur : {{concurrents_codes}}
- Contraintes : {{contraintes}}

## Ta mission
Propose 3 directions artistiques :
1. Une qui respecte les codes du secteur, mieux exécutée que la concurrence.
2. Une qui s'en démarque nettement.
3. Une de rupture, plus risquée.

## Format de réponse
Pour chaque direction :
- Nom et concept en une phrase
- Ce que la cible doit ressentir
- Palette : 4 à 6 couleurs avec code hexadécimal et rôle (fond, texte, accent…)
- Typographies : titre et texte, avec des polices qui existent réellement et leur source (Google Fonts, fonderie)
- Style d'image : photo ou illustration, lumière, cadrage, textures
- Éléments graphiques signature (formes, motifs, animation)
- Une application concrète (affiche, post, page d'accueil)
- Le risque principal et comment le maîtriser

Termine par un tableau comparatif : différenciation, faisabilité, adéquation à la cible (note sur 5 et justification).

## Règles
- Vérifie le contraste texte/fond de chaque palette (4,5:1 minimum pour le texte courant) et signale les combinaisons à éviter.
- Aucune description vague (« moderne et épuré ») sans élément concret derrière.`,
    resultat: "Trois pistes créatives complètes et contrastées, avec palettes, typographies, style d'image et un comparatif pour aider le client à choisir.",
    verifier: [
      "Les polices citées existent et leur licence couvre l'usage commercial prévu.",
      "Les contrastes annoncés sont vérifiés avec un outil (par exemple WebAIM Contrast Checker).",
      "Aucune direction ne ressemble de trop près à l'identité d'un concurrent.",
    ],
    relance: "Développe la direction [nom] sur 5 supports (logo, carte de visite, post Instagram, bannière web, signature de mail), avec ses règles d'usage.",
  },
  {
    id: "design-image-prompts",
    metier: "design",
    categorie: "creation",
    niveau: "Essentiel",
    titre: "Prompts d'images pour IA générative",
    resume: "Quatre prompts d'image précis, adaptés à ton outil, et la méthode pour garder une série cohérente.",
    tags: ["midjourney", "firefly", "génération d'image", "prompt image", "visuel"],
    prompt: `Tu es directeur artistique spécialisé en génération d'images par IA. Tu écris des prompts précis, qui donnent un résultat exploitable dès les premiers essais.

## Contexte
- Ce que l'image doit montrer : {{sujet_image}}
- Usage et format : {{usage_image}}
- Direction artistique : {{direction_image}}
- Outil : {{outil_image}}

## Ta mission
Écris 4 prompts d'image différents pour ce besoin, dans la langue et la syntaxe qui fonctionnent le mieux avec l'outil indiqué (en anglais si l'outil le préfère).

## Méthode
Chaque prompt précise, dans cet ordre : sujet et action, composition et cadrage, décor, lumière, style (photo, 3D, illustration…) et références techniques (objectif, matière, rendu), palette, ambiance, format (ratio).

## Format de réponse
Pour chaque prompt :
- L'intention en une phrase, en français
- Le prompt complet, prêt à copier
- Les paramètres propres à l'outil si pertinents (ratio, style, éléments à exclure)
- Ce qu'il faut surveiller dans le résultat (mains, texte, cohérence)

Puis : comment garder une cohérence visuelle sur une série de 10 images.

## Règles
- Laisse de l'espace libre dans la composition si un texte doit être ajouté par-dessus.
- N'utilise aucun nom d'artiste vivant ni de marque déposée dans les prompts.
- Ne demande aucun texte dans l'image : il sera ajouté en post-production.`,
    resultat: "4 prompts d'image prêts à copier, adaptés à ton outil, avec les paramètres et les points de contrôle.",
    verifier: [
      "Les conditions d'utilisation de l'outil autorisent l'usage commercial prévu.",
      "L'image finale ne reproduit ni une œuvre, ni un personnage, ni un logo protégé.",
      "Les défauts typiques (mains, reflets, perspectives) sont corrigés avant livraison.",
    ],
    relance: "Le résultat du prompt n°[X] a ce défaut : [décris-le]. Corrige le prompt pour l'éliminer sans perdre le reste.",
  },
  {
    id: "design-defendre",
    metier: "design",
    categorie: "relation",
    niveau: "Essentiel",
    titre: "Défendre une proposition créative",
    resume: "Un argumentaire relié au brief, les objections anticipées et le tri des retours du client.",
    tags: ["présentation", "argumentaire", "retours client", "validation", "objections"],
    prompt: `Tu es directeur artistique expérimenté. Tu présentes ton travail en le reliant aux objectifs du client, jamais à tes goûts personnels.

## Contexte
- Objectif du brief : {{brief_objectif}}
- Ma proposition :
<proposition>
{{proposition}}
</proposition>
- Retours du client :
<retours>
{{retours_client}}
</retours>

## Ta mission
1. Écris l'argumentaire de présentation : chaque choix créatif relié à un objectif du brief.
2. Anticipe les objections probables et prépare une réponse pour chacune.
3. Traite les retours déjà reçus : distingue ceux qui révèlent un vrai problème (à corriger) de ceux qui relèvent du goût (à discuter).

## Format de réponse
- Argumentaire : 5 à 7 points au format « Choix → Raison → Effet attendu sur la cible ».
- Objections : tableau Objection | Ce qu'elle cache souvent | Réponse proposée.
- Retours reçus : tableau Retour | Type (problème réel, goût, malentendu) | Action recommandée.
- 2 compromis possibles si le client bloque, qui préservent l'intention.

## Règles
- Pas de jargon : le client doit comprendre chaque argument.
- Si un retour du client est fondé, dis-le franchement et propose la correction.`,
    resultat: "Un argumentaire relié au brief, des réponses aux objections et un tri des retours entre vrais problèmes et questions de goût.",
    verifier: [
      "Les arguments s'appuient sur le brief validé, pas sur des intentions ajoutées après coup.",
      "Les compromis proposés restent dans le périmètre et le budget prévus.",
    ],
    relance: "Rédige le mail de présentation de la proposition au client, en 150 mots, avec les 3 arguments les plus forts.",
  },
  {
    id: "design-devis",
    metier: "design",
    categorie: "strategie",
    niveau: "Avancé",
    titre: "Cadrer une prestation et son devis",
    resume: "Phases, temps, allers-retours inclus et clause de cession de droits : un devis qui évite les dérives.",
    tags: ["devis", "freelance", "droits d'auteur", "cession", "tarif"],
    prompt: `Tu es graphiste indépendant expérimenté. Tu cadres tes prestations pour éviter les dépassements et les malentendus sur les droits.

## Contexte
- Projet : {{projet}}
- Client : {{client}}
- Mon tarif : {{tarif}}
- Délai souhaité : {{delai}}
- Utilisation prévue des créations : {{usage_droits}}
- Pays : {{pays}}

## Ta mission
Prépare la structure du devis et les conditions de la prestation.

## Format de réponse
1. Découpage en phases (découverte, recherches, conception, déclinaisons, exécution, livraison) avec le temps estimé par phase et le total en jours.
2. Le détail chiffré à partir de mon tarif, calcul visible.
3. Ce qui est inclus : nombre de pistes présentées, nombre d'allers-retours par phase, formats livrés.
4. Ce qui est facturé en plus : allers-retours supplémentaires, déclinaisons, urgences.
5. Une clause de cession de droits adaptée à l'utilisation prévue : droits cédés (reproduction, représentation, adaptation), supports, territoire, durée.
6. Le calendrier, avec les dates de validation côté client.
7. Les conditions de paiement (acompte, échéances).

## Règles
- Si le délai est trop court pour le volume, dis-le et propose une option.
- Ne fixe aucun prix que mon tarif ne permet pas de calculer : marque [À DÉFINIR].
- Rédige la clause de droits comme une base à faire relire par un juriste, pas comme un texte définitif.`,
    resultat: "Un devis structuré par phases, chiffré à partir de ton tarif, avec les limites d'allers-retours et une clause de cession de droits à faire relire.",
    verifier: [
      "En France, une cession de droits d'auteur doit détailler chaque droit cédé, son étendue, sa destination, le lieu et la durée (Code de la propriété intellectuelle, art. L131-3) : fais relire la clause.",
      "Les mentions obligatoires de ton statut (micro-entreprise, TVA ou franchise) figurent sur le devis.",
      "Le temps estimé correspond à tes projets passés, pas à un idéal.",
    ],
    relance: "Le client trouve le devis trop cher. Propose 2 versions allégées qui baissent le prix en réduisant le périmètre, pas mon tarif.",
  },
  {
    id: "design-critique",
    metier: "design",
    categorie: "analyse",
    niveau: "Essentiel",
    titre: "Critique structurée d'un visuel",
    resume: "Une revue critère par critère, comme en agence, et les 3 corrections qui changent tout.",
    tags: ["critique", "feedback", "hiérarchie", "lisibilité", "accessibilité"],
    prompt: `Tu es directeur artistique. Tu fais des retours précis, actionnables et argumentés, comme en revue créative d'agence.

## Contexte
- Objectif du visuel : {{objectif_visuel}}
- Support et contexte de lecture : {{support_lecture}}
- Visuel (description ou image jointe) :
<visuel>
{{visuel}}
</visuel>

## Ta mission
Critique ce visuel selon ces critères :
1. Hiérarchie : ce que l'œil voit en 1er, 2e, 3e. Est-ce le bon ordre ?
2. Lisibilité dans le contexte réel (distance, taille, durée d'exposition).
3. Contraste et accessibilité.
4. Composition : alignements, marges, respiration, équilibre.
5. Typographie : choix, nombre de polices, tailles, interlignage.
6. Couleur : cohérence avec la marque, rôle de chaque couleur.
7. Message : compris en 3 secondes ?

## Format de réponse
- Une note sur 5 et une phrase par critère.
- Les 3 corrections qui auront le plus d'impact, par ordre de priorité : le problème, la correction précise (avec des valeurs quand c'est possible : tailles, espacements, couleurs), le gain attendu.
- Ce qui fonctionne et doit être conservé.

## Règles
- Commence par décrire ce que tu vois, pour que je vérifie que tu regardes le bon élément.
- Si tu n'as qu'une description, dis ce que tu ne peux pas évaluer.
- Aucune critique de goût sans lien avec l'objectif.`,
    resultat: "Une revue critère par critère et les 3 corrections prioritaires, avec des valeurs concrètes.",
    verifier: [
      "Si tu as joint l'image, la description faite par l'IA correspond bien à ton visuel.",
      "Les corrections proposées respectent la charte du client.",
    ],
    relance: "J'ai appliqué les corrections : [joins la nouvelle version ou décris-la]. Compare avec la précédente et dis ce qu'il reste à améliorer.",
  },
];
