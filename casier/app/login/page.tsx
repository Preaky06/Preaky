import { redirect } from "next/navigation";
import { Flash } from "@/components/Flash";
import { currentUser, devLoginEnabled } from "@/lib/auth";
import { devLogin } from "../actions";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (await currentUser()) redirect("/dashboard");
  return (
    <section className="narrow">
      <h1>Connexion</h1>
      <Flash params={await searchParams} />
      <a className="button button-discord" href="/api/auth/discord">
        Continuer avec Discord
      </a>
      {devLoginEnabled() && (
        <form action={devLogin} className="form dev-box">
          <p className="muted">Mode développement : connexion sans Discord.</p>
          <label>
            Pseudo
            <input type="text" name="name" required minLength={2} maxLength={32} />
          </label>
          <button className="button button-ghost" type="submit">
            Connexion de test
          </button>
        </form>
      )}
    </section>
  );
}
