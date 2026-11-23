import Link from "next/link";
import { Wobble } from "@/components/Wobble";

export default function NotFound() {
  return (
    <section className="auth">
      <h1 className="page-title">
        <Wobble text="Introuvable" />
      </h1>
      <p className="muted">Cette page n’existe pas, ou plus.</p>
      <Link href="/catalogue" className="btn btn--dark">
        Voir le catalogue
      </Link>
    </section>
  );
}
