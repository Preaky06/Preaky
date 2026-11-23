/** Chemin de retour après connexion : uniquement un chemin interne au site. */
export function safeNextParam(value: string | string[] | null | undefined): string {
  const next = Array.isArray(value) ? value[0] : value;
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/";
  return next;
}
