import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Budget", robots: { index: false } };

export default function Page() {
  return (
    <ComingSoon title="Budget" phase={4}>
      <p>Entre un montant, découvre tout ce qu’il permet de s’offrir.</p>
    </ComingSoon>
  );
}
