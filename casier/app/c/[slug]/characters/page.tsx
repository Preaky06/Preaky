import Link from "next/link";
import { redirect } from "next/navigation";
import { CommunityHeader } from "@/components/CommunityHeader";
import { Flash } from "@/components/Flash";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { communityBySlug, memberCount, roleIn } from "@/lib/data";
import { createCharacter } from "@/app/actions";

export default async function Characters({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const user = await requireUser();
  const community = await communityBySlug(slug);
  const role = await roleIn(community.id, user.id);
  if (!role) redirect(`/c/${slug}`);

  const characters = await query<{
    id: string;
    first_name: string;
    last_name: string;
    occupation: string;
    username: string;
  }>(
    `SELECT ch.id, ch.first_name, ch.last_name, ch.occupation, u.username FROM characters ch
     JOIN users u ON u.id = ch.user_id WHERE ch.community_id = ? ORDER BY ch.last_name, ch.first_name`,
    [community.id],
  );

  return (
    <>
      <CommunityHeader community={community} role={role} members={await memberCount(community.id)} />
      <Flash params={await searchParams} />
      <h2>Personnages</h2>
      {characters.length === 0 ? (
        <p className="muted">Aucun personnage pour l&apos;instant. Crée le premier.</p>
      ) : (
        <ul className="list">
          {characters.map((c) => (
            <li key={c.id}>
              <Link href={`/c/${slug}/characters/${c.id}`}>
                {c.first_name} {c.last_name}
              </Link>
              <span className="muted">{c.occupation || "Sans emploi"}</span>
              <span className="muted">joué par {c.username}</span>
            </li>
          ))}
        </ul>
      )}

      <section className="card">
        <h2>Nouveau personnage</h2>
        <form action={createCharacter} className="form">
          <input type="hidden" name="slug" value={slug} />
          <div className="row">
            <label>
              Prénom
              <input type="text" name="first_name" required maxLength={40} />
            </label>
            <label>
              Nom
              <input type="text" name="last_name" required maxLength={40} />
            </label>
          </div>
          <div className="row">
            <label>
              Date de naissance
              <input type="date" name="birthdate" />
            </label>
            <label>
              Métier
              <input type="text" name="occupation" maxLength={60} />
            </label>
          </div>
          <label>
            Histoire
            <textarea name="backstory" rows={4} maxLength={4000} />
          </label>
          <button className="button" type="submit">
            Créer le personnage
          </button>
        </form>
      </section>
    </>
  );
}
