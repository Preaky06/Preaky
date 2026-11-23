import Link from "next/link";
import { logout } from "@/app/actions";
import { NavLinks } from "@/components/NavLinks";
import { getCurrentUser } from "@/lib/auth";

export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="ToonDex, accueil">
      <span className="logo-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className="logo-name">ToonDex</span>
    </Link>
  );
}

export async function Header() {
  const user = await getCurrentUser();
  return (
    <header className="site-header">
      <Logo />
      <NavLinks />
      <div className="site-header__user">
        {user ? (
          <>
            <span className="user-pill">
              <span className="user-pill__name">{user.pseudo}</span>
              <span className="shards" title="Éclats">
                <span className="shards__gem" aria-hidden="true" />
                {user.shards}
                <span className="sr-only"> éclats</span>
              </span>
            </span>
            <form action={logout}>
              <button type="submit" className="btn btn--ghost btn--sm">
                Déconnexion
              </button>
            </form>
          </>
        ) : (
          <Link href="/connexion" className="btn btn--ghost btn--sm">
            Se connecter
          </Link>
        )}
      </div>
    </header>
  );
}
