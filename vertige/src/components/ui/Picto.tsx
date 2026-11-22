import {
  Anchor, Apple, Atom, Banknote, Bean, Bike, Bone, BookOpen, Bot, Building2, Camera, Candy, Car, CarFront,
  ChartLine, Cigarette, Citrus, Clapperboard, Cloud, Coffee, Coins, Cookie, Croissant, Crown, Dices, Droplet,
  Egg, Euro, Factory, Footprints, Fuel, Gamepad2, Gem, Globe, GraduationCap, Handshake, Headphones, Heart,
  Helicopter, House, IdCard, KeyRound, Landmark, Laptop, Mail, Medal, Megaphone, MessageSquare, Music, Package,
  Paperclip, PawPrint, Piano, Pizza, Plane, Printer, Rocket, Sailboat, Sandwich, Satellite, Scissors,
  Shield, Ship, ShoppingBag, Smartphone, Smile, Sparkles, SquareParking, Stamp, Stethoscope, Telescope,
  TrainFront, Tractor, Trophy, Tv, Utensils, Watch, WashingMachine, Wheat, Wine, Zap,
  type LucideIcon, Battery, CloudFog, Building, Briefcase, Bus, Shirt, Film, Sprout, Scroll, Volleyball,
} from "lucide-react";
import { createElement } from "react";
import { cn } from "@/lib/utils";
import type { TierId } from "@/lib/tiers";

/**
 * Pictogrammes par sous-catégorie (Lucide, trait 1,5).
 * Phase 1 : correspondance sur Lucide. Le set unifié d'environ 150 pictos maison
 * remplacera cette table sans changer l'API du composant.
 */
const BY_SUBCATEGORY: Record<string, LucideIcon> = {
  cereales: Wheat,
  legumineuses: Bean,
  legumes: Sprout,
  pates: Utensils,
  epices: Sparkles,
  "cafe-the": Coffee,
  eau: Droplet,
  sucre: Candy,
  fruits: Citrus,
  boulangerie: Croissant,
  oeufs: Egg,
  chocolat: Cookie,
  "restauration-rapide": Sandwich,
  pizza: Pizza,
  "boissons-alcoolisees": Wine,
  tabac: Cigarette,
  papier: Scroll,
  papeterie: Paperclip,
  accessoires: Sparkles,
  electromenager: WashingMachine,
  electricite: Zap,
  carbone: CloudFog,
  carburant: Fuel,
  centrales: Factory,
  fusion: Atom,
  "metaux-precieux": Coins,
  crypto: Coins,
  "stockage-cloud": Cloud,
  telecom: MessageSquare,
  emailing: Mail,
  publicite: Megaphone,
  musique: Music,
  "streaming-musique": Headphones,
  "streaming-video": Tv,
  impression: Printer,
  poste: Stamp,
  "transport-urbain": TrainFront,
  stationnement: SquareParking,
  coiffure: Scissors,
  evenements: Heart,
  consultations: Stethoscope,
  dentaire: Smile,
  prevention: Shield,
  piles: Battery,
  cinema: Clapperboard,
  films: Film,
  "publicite-tv": Tv,
  "jeux-de-societe": Dices,
  instruments: Piano,
  jeux: Gamepad2,
  consoles: Gamepad2,
  audio: Headphones,
  smartphones: Smartphone,
  ordinateurs: Laptop,
  television: Tv,
  photo: Camera,
  robots: Bot,
  chaussures: Footprints,
  maroquinerie: ShoppingBag,
  vetements: Shirt,
  montres: Watch,
  diamants: Gem,
  "billets-avion": Plane,
  location: KeyRound,
  appartements: Building2,
  maisons: House,
  permis: IdCard,
  ecoles: GraduationCap,
  formations: GraduationCap,
  velos: Bike,
  "deux-roues": Bike,
  voitures: Car,
  "voitures-de-sport": CarFront,
  "voitures-de-luxe": CarFront,
  "voitures-de-collection": CarFront,
  hypercars: CarFront,
  "engins-agricoles": Tractor,
  chevaux: PawPrint,
  voiliers: Sailboat,
  "avions-legers": Plane,
  "avions-de-ligne": Plane,
  "avions-de-combat": Plane,
  helicopteres: Helicopter,
  cartes: Sparkles,
  "bandes-dessinees": BookOpen,
  timbres: Stamp,
  fossiles: Bone,
  peinture: Landmark,
  equipements: Volleyball,
  transferts: Trophy,
  "evenements-sportifs": Medal,
  clubs: Shield,
  lanceurs: Rocket,
  telescopes: Telescope,
  agences: Satellite,
  programmes: Rocket,
  stations: Satellite,
  "sous-marins": Anchor,
  "porte-avions": Ship,
  budgets: Shield,
  ferroviaire: TrainFront,
  metro: Bus,
  "gratte-ciel": Building,
  rachats: Handshake,
  fortunes: Crown,
  capitalisations: ChartLine,
  pib: Globe,
  dette: Banknote,
  monnaie: Euro,
};

const BY_CATEGORY: Record<string, LucideIcon> = {
  "alimentation-boissons": Apple,
  entreprises: Briefcase,
  "logiciels-abonnements": Tv,
};

export function iconFor(subcategory: string, category?: string): LucideIcon {
  return BY_SUBCATEGORY[subcategory] ?? (category ? BY_CATEGORY[category] : undefined) ?? Package;
}

/** Tuile pictogramme sur dégradé de la couleur du palier. */
export function Picto({
  subcategory,
  category,
  tier,
  size = 64,
  className,
}: {
  subcategory: string;
  category?: string;
  tier: TierId;
  size?: number;
  className?: string;
}) {
  // createElement : l'icône est un composant de module (stable), choisi par table.
  const icon = createElement(iconFor(subcategory, category), {
    strokeWidth: 1.5,
    style: { width: size * 0.46, height: size * 0.46 },
  });
  return (
    <span
      data-tier={tier}
      aria-hidden="true"
      className={cn("inline-grid shrink-0 place-items-center rounded-2xl bg-(--tier) text-white", className)}
      style={{ width: size, height: size }}
    >
      {icon}
    </span>
  );
}
