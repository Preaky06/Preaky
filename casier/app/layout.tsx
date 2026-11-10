import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { logout } from "./actions";
import "./globals.css";

export const metadata: Metadata = {
  title: "Casier — le back-office des communautés RP console",
  description:
    "Candidatures, fiches personnage et casier judiciaire pour les serveurs roleplay sur PS5 et Xbox, reliés à Discord.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="fr">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            <span className="brand-mark" aria-hidden="true">
              ▣
            </span>
            Casier
          </Link>
          <nav aria-label="Navigation principale">
            {user ? (
              <>
                <Link href="/dashboard">Mes communautés</Link>
                <form action={logout}>
                  <button className="link-button" type="submit">
                    Déconnexion ({user.username})
                  </button>
                </form>
              </>
            ) : (
              <Link href="/login" className="button button-small">
                Connexion
              </Link>
            )}
          </nav>
        </header>
        <main>{children}</main>
        <footer className="footer">
          Casier est un outil indépendant, sans affiliation avec un éditeur de jeux vidéo.
        </footer>
      </body>
    </html>
  );
}
