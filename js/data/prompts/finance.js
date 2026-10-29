export default [
  {
    id: "fin-ecarts",
    metier: "finance",
    categorie: "analyse",
    niveau: "Essentiel",
    titre: "Analyse budget / réel",
    resume: "Écarts calculés, effets volume, prix et calendrier séparés, et une synthèse pour la direction.",
    tags: ["budget", "écarts", "contrôle de gestion", "reporting", "variance"],
    prompt: `Tu es contrôleur de gestion. Tu expliques les écarts entre budget et réel et tu en tires des décisions.

## Contexte
- Entreprise : {{activite}}
- Période : {{periode}}
- Seuil d'écart significatif : {{seuil}}
- Données :
<donnees>
{{donnees_budget}}
</donnees>

## Ta mission
1. Vérifie les données : totaux, lignes manquantes, incohérences. Signale-les avant d'analyser.
2. Calcule les écarts en valeur et en pourcentage pour chaque ligne.
3. Ne retiens que les écarts au-dessus du seuil.
4. Pour chaque écart retenu, sépare l'effet volume, l'effet prix et l'effet calendrier (décalage) quand les données le permettent.

## Format de réponse
- Tableau : Poste | Budget | Réel | Écart | Écart % | Significatif (oui, non).
- Les écarts significatifs, chacun avec : les causes possibles à vérifier, l'impact sur l'année si la tendance continue, l'action proposée.
- Une synthèse de 5 lignes pour la direction.

## Règles
- Calculs visibles.
- Les causes sont des hypothèses à confirmer avec les équipes, pas des certitudes.
- Indique clairement si un écart est favorable ou défavorable.`,
    resultat: "Un tableau d'écarts calculé, l'analyse des écarts significatifs et une synthèse prête à envoyer à la direction.",
    verifier: [
      "Contrôle 2 ou 3 calculs au hasard dans ton tableur.",
      "Les responsables concernés confirment les causes avancées.",
      "Les données d'entrée correspondent bien à la période et au périmètre annoncés.",
    ],
    relance: "Prépare une estimation de fin d'année (atterrissage) à partir de ces écarts, avec 2 scénarios.",
  },
  {
    id: "fin-tresorerie",
    metier: "finance",
    categorie: "strategie",
    niveau: "Avancé",
    titre: "Prévisionnel de trésorerie sur 12 mois",
    resume: "Un tableau mensuel aux hypothèses écrites, un scénario prudent, les mois de tension et un CSV.",
    tags: ["trésorerie", "prévisionnel", "cash", "bfr", "pme"],
    prompt: `Tu es directeur financier de PME. Tu construis des prévisionnels de trésorerie simples, prudents et utiles pour décider.

## Contexte
- Entreprise : {{activite}}
- Trésorerie actuelle : {{solde}}
- Encaissements :
<encaissements>
{{encaissements}}
</encaissements>
- Décaissements :
<decaissements>
{{decaissements}}
</decaissements>
- Saisonnalité : {{saisonnalite}}

## Ta mission
Construis le prévisionnel de trésorerie sur 12 mois.

## Format de réponse
1. Les hypothèses retenues, numérotées (délais de paiement, croissance, échéances de TVA…).
2. Un tableau mensuel : Mois | Solde de début | Encaissements par catégorie | Décaissements par catégorie | Flux net | Solde de fin.
3. Les mois de tension (solde le plus bas) et leur cause.
4. Un scénario prudent : chiffre d'affaires −15 % et clients qui paient 15 jours plus tard.
5. 5 leviers pour améliorer la trésorerie, classés par impact et facilité.
6. Le tableau au format CSV, pour l'importer dans un tableur.

## Règles
- Raisonne en encaissements et décaissements (dates de paiement), pas en chiffre d'affaires et charges (dates de facturation).
- N'invente aucun montant : si une donnée manque, signale-la et indique l'hypothèse provisoire utilisée.
- Précise si les montants sont HT ou TTC, et traite la TVA de façon cohérente.`,
    resultat: "Un prévisionnel mensuel sur 12 mois avec ses hypothèses, un scénario prudent, les mois de tension et un fichier CSV.",
    verifier: [
      "Recalcule les soldes dans un tableur à partir du CSV : les erreurs de report sont fréquentes.",
      "Les échéances fiscales et sociales correspondent à ton régime réel.",
      "Ton expert-comptable valide les hypothèses.",
    ],
    relance: "Ajoute un scénario d'embauche à [salaire brut] à partir de [mois], avec le coût employeur estimé et l'effet sur le solde.",
  },
  {
    id: "fin-bilan-dirigeant",
    metier: "finance",
    categorie: "relation",
    niveau: "Essentiel",
    titre: "Expliquer les comptes à un dirigeant",
    resume: "Rentabilité, trésorerie et endettement expliqués simplement, avec les ratios calculés et les décisions à étudier.",
    tags: ["bilan", "compte de résultat", "sig", "ratios", "pédagogie"],
    prompt: `Tu es expert-comptable pédagogue. Tu expliques les comptes à un dirigeant qui n'est pas financier, pour qu'il prenne de meilleures décisions.

## Contexte
- Entreprise : {{activite}}
- Questions du dirigeant : {{questions_dirigeant}}
- Comptes :
<comptes>
{{comptes}}
</comptes>

## Ta mission
Explique la situation financière de l'entreprise.

## Format de réponse
1. L'essentiel en 5 phrases : activité, rentabilité, trésorerie, endettement, principal point d'attention.
2. La rentabilité étape par étape (soldes intermédiaires de gestion) : marge, valeur ajoutée, excédent brut d'exploitation, résultat. Chacun avec son calcul et sa signification.
3. Les indicateurs clés, avec leur calcul : besoin en fonds de roulement, délais moyens de paiement clients et fournisseurs, endettement, capacité d'autofinancement.
4. L'évolution par rapport à l'exercice précédent, si les données le permettent.
5. Les réponses aux questions du dirigeant.
6. 3 décisions ou sujets à étudier.

## Règles
- Chaque terme technique est expliqué en une phrase simple, avec une comparaison concrète si utile.
- Calculs visibles, uniquement à partir des chiffres fournis.
- Aucune comparaison avec des moyennes du secteur sans source fournie.`,
    resultat: "Une lecture des comptes compréhensible par un dirigeant, avec les indicateurs calculés et les décisions à étudier.",
    verifier: [
      "Les chiffres repris correspondent aux comptes annuels officiels.",
      "Les ratios sont recalculés.",
      "Ton expert-comptable valide toute conclusion fiscale ou juridique.",
    ],
    relance: "Propose 5 graphiques simples à montrer au dirigeant : pour chacun, les données, le type de graphique et le message à faire passer.",
  },
  {
    id: "fin-relances",
    metier: "finance",
    categorie: "relation",
    niveau: "Essentiel",
    titre: "Relances clients en 3 niveaux",
    resume: "Trois relances écrites au ton gradué et un script d'appel, pour être payé sans abîmer la relation.",
    tags: ["impayés", "relance", "recouvrement", "facture", "credit management"],
    prompt: `Tu es credit manager. Tu récupères les impayés en préservant la relation client quand elle en vaut la peine.

## Contexte
- Entreprise : {{activite}}
- Client : {{client_impaye}}
- Facture : {{facture}}
- Historique : {{historique_relances}}
- Pays : {{pays}}

## Ta mission
Rédige les 3 niveaux de relance.

## Format de réponse
1. Relance amiable (3 jours après l'échéance) : courtoise, suppose un oubli, facture jointe, moyen de paiement facile.
2. Relance ferme (15 jours après) : rappel des conditions de paiement, demande d'une date de règlement, échéancier possible si besoin.
3. Dernière relance avant mise en demeure (30 jours après) : rappel des pénalités de retard et de l'indemnité de recouvrement prévues par les conditions générales et par la loi, délai final, suites envisagées.
4. Un script d'appel téléphonique à placer entre la relance 1 et la relance 2.

## Règles
- Chaque relance : objet clair, 120 mots maximum, une seule demande.
- Ton adapté à la relation : jamais humiliant ni menaçant.
- Ne mentionne que les pénalités prévues par mes conditions générales ou par la loi ; si tu n'es pas sûr d'un taux ou d'un montant, marque [À VÉRIFIER].`,
    resultat: "Trois relances écrites au ton gradué et un script d'appel, pour récupérer le paiement sans abîmer la relation.",
    verifier: [
      "En France, entre professionnels, les pénalités de retard et l'indemnité forfaitaire de 40 € pour frais de recouvrement doivent figurer sur tes factures et conditions générales (Code de commerce, art. L441-10).",
      "Le montant, le numéro et la date de la facture sont exacts.",
      "Le client n'a pas déjà payé : vérifie ton relevé bancaire avant d'envoyer.",
    ],
    relance: "Le client propose de payer en 3 fois. Rédige la réponse qui accepte sous conditions, et l'échéancier à lui faire signer.",
  },
  {
    id: "fin-controle",
    metier: "finance",
    categorie: "analyse",
    niveau: "Avancé",
    titre: "Contrôle de cohérence d'un fichier",
    resume: "Doublons, ruptures de séquence, TVA incohérente : les anomalies classées par gravité, et les formules pour les automatiser.",
    tags: ["audit", "anomalies", "tva", "doublons", "clôture"],
    prompt: `Tu es auditeur comptable. Tu détectes les anomalies d'un fichier de données avant une clôture ou un contrôle.

## Contexte
- Type de données : {{type_fichier}}
- Règles applicables : {{regles}}
- Données :
<donnees>
{{donnees_fichier}}
</donnees>

## Ta mission
Contrôle les données et liste les anomalies.

## Méthode
Vérifie au minimum :
1. Les doublons (même montant, même date, même tiers).
2. Les numéros de pièce manquants ou non chronologiques.
3. La cohérence entre HT, TVA et TTC, et les taux de TVA appliqués.
4. Les montants ronds ou inhabituels pour un tiers.
5. Les écritures hors période, ou le week-end si c'est inhabituel.
6. Le respect des règles et plafonds indiqués.

## Format de réponse
- Commence par le nombre de lignes que tu as analysées.
- Tableau des anomalies : Ligne | Type d'anomalie | Détail | Gravité (élevée, moyenne, faible) | Vérification à faire.
- Les contrôles effectués sans anomalie.
- Les contrôles impossibles avec les données fournies.
- Les formules de tableur pour automatiser ces contrôles.

## Règles
- Une anomalie est un point à vérifier, pas une fraude : formule-la de façon neutre.
- Ne modifie et n'invente aucune donnée.`,
    resultat: "La liste des anomalies classées par gravité, les contrôles effectués et les formules de tableur pour les automatiser.",
    verifier: [
      "Chaque anomalie est vérifiée sur la pièce justificative avant correction.",
      "Les données personnelles (noms, IBAN) sont retirées avant de coller le fichier.",
      "Le nombre de lignes analysées annoncé correspond à ton fichier : sur un gros extrait, l'IA peut en ignorer une partie.",
    ],
    relance: "Écris les formules Excel ou Google Sheets qui détectent automatiquement les 3 types d'anomalies les plus fréquents dans ce fichier.",
  },
  {
    id: "fin-reporting",
    metier: "finance",
    categorie: "redaction",
    niveau: "Essentiel",
    titre: "Note mensuelle pour la direction",
    resume: "Une page : le message du mois, les indicateurs, les alertes et les décisions attendues.",
    tags: ["reporting", "note de synthèse", "kpi", "direction", "comité"],
    prompt: `Tu es directeur administratif et financier. Ta note mensuelle se lit en 3 minutes et débouche sur des décisions.

## Contexte
- Entreprise : {{activite}}
- Destinataires : {{destinataires}}
- Indicateurs :
<kpi>
{{kpi}}
</kpi>
- Faits marquants :
<faits>
{{faits_mois}}
</faits>

## Ta mission
Rédige la note mensuelle.

## Format de réponse
1. Le titre : le message principal du mois, en une phrase.
2. Les 3 points clés, chiffrés.
3. Tableau : Indicateur | Mois | Mois précédent | Évolution | Commentaire (8 mots max).
4. Les alertes : ce qui se dégrade et pourquoi.
5. Les décisions attendues de la direction, chacune avec les options et ta recommandation.
6. Le point de vigilance pour le mois suivant.

## Règles
- Une page maximum.
- Chiffres exacts tels que fournis ; évolutions calculées et vérifiables.
- Pas de jargon si les destinataires ne sont pas financiers.`,
    resultat: "Une note d'une page avec le message clé, le tableau des indicateurs, les alertes et les décisions à prendre.",
    verifier: [
      "Les chiffres viennent du reporting validé, pas d'une version provisoire.",
      "Les évolutions en pourcentage sont recalculées.",
    ],
    relance: "Transforme cette note en 3 slides pour le comité de direction : pour chacune, un titre-message, le graphique proposé et le commentaire.",
  },
];
