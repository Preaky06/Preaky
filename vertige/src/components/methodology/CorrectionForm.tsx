"use client";

import { useState } from "react";

/**
 * Formulaire de correction. L'envoi vers la file de modération arrive en Phase 5 (/admin) :
 * en attendant, rien n'est transmis, et le formulaire le dit.
 */
export function CorrectionForm({ items }: { items: { slug: string; name: string }[] }) {
  const [done, setDone] = useState(false);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setDone(true);
      }}
      className="flex flex-col gap-4"
    >
      <label className="flex flex-col gap-1 text-small font-semibold text-muted">
        Objet concerné
        <select id="correction-objet" required defaultValue="" className="h-11 rounded-xl bg-elevated px-3 text-[15px] font-normal text-ink ring-1 ring-line">
          <option value="" disabled>
            Choisir un objet
          </option>
          {items.map((i) => (
            <option key={i.slug} value={i.slug}>
              {i.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-small font-semibold text-muted">
        Ce qui est faux, et la source qui le montre
        <textarea
          id="correction-message"
          required
          rows={4}
          placeholder="Ex. : le prix catalogue 2018 est de… selon…"
          className="rounded-xl bg-elevated p-3 text-[15px] font-normal text-ink ring-1 ring-line"
        />
      </label>
      <label className="flex flex-col gap-1 text-small font-semibold text-muted">
        Lien vers la source (facultatif)
        <input id="correction-source" type="url" placeholder="https://" className="h-11 rounded-xl bg-elevated px-3 text-[15px] font-normal text-ink ring-1 ring-line" />
      </label>
      <button type="submit" className="h-12 self-start rounded-full bg-ink px-6 font-semibold text-white">
        Préparer le signalement
      </button>
      {done && (
        <p role="status" className="rounded-2xl bg-brand-soft p-4 text-[15px]">
          Signalement prêt, mais pas encore transmis : la file de modération arrive avec l&apos;espace d&apos;administration (Phase 5).
        </p>
      )}
    </form>
  );
}
