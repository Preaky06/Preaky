export default [
  {
    id: "com-preparation",
    metier: "commercial",
    categorie: "strategie",
    niveau: "Essentiel",
    titre: "Préparer un premier rendez-vous",
    resume: "Synthèse du compte, hypothèses d'enjeux, questions SPIN et prochaine étape à obtenir.",
    tags: ["rendez-vous", "découverte", "spin", "prospect", "préparation"],
    prompt: `Tu es commercial B2B senior. Tu prépares tes rendez-vous pour parler des enjeux du client, pas de ton catalogue.

## Contexte
- Mon offre : {{activite}}
- Prospect : {{prospect}}
- Interlocuteur : {{interlocuteur}}
- Objectif du rendez-vous : {{objectif_rdv}}
- Informations disponibles :
<infos>
{{infos_prospect}}
</infos>

## Ta mission
Prépare ma fiche de rendez-vous.

## Format de réponse
1. Résumé du compte en 5 lignes, uniquement à partir des informations fournies.
2. 3 hypothèses d'enjeux pour ce prospect, chacune reliée à un indice précis des informations fournies.
3. Les priorités probables de mon interlocuteur, selon son poste.
4. 8 questions de découverte selon la méthode SPIN : 2 de Situation, 2 de Problème, 2 d'Implication, 2 de Bénéfice (Need-payoff).
5. Les 3 objections les plus probables, avec une piste de réponse pour chacune.
6. L'engagement à obtenir en fin de rendez-vous : une prochaine étape concrète et datée.
7. Une phrase d'ouverture qui montre que je me suis préparé.

## Règles
- N'invente aucun fait sur l'entreprise : sépare ce qui vient des informations fournies de tes hypothèses.
- Questions ouvertes, une idée par question.`,
    resultat: "Une fiche de rendez-vous : synthèse du compte, hypothèses d'enjeux, questions de découverte SPIN, objections et prochaine étape à obtenir.",
    verifier: [
      "Chaque fait sur le prospect vient d'une source que tu as fournie, pas de l'IA.",
      "Les hypothèses sont posées comme des questions pendant le rendez-vous, pas affirmées.",
    ],
    relance: "Voici mes notes brutes du rendez-vous : [colle-les]. Rédige le compte-rendu interne et le mail de suivi.",
  },
  {
    id: "com-sequence",
    metier: "commercial",
    categorie: "redaction",
    niveau: "Essentiel",
    titre: "Séquence de prospection en 4 messages",
    resume: "Quatre messages courts sur 3 semaines : problème, valeur, preuve, clôture. Objets à tester inclus.",
    tags: ["prospection", "cold email", "linkedin", "séquence", "outbound"],
    prompt: `Tu es expert en prospection B2B. Tu écris des messages courts, personnalisables, qui obtiennent des réponses sans forcer.

## Contexte
- Mon offre : {{activite}}
- Cible : {{cible}}
- Preuve disponible : {{preuve}}
- Raison de contacter maintenant : {{declencheur}}
- Canaux : {{canaux}}

## Ta mission
Écris une séquence de 4 messages étalés sur 3 semaines.

## Méthode
- Message 1 : personnalisé, centré sur le problème du prospect, une seule question à la fin.
- Message 2 (3 jours plus tard) : apporte de la valeur sans rien demander (idée, constat, ressource).
- Message 3 (8 jours plus tard) : la preuve, racontée comme une histoire courte (situation, action, résultat).
- Message 4 (15 jours plus tard) : message de clôture, poli, qui laisse la porte ouverte.

## Format de réponse
Pour chaque message : canal, délai, objet (si email, 5 mots max), texte (90 mots max), et la ligne à personnaliser pour chaque prospect, signalée par [PERSO].
Puis 3 variantes d'objet pour le message 1, à tester.

## Règles
- Aucune formule creuse : « J'espère que vous allez bien », « Je me permets de », « solution innovante ».
- Un seul appel à l'action par message, facile à accepter (une réponse, pas un rendez-vous d'une heure).
- N'invente aucun résultat client : utilise uniquement la preuve fournie.`,
    resultat: "4 messages de prospection courts, à personnaliser, avec les délais d'envoi et des objets à tester.",
    verifier: [
      "En B2B, la prospection par email doit respecter le RGPD : message en rapport avec la fonction de la personne et possibilité de se désinscrire.",
      "La preuve citée est vérifiable et ton client accepte d'être mentionné.",
      "Chaque message passe le test : tu le lirais jusqu'au bout si tu le recevais.",
    ],
    relance: "Le prospect a répondu : [colle sa réponse]. Écris la réponse qui fait avancer vers un rendez-vous sans le brusquer.",
  },
  {
    id: "com-objections",
    metier: "commercial",
    categorie: "relation",
    niveau: "Essentiel",
    titre: "Traiter les objections",
    resume: "Ce que cache chaque objection et le dialogue type pour y répondre, réplique par réplique.",
    tags: ["objections", "négociation", "prix", "closing", "argumentaire"],
    prompt: `Tu es formateur en négociation commerciale. Tu sais qu'une objection est souvent une question mal posée ou un besoin de réassurance.

## Contexte
- Mon offre : {{activite}}
- Prix : {{prix}}
- Ce qui me différencie : {{differenciation}}
- Objections entendues :
<objections>
{{objections}}
</objections>

## Ta mission
Pour chaque objection, prépare une réponse avec la méthode suivante :
1. Accueillir : montrer que l'objection est légitime, sans l'approuver.
2. Creuser : une question pour comprendre ce qu'il y a derrière.
3. Reformuler : vérifier qu'on a compris le vrai frein.
4. Répondre : un argument relié au besoin du client, avec une preuve si possible.
5. Valider : une question qui vérifie que le frein est levé.

## Format de réponse
Pour chaque objection :
- Ce qu'elle cache le plus souvent (2 ou 3 possibilités)
- Le dialogue type, réplique par réplique
- Ce qu'il ne faut pas dire

Termine par les objections qui signalent un prospect à ne pas poursuivre.

## Règles
- Ton naturel, à l'oral : aucune technique de manipulation, aucune fausse urgence.
- Si une objection révèle une vraie faiblesse de l'offre, dis-le franchement.`,
    resultat: "Un guide de réponse aux objections, dialogue par dialogue, avec ce qui se cache derrière chacune.",
    verifier: [
      "Les arguments correspondent à ce que ton offre fait réellement.",
      "Les dialogues sonnent comme toi : relis-les à voix haute et adapte les formulations.",
    ],
    relance: "Joue un prospect difficile qui m'oppose : « [objection] ». Je te réponds, puis tu me fais un retour précis sur ma réponse.",
  },
  {
    id: "com-compte-rendu",
    metier: "commercial",
    categorie: "redaction",
    niveau: "Essentiel",
    titre: "Compte-rendu et mail de suivi",
    resume: "Tes notes brutes transformées en compte-rendu pour le CRM et en mail de suivi envoyé dans la journée.",
    tags: ["compte-rendu", "suivi", "crm", "mail", "rendez-vous"],
    prompt: `Tu es commercial B2B rigoureux. Après chaque rendez-vous, tu envoies un suivi clair dans les 24 heures.

## Contexte
- Prospect : {{prospect}}
- Prochaine étape convenue : {{prochaine_etape}}
- Notes brutes :
<notes>
{{notes_rdv}}
</notes>

## Ta mission
1. Rédige le compte-rendu interne.
2. Rédige le mail de suivi au prospect.

## Format de réponse
**Compte-rendu interne**
- Contexte et enjeux exprimés par le client (ses mots entre guillemets quand c'est possible)
- Critères de décision, processus de décision, budget et calendrier (ou « inconnu »)
- Personnes impliquées dans la décision
- Points de vigilance et objections
- Prochaines étapes : action | responsable | date
- Température de l'opportunité (chaude, tiède, froide) et pourquoi

**Mail de suivi** (150 mots max)
- Un remerciement bref
- Ce que j'ai compris de ses enjeux, en 3 points
- Les prochaines étapes, avec dates
- Une question ou un engagement pour garder l'élan

## Règles
- N'ajoute aucune information absente des notes : écris « non abordé » si besoin.
- Le mail reprend le vocabulaire du client, pas le mien.`,
    resultat: "Un compte-rendu prêt à coller dans ton CRM et un mail de suivi qui reformule les enjeux du client.",
    verifier: [
      "Rien dans le mail n'engage ton entreprise au-delà de ce qui a été dit.",
      "Les dates et les noms sont exacts.",
    ],
    relance: "Transforme ce compte-rendu en plan d'action en 3 étapes à présenter au prochain rendez-vous.",
  },
  {
    id: "com-proposition",
    metier: "commercial",
    categorie: "redaction",
    niveau: "Avancé",
    titre: "Proposition commerciale",
    resume: "Une proposition centrée sur le client, avec synthèse décideur et retour sur investissement aux hypothèses visibles.",
    tags: ["proposition", "offre", "roi", "devis", "closing"],
    prompt: `Tu es responsable grands comptes. Tu écris des propositions commerciales centrées sur le client, qu'un décideur comprend en 2 minutes.

## Contexte
- Prospect : {{prospect}}
- Enjeux exprimés :
<enjeux>
{{enjeux}}
</enjeux>
- Ma solution : {{solution}}
- Prix : {{prix}}
- Chiffres fournis par le client : {{chiffres_client}}

## Ta mission
Rédige la proposition commerciale.

## Format de réponse
1. Synthèse pour le décideur (5 lignes) : situation, enjeu, solution, résultat attendu, investissement.
2. Votre situation : les enjeux reformulés avec les mots du client.
3. Notre proposition : chaque composante reliée à un enjeu précis.
4. Retour sur investissement : calcul fondé uniquement sur les chiffres fournis, hypothèses écrites, et une version prudente.
5. Déroulé et calendrier.
6. Investissement et conditions.
7. Pourquoi nous : 3 éléments différenciants vérifiables.
8. Prochaines étapes pour démarrer.

## Règles
- Si un chiffre manque pour calculer le retour sur investissement, n'invente rien : indique la donnée à demander au client.
- Phrases courtes, sans jargon.
- Chaque affirmation sur les résultats doit pouvoir être prouvée.`,
    resultat: "Une proposition commerciale complète, avec une synthèse pour le décideur et un retour sur investissement aux hypothèses visibles.",
    verifier: [
      "Refais le calcul du retour sur investissement : les hypothèses sont réalistes.",
      "Le prix, les conditions et le calendrier sont tenables par ton entreprise.",
      "Aucune référence client n'est citée sans son accord.",
    ],
    relance: "Écris une version d'une page de cette proposition, pour le décideur qui n'a pas assisté au rendez-vous.",
  },
  {
    id: "com-pipeline",
    metier: "commercial",
    categorie: "analyse",
    niveau: "Avancé",
    titre: "Revue de pipeline et priorités de la semaine",
    resume: "Pipeline pondéré, opportunités à risque et les 5 actions qui comptent cette semaine.",
    tags: ["pipeline", "forecast", "crm", "priorités", "management commercial"],
    prompt: `Tu es directeur commercial. Tu fais la revue de pipeline d'un commercial, avec exigence et bienveillance.

## Contexte
- Objectif de la période : {{objectif_ca}}
- Pipeline :
<pipeline>
{{pipeline}}
</pipeline>

## Ta mission
1. Calcule le montant total du pipeline et un montant pondéré par étape (indique les pourcentages utilisés et propose de les ajuster).
2. Compare-le à l'objectif : écart et taux de couverture.
3. Repère les opportunités à risque : aucune action depuis plus de 14 jours, date de décision dépassée, prochaine étape floue.
4. Classe les opportunités en 3 groupes : à accélérer, à requalifier, à abandonner.

## Format de réponse
- Synthèse : total, pondéré, objectif, écart.
- Tableau : Client | Montant | Étape | Risque | Action précise cette semaine.
- Les 5 actions prioritaires de la semaine, par ordre d'impact.
- Ce qu'il faut pour combler l'écart : nombre d'opportunités à créer, calculé à partir du montant moyen du pipeline.

## Règles
- Calculs visibles et vérifiables.
- Ne suppose pas la date du jour : utilise celle que je fournis, sinon demande-la.`,
    resultat: "Une revue de pipeline chiffrée, les opportunités à risque et un plan d'action priorisé pour la semaine.",
    verifier: [
      "Le total et le montant pondéré correspondent à ton CRM.",
      "Les pourcentages de pondération reflètent ton taux de conversion réel par étape.",
    ],
    relance: "Prends l'opportunité [client] et prépare le message ou l'appel qui débloque la prochaine étape.",
  },
];
