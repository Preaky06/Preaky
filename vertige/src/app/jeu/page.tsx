import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Plus ou moins cher ?", robots: { index: false } };

export default function Page() {
  return (
    <ComingSoon title="Plus ou moins cher ?" phase={4}>
      <p>Deux cartes, une seule bonne réponse. Série, défi du jour et score à partager.</p>
    </ComingSoon>
  );
}
