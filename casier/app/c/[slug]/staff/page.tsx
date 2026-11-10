import { redirect } from "next/navigation";
import { CommunityHeader } from "@/components/CommunityHeader";
import { Flash } from "@/components/Flash";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { communityBySlug, isStaff, memberCount, parseQuestions, roleIn } from "@/lib/data";
import { reviewApplication, setMemberRole, updateSettings } from "@/app/actions";

type Answer = { question: string; answer: string };
const ROLE_LABEL: Record<string, string> = { owner: "Fondateur", staff: "Staff", member: "Membre" };

function parseAnswers(raw: string): Answer[] {
  try {
    return JSON.parse(raw) as Answer[];
  } catch {
    return [];
  }
}

export default async function Staff({
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
  if (!isStaff(role)) redirect(`/c/${slug}`);

  const pending = await query<{ id: string; username: string; answers: string; created_at: string }>(
    `SELECT a.id, u.username, a.answers, a.created_at FROM applications a JOIN users u ON u.id = a.user_id
     WHERE a.community_id = ? AND a.status = 'pending' ORDER BY a.created_at`,
    [community.id],
  );
  const history = await query<{
    id: string;
    username: string;
    status: string;
    reviewer: string | null;
    discord_sync: string | null;
  }>(
    `SELECT a.id, u.username, a.status, r.username AS reviewer, a.discord_sync FROM applications a
     JOIN users u ON u.id = a.user_id LEFT JOIN users r ON r.id = a.reviewer_id
     WHERE a.community_id = ? AND a.status != 'pending' ORDER BY a.reviewed_at DESC LIMIT 20`,
    [community.id],
  );
  const members = await query<{ user_id: string; username: string; role: string }>(
    `SELECT m.user_id, u.username, m.role FROM memberships m JOIN users u ON u.id = m.user_id
     WHERE m.community_id = ? ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'staff' THEN 1 ELSE 2 END, u.username`,
    [community.id],
  );
  const inviteUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/c/${slug}`;

  return (
    <>
      <CommunityHeader community={community} role={role} members={await memberCount(community.id)} />
      <Flash params={await searchParams} />

      <p className="card">
        Lien de candidature à partager sur ton Discord : <code>{inviteUrl}</code>
      </p>

      <section>
        <h2>Candidatures en attente ({pending.length})</h2>
        {pending.length === 0 && <p className="muted">Rien à traiter.</p>}
        {pending.map((a) => (
          <article className="card" key={a.id}>
            <h3>{a.username}</h3>
            <dl className="answers">
              {parseAnswers(a.answers).map((qa, i) => (
                <div key={i}>
                  <dt>{qa.question}</dt>
                  <dd>{qa.answer}</dd>
                </div>
              ))}
            </dl>
            <form action={reviewApplication} className="form">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="application_id" value={a.id} />
              <label>
                Message au candidat (optionnel)
                <input type="text" name="note" maxLength={500} />
              </label>
              <div className="actions">
                <button className="button" type="submit" name="decision" value="accepted">
                  Accepter
                </button>
                <button className="button button-danger" type="submit" name="decision" value="rejected">
                  Refuser
                </button>
              </div>
            </form>
          </article>
        ))}
      </section>

      {history.length > 0 && (
        <section>
          <h2>Historique</h2>
          <ul className="list">
            {history.map((h) => (
              <li key={h.id}>
                <span>{h.username}</span>
                <span className="muted">
                  par {h.reviewer ?? "?"}
                  {h.discord_sync ? ` · rôle Discord : ${h.discord_sync}` : ""}
                </span>
                <span className={`badge badge-${h.status}`}>{h.status === "accepted" ? "Acceptée" : "Refusée"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2>Membres ({members.length})</h2>
        <ul className="list">
          {members.map((m) => (
            <li key={m.user_id}>
              <span>{m.username}</span>
              <span className="badge">{ROLE_LABEL[m.role]}</span>
              {role === "owner" && m.role !== "owner" && (
                <form action={setMemberRole}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="user_id" value={m.user_id} />
                  <button
                    className="link-button"
                    type="submit"
                    name="role"
                    value={m.role === "staff" ? "member" : "staff"}
                  >
                    {m.role === "staff" ? "Retirer du staff" : "Passer staff"}
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      {role === "owner" && (
        <section className="card">
          <h2>Réglages</h2>
          <form action={updateSettings} className="form">
            <input type="hidden" name="slug" value={slug} />
            <label>
              Description publique
              <textarea name="description" rows={3} maxLength={1000} defaultValue={community.description} />
            </label>
            <label>
              Questions de candidature (une par ligne, 10 maximum)
              <textarea
                name="questions"
                rows={6}
                required
                defaultValue={parseQuestions(community.questions).join("\n")}
              />
            </label>
            <div className="row">
              <label>
                ID du serveur Discord
                <input
                  type="text"
                  name="discord_guild_id"
                  inputMode="numeric"
                  defaultValue={community.discord_guild_id ?? ""}
                />
              </label>
              <label>
                ID du rôle à attribuer
                <input
                  type="text"
                  name="discord_role_id"
                  inputMode="numeric"
                  defaultValue={community.discord_role_id ?? ""}
                />
              </label>
            </div>
            <button className="button" type="submit">
              Enregistrer
            </button>
          </form>
        </section>
      )}
    </>
  );
}
