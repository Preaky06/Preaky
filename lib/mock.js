// Mode démo : utilisé automatiquement quand aucune clé API n'est configurée.
// Simule le flux de l'analyse pour que l'interface soit testable de bout en bout.
// Le résultat est clairement marqué comme fictif côté interface.

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const THOUGHTS = [
  "Je repère l'en-tête : il s'agit d'un courrier de régularisation de charges envoyé par le bailleur. ",
  "Le décompte compare les provisions versées (1 080 €) aux charges réelles de l'année (1 327,40 €). ",
  "La différence, 247,40 €, est à payer. Je cherche la date limite de paiement… ",
  "Le courrier indique un règlement sous 30 jours. Je vérifie aussi si le détail des charges est joint, ",
  "car la loi impose de tenir les justificatifs à disposition du locataire pendant 6 mois. ",
  "Je note l'augmentation de la provision mensuelle, de 90 € à 110 €, à partir du mois prochain. ",
  "Je prépare une réponse type pour demander les justificatifs et un échéancier.",
];

export async function mockAnalysis(send, isClosed) {
  send("phase", { phase: "thinking" });
  for (const t of THOUGHTS) {
    if (isClosed()) return;
    for (const word of t.split(/(?<= )/)) {
      send("thinking", { text: word });
      await wait(35);
    }
    await wait(200);
  }
  send("phase", { phase: "writing" });
  for (let c = 0; c <= 4200; c += 300) {
    if (isClosed()) return;
    send("progress", { chars: c });
    await wait(90);
  }
  send("result", { result: demoResult(), model: "démo", demo: true });
}

const SERVER_HINT = "Ajoutez ANTHROPIC_API_KEY dans le fichier .env du serveur pour activer les vraies réponses.";

export async function mockAnswer(send, isClosed, question, hint = SERVER_HINT) {
  const text =
    `**Mode démo** — cette réponse est un exemple.\n\n` +
    `Vous avez demandé : « ${question} »\n\n` +
    `En fonctionnement normal, ExpliSite lirait votre document et répondrait précisément, par exemple :\n` +
    `- ce que vous risquez si vous ne payez pas à temps\n` +
    `- comment demander un échéancier\n` +
    `- quels justificatifs réclamer\n\n` +
    hint;
  for (const word of text.split(/(?<= )/)) {
    if (isClosed()) return;
    send("delta", { text: word });
    await wait(25);
  }
  send("done", {});
}

function demoResult() {
  return {
    title: "Régularisation annuelle des charges locatives",
    document_type: "logement",
    issuer: "Cabinet Delaunay Gestion (votre propriétaire)",
    document_date: inDays(-4),
    plain_summary:
      "Vous avez payé moins de charges que ce que votre logement a réellement coûté cette année : votre propriétaire vous réclame 247,40 € et augmente votre provision mensuelle de 20 €.",
    urgency: "medium",
    urgency_reason: "Un paiement est demandé sous 30 jours, mais vous avez le droit de vérifier les justificatifs avant.",
    key_points: [
      "Vous avez versé 1 080 € de provisions sur l'année.",
      "Les charges réelles s'élèvent à 1 327,40 €.",
      "Il reste 247,40 € à payer.",
      "Votre provision passe de 90 € à 110 € par mois dès le mois prochain.",
      "Le chauffage collectif représente 61 % de la hausse.",
    ],
    actions: [
      { task: "Demandez le détail des justificatifs de charges", detail: "Vous y avez droit pendant 6 mois. Utilisez la réponse prête ci-dessous.", deadline: inDays(10), priority: "high" },
      { task: "Payez 247,40 € ou demandez un échéancier", detail: "Si le montant vous met en difficulté, un paiement en plusieurs fois peut être demandé par écrit.", deadline: inDays(26), priority: "high" },
      { task: "Ajustez votre virement mensuel à 110 €", detail: "Modifiez le virement permanent dans votre application bancaire.", deadline: inDays(35), priority: "medium" },
    ],
    deadlines: [
      { date: inDays(26), label: "Date limite de paiement du solde", consequence: "Le propriétaire peut envoyer une relance puis engager une procédure de recouvrement." },
      { date: inDays(35), label: "Première mensualité à 110 €", consequence: "" },
      { date: inDays(176), label: "Fin du délai pour consulter les justificatifs", consequence: "Au-delà, il devient plus difficile de contester." },
    ],
    amounts: [
      { label: "Solde de charges à payer", amount: 247.4, currency: "EUR", direction: "to_pay" },
      { label: "Charges réelles de l'année", amount: 1327.4, currency: "EUR", direction: "info" },
      { label: "Nouvelle provision mensuelle", amount: 110, currency: "EUR", direction: "to_pay" },
    ],
    warnings: [
      "La taxe d'enlèvement des ordures ménagères est comptée deux fois dans le décompte (lignes 4 et 9) : vérifiez.",
      "Les frais de gestion du syndic ne sont pas des charges récupérables sur le locataire.",
    ],
    rights: [
      "Consulter gratuitement les justificatifs pendant 6 mois (loi du 6 juillet 1989, art. 23).",
      "Si la régularisation arrive plus d'un an après la fin de l'exercice, demander un paiement étalé sur 12 mois.",
      "Contester auprès de la commission départementale de conciliation, gratuitement.",
    ],
    glossary: [
      { term: "Provision pour charges", definition: "Avance mensuelle que vous payez en plus du loyer pour couvrir les charges de l'immeuble." },
      { term: "Régularisation", definition: "Le calcul de fin d'année qui compare vos avances aux dépenses réelles." },
      { term: "Charges récupérables", definition: "Les seules dépenses que le propriétaire a le droit de vous refacturer." },
      { term: "TEOM", definition: "Taxe d'enlèvement des ordures ménagères, payée par le propriétaire puis refacturée au locataire." },
    ],
    contacts: [
      { kind: "phone", label: "Service locataires", value: "01 23 45 67 89" },
      { kind: "email", label: "Gestionnaire du dossier", value: "locataires@delaunay-gestion.example" },
      { kind: "reference", label: "Référence locataire", value: "LOC-2025-48213" },
    ],
    reply_draft: {
      needed: true,
      subject: "Régularisation des charges — demande de justificatifs (réf. LOC-2025-48213)",
      body:
        "Madame, Monsieur,\n\nJ'accuse réception de votre courrier de régularisation des charges locatives, qui fait apparaître un solde de 247,40 € à ma charge.\n\nConformément à l'article 23 de la loi du 6 juillet 1989, je vous remercie de bien vouloir tenir à ma disposition les pièces justificatives de ces charges, et de m'indiquer les modalités de consultation.\n\nJ'attire par ailleurs votre attention sur le fait que la taxe d'enlèvement des ordures ménagères semble figurer deux fois dans le décompte (lignes 4 et 9).\n\nDans l'attente de ces éléments, je vous prie d'agréer, Madame, Monsieur, mes salutations distinguées.\n\n[Prénom Nom]\n[Adresse du logement]",
    },
    suggested_questions: [
      "Que se passe-t-il si je ne paie pas dans les 30 jours ?",
      "Comment vérifier que les charges sont bien récupérables ?",
      "Puis-je payer en plusieurs fois ?",
    ],
    readability: "good",
    professional_advice: "",
  };
}
