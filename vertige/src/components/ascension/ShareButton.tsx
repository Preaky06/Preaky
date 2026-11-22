"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";
import { buttonClass } from "@/components/ui/Button";
import { Magnetic } from "@/components/ui/Magnetic";
import { track } from "@/lib/analytics";

/** Partage natif (mobile) avec repli presse-papiers. */
export function ShareButton({ title, text, path = "/" }: { title: string; text: string; path?: string }) {
  const [copied, setCopied] = useState(false);

  const onClick = async () => {
    const url = new URL(path, window.location.origin).toString();
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        track({ name: "share", target: path, method: "native" });
      } catch {
        /* partage annulé */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      track({ name: "share", target: path, method: "clipboard" });
      setTimeout(() => setCopied(false), 2400);
    } catch {
      /* presse-papiers indisponible */
    }
  };

  return (
    <Magnetic>
      <button type="button" onClick={onClick} className={buttonClass("ghost")}>
        <Share2 aria-hidden="true" strokeWidth={1.5} className="size-4" />
        <span aria-live="polite">{copied ? "Lien copié" : "Partager"}</span>
      </button>
    </Magnetic>
  );
}
