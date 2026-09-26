// Documents d'exemple (fictifs) pour tester ExpliSite sans avoir de courrier sous la main.

const d = (offset) => {
  const x = new Date(Date.now() + offset * 86400000);
  return x.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export const SAMPLES = [
  {
    id: "amende",
    label: "🚗 Amende",
    text: () => `AGENCE NATIONALE DE TRAITEMENT AUTOMATISÉ DES INFRACTIONS
AVIS DE CONTRAVENTION — Réf. 2025-7Z4-118302-45 — Date d'envoi : ${d(-6)}

Infraction : EXCÈS DE VITESSE INFÉRIEUR À 20 KM/H PAR CONDUCTEUR DE VÉHICULE À MOTEUR — VITESSE LIMITE AUTORISÉE ≤ 50 KM/H
Lieu : D2007 LYON 7E — Vitesse retenue : 58 km/h — Vitesse limite : 50 km/h
Classe : contravention de 4e classe. Retrait de 1 point du permis de conduire.

MONTANT : Amende forfaitaire minorée : 90 € si paiement dans les 15 jours (30 jours par télépaiement) suivant l'envoi du présent avis. Amende forfaitaire : 135 € au-delà et jusqu'à 45 jours. Amende forfaitaire majorée : 375 € à défaut de paiement ou de requête en exonération dans le délai de 45 jours.

Le titulaire du certificat d'immatriculation qui n'était pas le conducteur au moment des faits doit, dans un délai de 45 jours, désigner le conducteur via le formulaire de requête en exonération (cas n° 1) ou sur www.antai.gouv.fr, faute de quoi, s'il s'agit d'une personne morale, une amende pour non-désignation pourra être encourue. Le paiement de l'amende entraîne la reconnaissance de la réalité de l'infraction et la réduction de plein droit du nombre de points.`,
  },
  {
    id: "impots",
    label: "🧾 Impôts",
    text: () => `DIRECTION GÉNÉRALE DES FINANCES PUBLIQUES — SIP Paris 11e
Avis de mise en recouvrement n° 2025-11-004871 — Émis le ${d(-3)}

Objet : Impôt sur le revenu 2024 — Majoration pour paiement tardif.

Madame, Monsieur,
En application des dispositions de l'article L. 256 du Livre des procédures fiscales, et à défaut de règlement de l'imposition primitive (1 842,00 €) à la date limite de paiement, une majoration de 10 % prévue à l'article 1730 du Code général des impôts a été appliquée, soit 184,00 €.
Montant restant dû : 2 026,00 €.
Vous disposez, à compter de la notification du présent avis, d'un délai de trente jours pour vous acquitter des sommes restant dues ou formuler une réclamation contentieuse assortie, le cas échéant, d'une demande de sursis de paiement conformément à l'article L. 277 du LPF. À défaut, il sera procédé au recouvrement forcé, notamment par voie de saisie administrative à tiers détenteur.
Une demande de remise gracieuse de la majoration peut être formulée auprès du service. Des délais de paiement peuvent être accordés en cas de difficultés.
Contact : messagerie sécurisée de votre espace impots.gouv.fr — Tél. 0 809 401 401 (service gratuit + prix appel). N° fiscal : 12 34 567 890 123.`,
  },
  {
    id: "caf",
    label: "🏠 CAF",
    text: () => `Caisse d'allocations familiales du Rhône — Courrier du ${d(-8)}
N° allocataire : 4412987 C

Objet : Notification d'indu — Aide personnalisée au logement

Suite à la révision de votre dossier, consécutive à la déclaration trimestrielle de ressources, nous constatons que vous avez perçu à tort la somme de 612,00 € au titre de l'aide personnalisée au logement pour la période de mars à août.
Ce trop-perçu sera récupéré par retenue sur vos prestations à venir à hauteur de 68,00 € par mois à compter du mois prochain, sauf remboursement en une seule fois ou proposition d'échéancier de votre part.
Si vous contestez cette décision, vous pouvez saisir la Commission de recours amiable dans un délai de deux mois à compter de la réception de ce courrier, par écrit ou depuis votre espace Mon Compte sur caf.fr. En cas de difficultés financières, vous pouvez solliciter une remise de dette auprès de nos services.`,
  },
  {
    id: "contrat",
    label: "🏋️ Abonnement",
    text: () => `CONDITIONS GÉNÉRALES D'ABONNEMENT — FITZONE CLUBS SAS — Version signée le ${d(-340)}

Article 4 — Durée. L'abonnement « Premium Flex » est souscrit pour une durée initiale ferme et irrévocable de douze (12) mois à compter de la date de signature. À l'issue de cette période, il est reconduit tacitement par périodes successives de douze (12) mois, sauf dénonciation par l'une des parties par lettre recommandée avec accusé de réception adressée au plus tard trente (30) jours avant la date d'échéance.
Article 5 — Prix. Le prix mensuel est de 39,90 € TTC, prélevé le 5 de chaque mois. Des frais d'inscription de 49 € et des frais annuels de maintenance des équipements de 29 € sont dus à chaque date anniversaire.
Article 7 — Résiliation anticipée. Aucune résiliation anticipée ne pourra intervenir pendant la période ferme, hors motif légitime dûment justifié (mutation professionnelle à plus de 50 km, incapacité médicale supérieure à trois mois). Toute résiliation anticipée hors motif légitime entraîne l'exigibilité immédiate des mensualités restant à courir.
Article 9 — Suspension. L'abonnement peut être suspendu pour une durée maximale de 3 mois par an moyennant des frais de 15 €.`,
  },
  {
    id: "sante",
    label: "🩸 Prise de sang",
    text: () => `LABORATOIRE BIOLAB CENTRE — Compte rendu d'analyses — Prélèvement du ${d(-2)}
Patient(e) : [NOM] — Né(e) le 14/05/1987 — Prescripteur : Dr Martin

HÉMATOLOGIE
Hémoglobine ........ 11,4 g/dL  (12,0 – 16,0)  ↓
VGM ................ 76 fL      (80 – 100)     ↓
Plaquettes ......... 285 G/L    (150 – 400)

BIOCHIMIE
Ferritine .......... 8 µg/L     (15 – 150)     ↓
Glycémie à jeun .... 0,94 g/L   (0,70 – 1,10)
Cholestérol total .. 2,31 g/L   (< 2,00)       ↑
LDL-cholestérol .... 1,62 g/L   (< 1,60)       ↑
HDL-cholestérol .... 0,58 g/L   (> 0,40)
TSH ................ 2,1 mUI/L  (0,4 – 4,0)

Conclusion biologique : anémie microcytaire avec carence martiale. Hypercholestérolémie modérée à LDL. Résultats à interpréter par le médecin prescripteur en fonction du contexte clinique.`,
  },
];
