import type { Metadata } from "next";
import { FicheViewer } from "@/components/objet/FicheViewer";
import { toFicheItem } from "@/components/objet/ObjetFiche";
import { getAllItems } from "@/lib/data/items";

export const metadata: Metadata = {
  title: "Fiche",
  robots: { index: false, follow: false },
};

/** Page technique de l'aperçu statique : toutes les fiches dans une seule page (#slug). */
export default async function ApercuFichePage() {
  const items = await getAllItems();
  return <FicheViewer items={items.map(toFicheItem)} />;
}
