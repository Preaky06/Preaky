// Repères temporels partagés par l'animation (explisite-15s.html) et la bande-son (soundtrack-15s.mjs).
// Tempo 120 BPM : un temps = 0,5 s, une mesure = 2 s. Les changements de scène tombent sur les temps.
(function (root) {
  const TL = {
    duration: 15,
    bpm: 120,
    scenes: {
      charabia: [0, 3], // jargon puis « Votre courrier parle charabia. On traduit. »
      depot: [3, 5], // le courrier tombe dans la zone de dépôt, clic sur « Expliquer »
      analyse: [5, 7], // loupe, lecture, anneau de progression
      resultat: [7, 10.5], // titre, jauge, montants, cases « À faire »
      categories: [10.5, 12], // bandeaux de documents et de langues
      tarifs: [12, 13.5], // trois formules
      logo: [13.5, 15], // signature
    },
    // Bruitages : temps (s) et type. La bande-son lit cette liste telle quelle.
    sfx: [
      // scène 1 : le charabia surgit mot par mot
      ...[0.05, 0.14, 0.22, 0.31, 0.38, 0.47, 0.55, 0.63, 0.7, 0.79, 0.87, 0.95, 1.04, 1.12, 1.2, 1.3].map((t) => ({ t, type: "tick" })),
      { t: 0.5, type: "thud" },
      { t: 1.0, type: "thud" },
      { t: 1.5, type: "thud" },
      { t: 1.72, type: "marker", dur: 0.3 },
      { t: 2.0, type: "clarity" },
      { t: 2.45, type: "riser", dur: 0.55 },
      { t: 3.0, type: "whooshUp" },
      // scène 2 : dépôt
      { t: 3.15, type: "whooshDown" },
      { t: 3.72, type: "drop" },
      { t: 3.95, type: "blip", note: 79 },
      { t: 4.5, type: "click" },
      { t: 4.55, type: "whoosh" },
      // scène 3 : analyse
      { t: 5.0, type: "scanStart", dur: 1.6 },
      { t: 5.1, type: "type", dur: 0.42 },
      { t: 5.6, type: "type", dur: 0.42 },
      { t: 6.1, type: "type", dur: 0.42 },
      { t: 5.25, type: "hl" },
      { t: 5.55, type: "hl" },
      { t: 5.85, type: "hl" },
      { t: 6.15, type: "hl" },
      { t: 6.6, type: "chime" },
      { t: 6.85, type: "whooshUp" },
      // scène 4 : résultat
      { t: 7.0, type: "pop", note: 72 },
      { t: 7.7, type: "gauge", dur: 0.8 },
      { t: 7.9, type: "marker", dur: 0.22 },
      { t: 8.15, type: "marker", dur: 0.18 },
      { t: 8.5, type: "whoosh" },
      { t: 8.9, type: "count", dur: 0.7 },
      { t: 9.25, type: "check", note: 76 },
      { t: 9.6, type: "check", note: 79 },
      { t: 9.95, type: "check", note: 84 },
      { t: 10.0, type: "pop", note: 88 },
      // scène 5 : catégories
      { t: 10.3, type: "whooshBig" },
      { t: 10.5, type: "pass", dur: 1.5 },
      { t: 11.0, type: "marker", dur: 0.22 },
      // scène 6 : tarifs
      { t: 11.9, type: "whoosh" },
      { t: 12.1, type: "pop", note: 72 },
      { t: 12.3, type: "pop", note: 76 },
      { t: 12.5, type: "pop", note: 79 },
      { t: 13.0, type: "riser", dur: 0.5 },
      // scène 7 : logo
      { t: 13.5, type: "impact" },
      { t: 14.0, type: "marker", dur: 0.25 },
      { t: 14.05, type: "sparkle" },
    ],
  };
  root.EXPLISITE_TIMELINE = TL;
  if (typeof module !== "undefined") module.exports = TL;
})(typeof globalThis !== "undefined" ? globalThis : window);
