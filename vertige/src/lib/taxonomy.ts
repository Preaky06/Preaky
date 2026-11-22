/**
 * Catégories racines (section 6). Seed de la table `categories` en Phase 2.
 * Ajout par rapport au cahier des charges : « economie » (PIB, dettes publiques),
 * qui n'entrait proprement dans aucune racine existante.
 */
export interface Category {
  slug: string;
  name_fr: string;
  name_en: string;
}

export const CATEGORIES: readonly Category[] = [
  { slug: "alimentation-boissons", name_fr: "Alimentation & boissons", name_en: "Food & drink" },
  { slug: "hygiene-maison", name_fr: "Hygiène & maison", name_en: "Home & hygiene" },
  { slug: "mode", name_fr: "Mode", name_en: "Fashion" },
  { slug: "montres-bijoux", name_fr: "Montres & bijoux", name_en: "Watches & jewellery" },
  { slug: "tech-electronique", name_fr: "Tech & électronique", name_en: "Tech & electronics" },
  { slug: "jeux-video", name_fr: "Jeux vidéo", name_en: "Video games" },
  { slug: "logiciels-abonnements", name_fr: "Logiciels & abonnements", name_en: "Software & subscriptions" },
  { slug: "vehicules", name_fr: "Véhicules", name_en: "Vehicles" },
  { slug: "aviation", name_fr: "Aviation", name_en: "Aviation" },
  { slug: "navires-yachts", name_fr: "Navires & yachts", name_en: "Ships & yachts" },
  { slug: "spatial", name_fr: "Spatial", name_en: "Space" },
  { slug: "immobilier", name_fr: "Immobilier", name_en: "Real estate" },
  { slug: "art-encheres", name_fr: "Art & enchères", name_en: "Art & auctions" },
  { slug: "objets-collection", name_fr: "Objets de collection", name_en: "Collectibles" },
  { slug: "matieres-premieres", name_fr: "Matières premières", name_en: "Commodities" },
  { slug: "animaux", name_fr: "Animaux", name_en: "Animals" },
  { slug: "sante", name_fr: "Santé", name_en: "Health" },
  { slug: "services", name_fr: "Services", name_en: "Services" },
  { slug: "education", name_fr: "Éducation", name_en: "Education" },
  { slug: "voyages-hotels", name_fr: "Voyages & hôtels", name_en: "Travel & hotels" },
  { slug: "sport", name_fr: "Sport", name_en: "Sport" },
  { slug: "defense", name_fr: "Défense", name_en: "Defence" },
  { slug: "infrastructures", name_fr: "Infrastructures & mégaprojets", name_en: "Infrastructure & megaprojects" },
  { slug: "entreprises", name_fr: "Entreprises", name_en: "Companies" },
  { slug: "culture", name_fr: "Culture", name_en: "Culture" },
  { slug: "energie", name_fr: "Énergie", name_en: "Energy" },
  { slug: "numerique", name_fr: "Numérique", name_en: "Digital" },
  { slug: "insolite", name_fr: "Insolite", name_en: "Oddities" },
  { slug: "economie", name_fr: "Économie", name_en: "Economy" },
] as const;

const BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

export const categoryName = (slug: string) => BY_SLUG.get(slug)?.name_fr ?? slug;
export const isCategory = (slug: string) => BY_SLUG.has(slug);
