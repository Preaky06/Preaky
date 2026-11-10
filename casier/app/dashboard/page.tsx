import Link from "next/link";
import { Flash } from "@/components/Flash";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { PLATFORMS } from "@/lib/data";
import { createCommunity } from "../actions";

const ROLE_LABEL: Record<string, string> = { owner: "Fondateur", staff: "Staff", member: "Membre" };
const STATUS_LABEL: Record<string, string> = { pending: "En attente", accepted: "Acceptée", rejected: "Refusée" };

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const communities = await query<{ slug: string; name: string; platform: string; role: string }>(
    `SELECT c.slug, c.name, c.platform, m.role FROM memberships m
     JOIN communities c ON c.id = m.community_id WHERE m.user_id = ? ORDER BY c.name`,
    [user.id],
  );
  const applications = await query<{ slug: string; name: string; status: string; review_note: string | null }>(
    `SELECT c.slug, c.name, a.status, a.review_note FROM applications a
     JOIN communities c ON c.id = a.community_id WHERE a.user_id = ? ORDER BY a.created_at DESC LIMIT 20`,
    [user.id],
  );

  return (
    <>
      <h1>Mes communautés</h1>
      <Flash params={await searchParams} />

      {communities.length === 0 ? (
        <p className="muted">Tu n&apos;es membre d&apos;aucune communauté. Crée la tienne ci-dessous, ou ouvre le lien d&apos;invitation d&apos;un serveur pour candidater.</p>
      ) : (
        <ul className="list">
          {communities.map((c) => (
            <li key={c.slug}>
              <Link href={`/c/${c.slug}`}>{c.name}</Link>
              <span className="muted">{c.platform}</span>
              <span className="badge">{ROLE_LABEL[c.role]}</span>
            </li>
          ))}
        </ul>
      )}

      {applications.length > 0 && (
        <section>
          <h2>Mes candidatures</h2>
          <ul className="list">
            {applications.map((a, i) => (
              <li key={i}>
                <Link href={`/c/${a.slug}`}>{a.name}</Link>
                {a.review_note && <span className="muted">« {a.review_note} »</span>}
                <span className={`badge badge-${a.status}`}>{STATUS_LABEL[a.status]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2>Créer une communauté</h2>
        <form action={createCommunity} className="form">
          <label>
            Nom
            <input type="text" name="name" required minLength={3} maxLength={60} />
          </label>
          <label>
            Plateforme
            <select name="platform" defaultValue={PLATFORMS[0]}>
              {PLATFORMS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label>
            Description
            <textarea name="description" rows={3} maxLength={1000} />
          </label>
          <button className="button" type="submit">
            Créer
          </button>
        </form>
      </section>
    </>
  );
}
