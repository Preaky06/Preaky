import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Duel", robots: { index: false } };

export default function Page() {
  return (
    <ComingSoon title="Duel" phase={4}>
      <p>Deux objets face à face et un rapport géant : « 1 Airbus A380 = N × baguettes ».</p>
    </ComingSoon>
  );
}
