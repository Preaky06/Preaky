import Link from "next/link";

export default function NotFound() {
  return (
    <section className="auth">
      <h1 className="page-title">Carte introuvable</h1>
      <p className="muted">Cette page n’existe pas, ou plus.</p>
      <Link href="/catalogue" className="btn btn--primary">
        Voir le catalogue
      </Link>
    </section>
  );
}
