import Link from "next/link";
import { logout } from "@/app/actions";
import { ArrowIcon } from "@/components/Cartoon";
import { NavLinks } from "@/components/NavLinks";
import { Wobble } from "@/components/Wobble";
import { getCurrentUser } from "@/lib/auth";

export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="ToonDex, accueil">
      <Wobble text="ToonDex" className="logo__word" />
      <span className="badge-star" aria-hidden="true" />
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
          <Link href="/connexion" className="btn btn--dark btn--sm">
            Se connecter
            <span className="btn__arrow">
              <ArrowIcon />
            </span>
          </Link>
        )}
      </div>
    </header>
  );
}
