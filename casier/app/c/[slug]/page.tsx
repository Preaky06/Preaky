import Link from "next/link";
import { CommunityHeader } from "@/components/CommunityHeader";
import { Flash } from "@/components/Flash";
import { currentUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { communityBySlug, memberCount, parseQuestions, roleIn } from "@/lib/data";
import { submitApplication } from "@/app/actions";

export default async function CommunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const community = await communityBySlug(slug);
  const user = await currentUser();
  const role = await roleIn(community.id, user?.id);
  const members = await memberCount(community.id);
  const pending =
    user && !role
      ? await one("SELECT 1 FROM applications WHERE community_id = ? AND user_id = ? AND status = 'pending'", [
          community.id,
          user.id,
        ])
      : null;
  const questions = parseQuestions(community.questions);

  return (
    <>
      <CommunityHeader community={community} role={role} members={members} />
      <Flash params={await searchParams} />
      {community.description && <p className="description">{community.description}</p>}

      {role ? (
        <p>
          Tu es membre de cette communauté. <Link href={`/c/${slug}/characters`}>Voir les personnages</Link>.
        </p>
      ) : !user ? (
        <p>
          <Link href="/login" className="button">
            Se connecter pour candidater
          </Link>
        </p>
      ) : pending ? (
        <p className="card">Ta candidature est en cours d&apos;examen par le staff.</p>
      ) : (
        <section className="card">
          <h2>Candidater</h2>
          <form action={submitApplication} className="form">
            <input type="hidden" name="slug" value={slug} />
            {questions.map((q, i) => (
              <label key={i}>
                {q}
                <textarea name={`q${i}`} rows={3} required maxLength={2000} />
              </label>
            ))}
            <button className="button" type="submit">
              Envoyer ma candidature
            </button>
          </form>
        </section>
      )}
    </>
  );
}
