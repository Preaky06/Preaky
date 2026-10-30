// Maison fictive pour découvrir l'application. Les dates sont calculées par rapport au jour
// d'ouverture : les relevés suivent deux étés secs, et l'arrêté vient d'être publié.
const P = { repere: true, cadrage: true, jauge: true };

function serie(today, iso, addDays, prefix, points) {
  return points.map(([jours, largeur, extra = {}], i) => ({
    id: `${prefix}${i}`,
    date: iso(addDays(today, jours)),
    largeur,
    longueur: extra.longueur ?? null,
    photo: extra.photo ? `url:img/${extra.photo}.svg` : null,
    note: extra.note || "",
    protocole: extra.protocole || P,
  }));
}

export function EXEMPLE(today, iso, addDays) {
  return {
    version: 1,
    exemple: true,
    commence: false,
    house: {
      nom: "Maison de démonstration",
      commune: "Commune fictive",
      adresse: "12 rue des Tilleuls",
      debut: iso(addDays(today, -510)),
      assureur: "Assureur de démonstration",
      contrat: "EX-0000",
    },
    commune: {
      signalement: iso(addDays(today, -390)),
      demande: iso(addDays(today, -351)),
      arrete: iso(addDays(today, -8)),
      arreteRef: "arrêté interministériel (exemple)",
    },
    cracks: [
      {
        id: "salon",
        nom: "Mur du salon",
        lieu: "Mur nord, au-dessus de la porte-fenêtre",
        type: "interieur",
        mesures: serie(today, iso, addDays, "s", [
          [-505, 0.2, { longueur: 32, photo: "crack-1", note: "Première fissure repérée en passant l'aspirateur" }],
          [-491, 0.25, { longueur: 34 }],
          [-477, 0.3, { longueur: 36 }],
          [-463, 0.35, { longueur: 38 }],
          [-449, 0.45, { longueur: 41, note: "La porte du salon frotte depuis une semaine" }],
          [-435, 0.5, { longueur: 43, photo: "crack-2" }],
          [-421, 0.6, { longueur: 46 }],
          [-407, 0.75, { longueur: 50 }],
          [-395, 0.9, { longueur: 55, photo: "crack-3", note: "Nouvelle branche vers la plinthe" }],
          [-367, 0.85, { longueur: 55, note: "Pluies depuis trois jours : la fissure se referme un peu" }],
          [-334, 0.8, { longueur: 55 }],
          [-288, 0.7, { longueur: 55 }],
          [-234, 0.7, { longueur: 55 }],
          [-163, 0.75, { longueur: 56 }],
          [-135, 0.85, { longueur: 58 }],
          [-107, 1.0, { longueur: 61 }],
          [-79, 1.15, { longueur: 64 }],
          [-51, 1.25, { longueur: 66 }],
          [-23, 1.3, { longueur: 67, photo: "crack-3" }],
          [-6, 1.3, { longueur: 67 }],
        ]),
      },
      {
        id: "facade",
        nom: "Façade nord",
        lieu: "Fissure en escalier, angle de la fenêtre de la cuisine",
        type: "exterieur",
        mesures: serie(today, iso, addDays, "f", [
          [-500, 0.5, { longueur: 85, photo: "crack-2" }],
          [-470, 0.6, { longueur: 88 }],
          [-440, 0.8, { longueur: 95 }],
          [-410, 1.0, { longueur: 104 }],
          [-380, 1.1, { longueur: 108, photo: "crack-3" }],
          [-320, 1.0, { longueur: 108 }],
          [-240, 0.95, { longueur: 108, protocole: { repere: true, cadrage: false, jauge: true } }],
          [-150, 1.05, { longueur: 110 }],
          [-90, 1.3, { longueur: 115 }],
          [-45, 1.5, { longueur: 119 }],
          [-10, 1.6, { longueur: 121, photo: "crack-3" }],
        ]),
      },
      {
        id: "entree",
        nom: "Carrelage de l'entrée",
        lieu: "Joint fendu entre deux carreaux, près de la porte",
        type: "interieur",
        mesures: serie(today, iso, addDays, "e", [
          [-400, 0.1, { longueur: 20 }],
          [-300, 0.1, { longueur: 20 }],
          [-200, 0.15, { longueur: 22 }],
          [-100, 0.15, { longueur: 22 }],
          [-20, 0.15, { longueur: 22, photo: "crack-1" }],
        ]),
      },
    ],
  };
}
