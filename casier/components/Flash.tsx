type Params = Record<string, string | string[] | undefined>;

export function Flash({ params }: { params: Params }) {
  const pick = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const erreur = pick(params.erreur);
  const ok = pick(params.ok);
  if (!erreur && !ok) return null;
  return (
    <p className={erreur ? "flash flash-error" : "flash flash-ok"} role={erreur ? "alert" : "status"}>
      {erreur ?? ok}
    </p>
  );
}
