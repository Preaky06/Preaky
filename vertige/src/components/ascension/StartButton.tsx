"use client";

import { ArrowDown } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import { Magnetic } from "@/components/ui/Magnetic";
import { scrollToElement } from "@/lib/lenis";

/** « Commencer l'ascension » : défile jusqu'au premier palier. Lien d'ancre sans JS. */
export function StartButton() {
  return (
    <Magnetic>
      <a
        href="#palier-poussiere"
        className={buttonClass("primary")}
        onClick={(e) => {
          const target = document.getElementById("palier-poussiere");
          if (!target) return;
          e.preventDefault();
          scrollToElement(target);
          history.replaceState(null, "", "#palier-poussiere");
        }}
      >
        Commencer l&apos;ascension
        <ArrowDown aria-hidden="true" strokeWidth={1.5} className="size-4" />
      </a>
    </Magnetic>
  );
}
