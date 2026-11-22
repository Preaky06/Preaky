import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Explorer", robots: { index: false } };

export default function Page() {
  return (
    <ComingSoon title="Explorer" phase={2}>
      <p>Le catalogue complet : recherche instantanée tolérante aux fautes, histogramme des prix, filtres et liste virtualisée.</p>
    </ComingSoon>
  );
}
