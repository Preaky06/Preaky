// Secteurs proposés à l'utilisateur → codes NAF (nomenclature INSEE) ou sections.
// Partagé client/serveur.
export interface Sector {
  id: string;
  label: string;
  naf?: string[];
  sections?: string[];
}

export const SECTORS: Sector[] = [
  { id: 'marketing', label: 'Marketing et communication', naf: ['73.11Z', '73.12Z', '70.21Z', '74.10Z', '59.11B', '58.19Z'] },
  { id: 'immobilier', label: 'Immobilier', naf: ['68.31Z', '68.10Z', '68.20A', '68.20B', '68.32A', '41.10A'] },
  { id: 'hotellerie', label: 'Hôtellerie', naf: ['55.10Z', '55.20Z', '55.30Z', '55.90Z'] },
  { id: 'restauration', label: 'Restauration', naf: ['56.10A', '56.10B', '56.10C', '56.21Z', '56.29A', '56.29B', '56.30Z'] },
  { id: 'bijouterie', label: 'Bijouterie et horlogerie', naf: ['47.77Z', '32.12Z', '32.13Z', '46.48Z', '95.25Z'] },
  { id: 'automobile', label: 'Automobile', naf: ['45.11Z', '45.19Z', '45.20A', '45.20B', '45.31Z', '45.32Z', '45.40Z', '77.11A'] },
  { id: 'sante', label: 'Santé et bien-être', naf: ['86.21Z', '86.22A', '86.22B', '86.22C', '86.23Z', '86.90A', '86.90D', '86.90E', '86.90F', '96.02A', '96.02B', '96.04Z', '93.13Z', '47.73Z', '47.74Z'] },
  { id: 'commerce', label: 'Commerce', sections: ['G'] },
  { id: 'technologie', label: 'Technologie', naf: ['62.01Z', '62.02A', '62.02B', '62.03Z', '62.09Z', '63.11Z', '63.12Z', '58.29A', '58.29C'] },
  { id: 'tourisme', label: 'Tourisme', naf: ['79.11Z', '79.12Z', '79.90Z', '55.30Z', '93.21Z', '93.29Z', '49.39C'] },
  { id: 'industrie', label: 'Industrie', sections: ['C'] },
  { id: 'services', label: 'Services professionnels', naf: ['69.10Z', '69.20Z', '70.22Z', '71.11Z', '71.12A', '71.12B', '74.20Z', '74.90B', '78.10Z', '82.11Z'] },
  { id: 'btp', label: 'Bâtiment et artisanat', sections: ['F'] },
  { id: 'autres', label: 'Autres secteurs' },
];

export const sectorById = (id: string) => SECTORS.find((s) => s.id === id);

export function sectorOfNaf(naf: string | null | undefined, section?: string | null): Sector | null {
  if (!naf && !section) return null;
  return SECTORS.find((s) => (naf && s.naf?.includes(naf)) || (section && s.sections?.includes(section))) || null;
}

// Tranches d'effectif salarié (INSEE)
export const EMPLOYEE_RANGES: Record<string, { label: string; min: number; max: number }> = {
  NN: { label: 'Non employeuse', min: 0, max: 0 },
  '00': { label: '0 salarié', min: 0, max: 0 },
  '01': { label: '1 à 2 salariés', min: 1, max: 2 },
  '02': { label: '3 à 5 salariés', min: 3, max: 5 },
  '03': { label: '6 à 9 salariés', min: 6, max: 9 },
  '11': { label: '10 à 19 salariés', min: 10, max: 19 },
  '12': { label: '20 à 49 salariés', min: 20, max: 49 },
  '21': { label: '50 à 99 salariés', min: 50, max: 99 },
  '22': { label: '100 à 199 salariés', min: 100, max: 199 },
  '31': { label: '200 à 249 salariés', min: 200, max: 249 },
  '32': { label: '250 à 499 salariés', min: 250, max: 499 },
  '41': { label: '500 à 999 salariés', min: 500, max: 999 },
  '42': { label: '1 000 à 1 999 salariés', min: 1000, max: 1999 },
  '51': { label: '2 000 à 4 999 salariés', min: 2000, max: 4999 },
  '52': { label: '5 000 à 9 999 salariés', min: 5000, max: 9999 },
  '53': { label: '10 000 salariés et plus', min: 10000, max: 1e9 },
};

// Tailles proposées dans les filtres → tranches INSEE
export const SIZES = [
  { id: 'independant', label: 'Indépendant (sans salarié)', ranges: ['NN', '00'] },
  { id: 'tpe', label: 'TPE (1 à 9 salariés)', ranges: ['01', '02', '03'] },
  { id: 'pe', label: 'Petite entreprise (10 à 49)', ranges: ['11', '12'] },
  { id: 'me', label: 'Moyenne entreprise (50 à 249)', ranges: ['21', '22', '31'] },
  { id: 'ge', label: 'Grande entreprise (250 et plus)', ranges: ['32', '41', '42', '51', '52', '53'] },
];

export const sizeOfRange = (range: string | null | undefined) => SIZES.find((s) => range && s.ranges.includes(range)) || null;

// Libellés des codes NAF les plus fréquents parmi les secteurs proposés (les autres affichent le code)
export const NAF_LABELS: Record<string, string> = {
  '73.11Z': 'Activités des agences de publicité',
  '73.12Z': 'Régie publicitaire de médias',
  '70.21Z': 'Conseil en relations publiques et communication',
  '74.10Z': 'Activités spécialisées de design',
  '68.31Z': 'Agences immobilières',
  '68.10Z': 'Activités des marchands de biens immobiliers',
  '68.20A': 'Location de logements',
  '68.20B': 'Location de terrains et d’autres biens immobiliers',
  '68.32A': 'Administration d’immeubles et autres biens immobiliers',
  '55.10Z': 'Hôtels et hébergement similaire',
  '55.20Z': 'Hébergement touristique et autre hébergement de courte durée',
  '55.30Z': 'Terrains de camping et parcs pour caravanes',
  '56.10A': 'Restauration traditionnelle',
  '56.10B': 'Cafétérias et autres libres-services',
  '56.10C': 'Restauration de type rapide',
  '56.21Z': 'Services des traiteurs',
  '56.30Z': 'Débits de boissons',
  '47.77Z': 'Commerce de détail d’articles d’horlogerie et de bijouterie',
  '32.12Z': 'Fabrication d’articles de joaillerie et bijouterie',
  '32.13Z': 'Fabrication d’articles de bijouterie fantaisie',
  '46.48Z': 'Commerce de gros d’articles d’horlogerie et de bijouterie',
  '45.11Z': 'Commerce de voitures et de véhicules automobiles légers',
  '45.20A': 'Entretien et réparation de véhicules automobiles légers',
  '45.20B': 'Entretien et réparation d’autres véhicules automobiles',
  '86.21Z': 'Activité des médecins généralistes',
  '86.23Z': 'Pratique dentaire',
  '86.90E': 'Activités des professionnels de la rééducation',
  '96.02A': 'Coiffure',
  '96.02B': 'Soins de beauté',
  '96.04Z': 'Entretien corporel',
  '93.13Z': 'Activités des centres de culture physique',
  '47.73Z': 'Commerce de détail de produits pharmaceutiques',
  '62.01Z': 'Programmation informatique',
  '62.02A': 'Conseil en systèmes et logiciels informatiques',
  '62.09Z': 'Autres activités informatiques',
  '63.11Z': 'Traitement de données, hébergement',
  '79.11Z': 'Activités des agences de voyage',
  '79.90Z': 'Autres services de réservation',
  '69.10Z': 'Activités juridiques',
  '69.20Z': 'Activités comptables',
  '70.22Z': 'Conseil pour les affaires et autres conseils de gestion',
  '71.11Z': 'Activités d’architecture',
  '71.12B': 'Ingénierie, études techniques',
  '74.20Z': 'Activités photographiques',
  '47.71Z': 'Commerce de détail d’habillement',
  '47.76Z': 'Commerce de détail de fleurs et plantes',
  '10.71C': 'Boulangerie et boulangerie-pâtisserie',
  '43.21A': 'Travaux d’installation électrique',
  '43.22A': 'Travaux d’installation d’eau et de gaz',
  '43.32A': 'Travaux de menuiserie bois et PVC',
  '43.34Z': 'Travaux de peinture et vitrerie',
};

export const NAF_SECTIONS: Record<string, string> = {
  A: 'Agriculture, sylviculture et pêche',
  B: 'Industries extractives',
  C: 'Industrie manufacturière',
  D: 'Énergie',
  E: 'Eau, assainissement, déchets',
  F: 'Construction',
  G: 'Commerce et réparation automobile',
  H: 'Transports et entreposage',
  I: 'Hébergement et restauration',
  J: 'Information et communication',
  K: 'Activités financières et d’assurance',
  L: 'Activités immobilières',
  M: 'Activités spécialisées, scientifiques et techniques',
  N: 'Services administratifs et de soutien',
  O: 'Administration publique',
  P: 'Enseignement',
  Q: 'Santé humaine et action sociale',
  R: 'Arts, spectacles et activités récréatives',
  S: 'Autres activités de services',
  T: 'Activités des ménages',
  U: 'Activités extra-territoriales',
};

// Services que l'utilisateur vend : servent à personnaliser le score et les messages.
export const SERVICES = [
  { id: 'site_web', label: 'Création ou refonte de site web' },
  { id: 'seo', label: 'Référencement (SEO)' },
  { id: 'reseaux_sociaux', label: 'Gestion des réseaux sociaux' },
  { id: 'publicite', label: 'Publicité en ligne' },
  { id: 'identite', label: 'Identité visuelle et branding' },
  { id: 'contenu', label: 'Photo, vidéo et contenus' },
  { id: 'reputation', label: 'Gestion des avis et de la réputation' },
  { id: 'crm', label: 'CRM, automatisation et outils commerciaux' },
  { id: 'conseil', label: 'Conseil en stratégie et développement' },
] as const;

export type ServiceId = (typeof SERVICES)[number]['id'];
export const serviceLabel = (id: string) => SERVICES.find((s) => s.id === id)?.label || id;
