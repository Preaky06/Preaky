// Calcul du prix de cession : méthode du pourcentage du prix de création, par mode d'exploitation.
// Il n'existe aucun barème légal : les pourcentages et coefficients ci-dessous sont des valeurs
// de départ, entièrement modifiables par l'utilisateur.

export const MODES = [
  { id: 'web', label: 'Site internet et supports numériques', hint: 'site, application, newsletter, signature e-mail', pct: 15,
    legal: 'reproduction et représentation des œuvres sur le site internet, les applications et les supports numériques édités par le Cessionnaire (pages web, lettres d’information, signatures électroniques, documents numériques)' },
  { id: 'social', label: 'Réseaux sociaux (publications organiques)', hint: 'Instagram, LinkedIn, TikTok, YouTube…', pct: 10,
    legal: 'publication des œuvres sur les comptes du Cessionnaire sur les réseaux sociaux, hors contenus sponsorisés' },
  { id: 'ads', label: 'Publicité en ligne payante', hint: 'contenus sponsorisés, bannières, moteurs de recherche', pct: 25,
    legal: 'utilisation des œuvres dans des campagnes publicitaires en ligne payantes (contenus sponsorisés, bannières, annonces sur les moteurs de recherche)' },
  { id: 'print', label: 'Imprimés de communication', hint: 'cartes de visite, papeterie, flyers, brochures', pct: 15, quantity: true,
    legal: 'reproduction des œuvres sur les imprimés de communication du Cessionnaire (cartes de visite, papeterie, flyers, brochures, catalogues)' },
  { id: 'packaging', label: 'Packaging et étiquettes', hint: 'emballages et étiquettes de produits vendus', pct: 30, quantity: true,
    legal: 'reproduction des œuvres sur les emballages, étiquettes et conditionnements des produits du Cessionnaire' },
  { id: 'signage', label: 'Signalétique, PLV et affichage', hint: 'enseigne, vitrine, affiches, kakémonos', pct: 30,
    legal: 'reproduction et représentation des œuvres sur la signalétique, l’enseigne, la publicité sur le lieu de vente et l’affichage, intérieur ou extérieur' },
  { id: 'press', label: 'Presse et publications', hint: 'annonces presse, magazines, rapports', pct: 20, quantity: true,
    legal: 'reproduction des œuvres dans des insertions presse, magazines, rapports et publications, imprimés ou numériques' },
  { id: 'audiovisual', label: 'Audiovisuel', hint: 'télévision, cinéma, vidéo en ligne', pct: 45,
    legal: 'intégration des œuvres dans des contenus audiovisuels (télévision, cinéma, vidéo en ligne) et diffusion de ces contenus' },
  { id: 'merch', label: 'Produits dérivés vendus', hint: 'textile, objets, accessoires mis en vente', pct: 40, quantity: true, proportionalHint: true,
    legal: 'reproduction des œuvres sur des produits dérivés destinés à la vente (textile, objets, accessoires)' },
  { id: 'trademark', label: 'Identité de marque', hint: 'logo utilisé comme signe distinctif de l’activité', pct: 50,
    legal: 'utilisation des œuvres comme signe distinctif de l’activité du Cessionnaire (identité de marque, enseigne, nom commercial)' },
];

export const modeById = (id) => MODES.find((m) => m.id === id);

export const TERRITORIES = {
  france: { label: 'France', factor: 1, text: 'la France (métropole et outre-mer)' },
  eu: { label: 'Union européenne', factor: 1.3, text: 'l’ensemble des États membres de l’Union européenne' },
  world: { label: 'Monde entier', factor: 1.6, text: 'le monde entier' },
};

export const DURATIONS = {
  1: { label: '1 an', years: 1, factor: 0.6 },
  3: { label: '3 ans', years: 3, factor: 0.85 },
  5: { label: '5 ans', years: 5, factor: 1 },
  10: { label: '10 ans', years: 10, factor: 1.25 },
  legal: { label: 'Durée légale', years: null, factor: 1.6 },
};

export const NON_EXCLUSIVE_FACTOR = 0.7;

export const WORK_TYPES = {
  logo: 'Logo',
  identite: 'Identité visuelle',
  illustration: 'Illustration',
  photo: 'Photographie',
  print: 'Création graphique (print)',
  web: 'Design web / interface',
  video: 'Vidéo / motion design',
  texte: 'Texte / rédaction',
  code: 'Logiciel / code',
  autre: 'Autre création',
};

const round = (n) => Math.round(n);

/**
 * input = { creationFee, modes: { [id]: { enabled, type, override, rate } }, territory, duration, exclusive, percentages? }
 * → { factor, lines: [{ id, label, type, amount, computed, rate }], total, hasProportional }
 */
export function computePrice(input) {
  const fee = Math.max(0, Number(input.creationFee) || 0);
  const t = TERRITORIES[input.territory] || TERRITORIES.france;
  const d = DURATIONS[input.duration] || DURATIONS[5];
  const factor = t.factor * d.factor * (input.exclusive === false ? NON_EXCLUSIVE_FACTOR : 1);
  const lines = [];
  for (const mode of MODES) {
    const m = input.modes?.[mode.id];
    if (!m?.enabled) continue;
    const pct = Number(input.percentages?.[mode.id] ?? mode.pct);
    const computed = round((fee * pct * factor) / 100);
    if (m.type === 'proportionnel') {
      lines.push({ id: mode.id, label: mode.label, type: 'proportionnel', amount: null, computed, rate: Number(m.rate) || 0 });
    } else {
      const override = m.override === null || m.override === undefined || m.override === '' ? null : Math.max(0, Number(m.override));
      lines.push({ id: mode.id, label: mode.label, type: 'forfait', amount: override ?? computed, computed, rate: null });
    }
  }
  const total = lines.reduce((s, l) => s + (l.amount || 0), 0);
  return { factor: Math.round(factor * 1000) / 1000, lines, total, hasProportional: lines.some((l) => l.type === 'proportionnel') };
}
