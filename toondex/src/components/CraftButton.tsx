"use client";

import { useActionState } from "react";
import { craft, type CraftState } from "@/app/actions";

export function CraftButton({ workId, cost, canAfford }: { workId: string; cost: number; canAfford: boolean }) {
  const [state, action, pending] = useActionState<CraftState, FormData>(craft, undefined);
  return (
    <form action={action} className="craft">
      <input type="hidden" name="workId" value={workId} />
      <button type="submit" className="btn btn--craft btn--sm" disabled={!canAfford || pending}>
        <span className="shards__gem" aria-hidden="true" />
        {pending ? "Fabrication…" : `Fabriquer · ${cost}`}
      </button>
      {state?.error && (
        <span className="form-error small" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}
