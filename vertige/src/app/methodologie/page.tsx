import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Méthodologie", robots: { index: false } };

export default function Page() {
  return (
    <ComingSoon title="Méthodologie" phase={6}>
      <p>Types de prix, sources, conversion des devises au taux BCE du jour du relevé, limites connues. En attendant : tous les prix de cette version sont des données de démonstration non sourcées (fiabilité C).</p>
    </ComingSoon>
  );
}
