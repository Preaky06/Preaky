import { notFound, redirect } from "next/navigation";
import { CommunityHeader } from "@/components/CommunityHeader";
import { Flash } from "@/components/Flash";
import { requireUser } from "@/lib/auth";
import { one, query } from "@/lib/db";
import { RECORD_KINDS, communityBySlug, isStaff, memberCount, roleIn } from "@/lib/data";
import { addRecord } from "@/app/actions";

export default async function CharacterPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug, id } = await params;
  const user = await requireUser();
  const community = await communityBySlug(slug);
  const role = await roleIn(community.id, user.id);
  if (!role) redirect(`/c/${slug}`);

  const character = await one<{
    id: string;
    user_id: string;
    first_name: string;
    last_name: string;
    birthdate: string;
    occupation: string;
    backstory: string;
    username: string;
  }>(
    `SELECT ch.*, u.username FROM characters ch JOIN users u ON u.id = ch.user_id
     WHERE ch.id = ? AND ch.community_id = ?`,
    [id, community.id],
  );
  if (!character) notFound();

  const staff = isStaff(role);
  const canSeeRecords = staff || character.user_id === user.id;
  const records = canSeeRecords
    ? await query<{
        id: string;
        kind: string;
        title: string;
        details: string;
        amount: number | null;
        created_at: string;
        author: string;
      }>(
        `SELECT r.id, r.kind, r.title, r.details, r.amount, r.created_at, u.username AS author
         FROM records r JOIN users u ON u.id = r.author_id WHERE r.character_id = ? ORDER BY r.created_at DESC`,
        [id],
      )
    : [];

  return (
    <>
      <CommunityHeader community={community} role={role} members={await memberCount(community.id)} />
      <Flash params={await searchParams} />

      <section className="card">
        <h2>
          {character.first_name} {character.last_name}
        </h2>
        <dl className="sheet">
          <dt>Joueur</dt>
          <dd>{character.username}</dd>
          <dt>Date de naissance</dt>
          <dd>{character.birthdate || "Non renseignée"}</dd>
          <dt>Métier</dt>
          <dd>{character.occupation || "Sans emploi"}</dd>
        </dl>
        {character.backstory && <p className="description">{character.backstory}</p>}
      </section>

      {canSeeRecords && (
        <section>
          <h2>Casier judiciaire</h2>
          {records.length === 0 ? (
            <p className="muted">Casier vierge.</p>
          ) : (
            <ul className="records">
              {records.map((r) => (
                <li key={r.id}>
                  <div>
                    <span className="badge">{r.kind}</span> <strong>{r.title}</strong>
                    {r.amount !== null && <span className="amount">{r.amount.toLocaleString("fr-FR")} $</span>}
                  </div>
                  {r.details && <p>{r.details}</p>}
                  <p className="muted">
                    {r.created_at.slice(0, 16)} UTC · par {r.author}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {staff && (
        <section className="card">
          <h2>Ajouter une entrée</h2>
          <form action={addRecord} className="form">
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="character_id" value={id} />
            <div className="row">
              <label>
                Type
                <select name="kind" defaultValue={RECORD_KINDS[0]}>
                  {RECORD_KINDS.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </label>
              <label>
                Montant ($, optionnel)
                <input type="number" name="amount" min={0} max={999999999} step={1} />
              </label>
            </div>
            <label>
              Motif
              <input type="text" name="title" required maxLength={120} />
            </label>
            <label>
              Détails
              <textarea name="details" rows={3} maxLength={2000} />
            </label>
            <button className="button" type="submit">
              Ajouter au casier
            </button>
          </form>
        </section>
      )}
    </>
  );
}
