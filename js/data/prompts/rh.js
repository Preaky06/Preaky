export default [
  {
    id: "rh-fiche-poste",
    metier: "rh",
    categorie: "redaction",
    niveau: "Essentiel",
    titre: "Offre d'emploi attractive et non discriminante",
    resume: "Une offre claire qui attire les bons profils, sans critère discriminatoire, avec sa version courte.",
    tags: ["fiche de poste", "offre d'emploi", "annonce", "marque employeur", "recrutement"],
    prompt: `Tu es recruteur expérimenté, spécialiste de la marque employeur. Tu écris des offres qui attirent les bons profils et découragent ceux qui ne correspondent pas.

## Contexte
- Entreprise : {{activite}}
- Poste : {{poste}}
- Missions (en vrac) :
<missions>
{{missions}}
</missions>
- Conditions : {{conditions}}
- Équipe et management : {{equipe}}
- Pays : {{pays}}

## Ta mission
Rédige l'offre d'emploi.

## Format de réponse
1. Titre de l'offre : clair et réellement recherché par les candidats (pas de titre fantaisiste).
2. Accroche : pourquoi ce poste existe et ce qu'il change dans l'entreprise (3 lignes).
3. Missions : 5 à 7 points concrets, au présent, avec des verbes d'action.
4. Profil : « indispensable » (4 points maximum) séparé de « apprécié ».
5. Ce que nous offrons : conditions concrètes, salaire ou fourchette si fourni.
6. Déroulé du recrutement : étapes et délais.
7. Une version courte de 300 caractères pour LinkedIn.

## Règles
- Aucun critère discriminatoire, direct ou indirect : âge, sexe, origine, situation familiale, apparence, lieu de résidence, santé, handicap, etc. Remplace « jeune et dynamique » ou « 5 ans d'expérience minimum » par les compétences réellement attendues.
- Intitulé au masculin et au féminin, ou formulation neutre.
- Signale les exigences qui réduisent inutilement le vivier de candidats.`,
    resultat: "Une offre d'emploi complète et sa version courte, sans critère discriminatoire, avec des exigences clarifiées.",
    verifier: [
      "En France, l'offre ne doit contenir aucun critère discriminatoire (Code du travail, art. L1132-1) et doit être rédigée en français.",
      "Le salaire et les avantages annoncés sont validés par la direction.",
      "Le manager a relu les missions : elles décrivent le poste réel.",
    ],
    relance: "Écris 3 messages d'approche directe de 80 mots pour des profils repérés sur LinkedIn qui ne cherchent pas activement.",
  },
  {
    id: "rh-grille-entretien",
    metier: "rh",
    categorie: "strategie",
    niveau: "Avancé",
    titre: "Grille d'entretien structuré",
    resume: "Questions comportementales STAR, échelle de notation ancrée et fiche de synthèse par recruteur.",
    tags: ["entretien", "star", "grille", "évaluation", "biais"],
    prompt: `Tu es spécialiste du recrutement structuré. Tu sais que les entretiens libres prédisent mal la réussite dans le poste, et que des questions comportementales notées avec une grille commune limitent les biais.

## Contexte
- Poste : {{poste}}
- Compétences clés :
<competences>
{{competences}}
</competences>
- Situations difficiles typiques du poste : {{situations_poste}}

## Ta mission
Construis la grille d'entretien.

## Format de réponse
Pour chaque compétence :
- Une définition observable, en une phrase
- 2 questions comportementales (« Racontez-moi une fois où… ») pour obtenir une réponse structurée en STAR : Situation, Tâche, Action, Résultat
- 1 mise en situation propre au poste
- Les relances pour creuser (« Qu'avez-vous fait, vous, précisément ? »)
- Une échelle de notation de 1 à 4, avec pour chaque niveau un exemple de réponse
- Les signaux d'alerte

Puis :
- Le déroulé minuté de l'entretien (accueil, présentation du poste, questions, questions du candidat, conclusion)
- Une fiche de synthèse que chaque recruteur remplit seul, avant d'échanger avec les autres

## Règles
- Questions identiques pour tous les candidats.
- Aucune question sur la vie privée, la santé, les projets familiaux, l'origine, les opinions ou tout sujet sans lien direct avec le poste.`,
    resultat: "Une grille d'entretien structuré par compétence, avec questions comportementales, échelle de notation et fiche de synthèse.",
    verifier: [
      "Les compétences évaluées correspondent aux exigences réelles du poste.",
      "Chaque recruteur note seul avant la discussion collective, pour limiter l'influence mutuelle.",
    ],
    relance: "Crée un cas pratique de 45 minutes pour ce poste : l'énoncé, les ressources fournies au candidat et la grille de correction.",
  },
  {
    id: "rh-analyse-cv",
    metier: "rh",
    categorie: "analyse",
    niveau: "Avancé",
    titre: "Analyser un CV au regard du poste",
    resume: "Correspondance exigence par exigence et questions d'entretien. La décision reste au recruteur.",
    tags: ["cv", "présélection", "matching", "entretien", "candidat"],
    prompt: `Tu es recruteur. Tu aides à préparer un entretien, sans jamais prendre la décision à la place du recruteur.

## Contexte
- Poste : {{poste}}
- Exigences :
<exigences>
{{exigences}}
</exigences>
- CV anonymisé :
<cv>
{{cv}}
</cv>

## Ta mission
1. Compare le parcours aux exigences, uniquement sur les compétences et les expériences.
2. Prépare l'entretien.

## Format de réponse
- Tableau : Exigence | Éléments du CV qui y répondent | Niveau de preuve (démontré, suggéré, absent).
- Les points forts au regard du poste.
- Les zones à explorer, formulées comme des questions ouvertes à poser en entretien (pas comme des défauts).
- Les compétences transférables d'un autre secteur ou d'un autre métier.

## Règles
- Ignore et ne commente aucun élément lié à l'âge, au genre, à l'origine, à la situation familiale, à la santé, à l'apparence ou au lieu de résidence, même s'il apparaît.
- Une interruption de parcours n'est pas un point négatif : ne l'interprète pas.
- Ne donne ni note globale, ni recommandation d'embauche ou de rejet.`,
    resultat: "Une correspondance exigence par exigence et les questions à poser en entretien. La décision reste au recruteur.",
    verifier: [
      "Le CV est anonymisé avant d'être collé : les données des candidats sont protégées par le RGPD.",
      "L'usage de l'IA dans ton recrutement est conforme à la politique de ton entreprise : le règlement européen sur l'IA classe ces usages parmi les usages à haut risque.",
      "Aucun candidat n'est écarté sur la seule base de cette analyse.",
    ],
    relance: "Prépare 5 questions d'entretien pour explorer les zones identifiées, avec ce qu'une bonne réponse devrait contenir.",
  },
  {
    id: "rh-onboarding",
    metier: "rh",
    categorie: "strategie",
    niveau: "Essentiel",
    titre: "Plan d'intégration 30-60-90 jours",
    resume: "De la veille de l'arrivée au 90e jour : rencontres, missions, objectifs observables et points d'étape.",
    tags: ["onboarding", "intégration", "30-60-90", "période d'essai", "nouvel arrivant"],
    prompt: `Tu es responsable RH spécialisé en intégration. Tu sais que les premières semaines déterminent en grande partie si une recrue reste et réussit.

## Contexte
- Entreprise : {{activite}}
- Poste : {{poste}}
- Équipe et manager : {{equipe}}
- Attendu à 90 jours : {{attendu_90j}}
- Outils et process à maîtriser : {{outils}}

## Ta mission
Construis le plan d'intégration.

## Format de réponse
1. Avant l'arrivée : checklist (matériel, accès, annonce à l'équipe, premier jour planifié).
2. Semaine 1, jour par jour : rencontres, formations, une première contribution concrète.
3. Jours 1 à 30 : apprendre (objectifs, personnes à rencontrer, ressources).
4. Jours 31 à 60 : contribuer (missions avec une autonomie croissante).
5. Jours 61 à 90 : être autonome (objectifs mesurables).
6. Les points d'étape avec le manager : dates, questions à poser, critères pour valider la période.
7. Le rôle du référent ou parrain.

## Règles
- Chaque objectif est observable : « traite seul les demandes de niveau 1 » plutôt que « monte en compétence ».
- Prévois des temps d'échange informels, pas seulement des formations.`,
    resultat: "Un plan d'intégration complet, de la veille de l'arrivée à la fin des 90 jours, avec des objectifs observables.",
    verifier: [
      "Le manager valide les objectifs à 90 jours.",
      "Les dates des points d'étape sont cohérentes avec la période d'essai prévue au contrat.",
    ],
    relance: "Rédige le mail de bienvenue envoyé une semaine avant l'arrivée, avec le programme du premier jour.",
  },
  {
    id: "rh-refus",
    metier: "rh",
    categorie: "relation",
    niveau: "Essentiel",
    titre: "Réponse négative respectueuse et utile",
    resume: "Un refus personnalisé, avec un retour factuel qui aide le candidat, en mail et en appel.",
    tags: ["refus", "candidat", "expérience candidat", "feedback", "mail"],
    prompt: `Tu es recruteur attentif à l'expérience candidat. Un refus bien écrit préserve la relation et l'image de l'entreprise.

## Contexte
- Poste : {{poste}}
- Étape atteinte : {{etape}}
- Raisons du choix : {{raisons}}
- Ton : {{ton}}

## Ta mission
Rédige le message de refus.

## Format de réponse
- Une version mail (120 mots maximum).
- Une version pour un appel : les 4 points à dire, et la réponse à « Qu'est-ce qui m'a manqué ? ».

## Règles
- Remercie de façon précise (temps passé, étape atteinte), pas générique.
- Si le candidat a passé des entretiens, donne 1 ou 2 retours factuels, liés au poste et formulés pour l'aider.
- N'évoque aucun motif lié à la personne (âge, situation, apparence…) ni aucune comparaison nominative avec un autre candidat.
- Ne promets pas de recontacter si ce n'est pas prévu.`,
    resultat: "Un mail de refus personnalisé et une trame d'appel, avec un retour utile au candidat.",
    verifier: [
      "Les retours donnés sont factuels et liés aux compétences : un motif mal formulé peut être perçu comme discriminatoire.",
      "Si tu conserves le CV pour d'autres postes, le candidat en est informé et peut s'y opposer (RGPD).",
    ],
    relance: "Le candidat demande un retour détaillé par écrit. Rédige une réponse plus complète, toujours factuelle et bienveillante.",
  },
  {
    id: "rh-entretien-annuel",
    metier: "rh",
    categorie: "strategie",
    niveau: "Essentiel",
    titre: "Préparer un entretien annuel",
    resume: "Bilan factuel des objectifs, axes de progrès observables et objectifs SMART pour l'année suivante.",
    tags: ["entretien annuel", "évaluation", "objectifs", "smart", "management"],
    prompt: `Tu es coach en management. Tu aides à préparer des entretiens annuels factuels, équilibrés et tournés vers l'avenir.

## Contexte
- Poste : {{poste}}
- Je prépare l'entretien en tant que : {{role_entretien}}
- Objectifs de l'année et résultats :
<objectifs>
{{objectifs_annee}}
</objectifs>
- Faits marquants :
<faits>
{{faits_annee}}
</faits>

## Ta mission
Prépare l'entretien.

## Format de réponse
1. Bilan des objectifs : tableau Objectif | Résultat | Atteint, partiel ou non atteint | Facteurs (internes et externes).
2. Les 3 réussites à valoriser, avec un fait précis pour chacune.
3. Les 2 axes de progrès, formulés en comportements observables, avec un exemple.
4. 3 objectifs pour l'année à venir, au format SMART (spécifique, mesurable, atteignable, réaliste, daté).
5. Les besoins de formation ou d'accompagnement.
6. Les questions à poser pour faire parler l'autre personne.
7. Les phrases à éviter.

## Règles
- Parle de faits et de comportements, jamais de personnalité.
- Si une information manque pour juger un objectif, dis-le.`,
    resultat: "Un bilan factuel de l'année, des axes de progrès formulés en comportements et des objectifs SMART pour la suite.",
    verifier: [
      "Les faits cités sont datés et vérifiables.",
      "Le contenu respecte le support d'entretien imposé par ton entreprise.",
      "En France, l'entretien annuel ne remplace pas l'entretien professionnel obligatoire tous les 2 ans.",
    ],
    relance: "Simule l'entretien : joue l'autre personne avec des réactions réalistes, puis fais-moi un retour sur ma conduite de l'échange.",
  },
];
