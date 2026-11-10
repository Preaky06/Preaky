import Link from "next/link";
import { Flash } from "@/components/Flash";
import { FREE_MEMBER_LIMIT, PLATFORMS } from "@/lib/data";
import { joinWaitlist } from "./actions";

const FEATURES = [
  {
    title: "Candidatures et whitelist",
    text: "Un formulaire à tes questions, une file de candidatures pour le staff, et le rôle Discord attribué automatiquement à l'acceptation.",
  },
  {
    title: "Fiches personnage",
    text: "Identité, métier, histoire : chaque joueur tient la fiche de son personnage, consultable par toute la communauté.",
  },
  {
    title: "Casier judiciaire",
    text: "Amendes, arrestations, mandats, avertissements. L'historique de chaque personnage reste, même quand le staff change.",
  },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <>
      <section className="hero">
        <p className="eyebrow">Roleplay console · PS5 et Xbox</p>
        <h1>Ton serveur RP mérite mieux qu&apos;un Google Sheets.</h1>
        <p className="lead">
          Casier remplace les tableurs et les bots bricolés : candidatures, fiches personnage et casier
          judiciaire au même endroit, branchés sur ton Discord.
        </p>
        <div className="actions">
          <a href="#attente" className="button">
            Réserver l&apos;offre fondateur
          </a>
          <Link href="/login" className="button button-ghost">
            Essayer maintenant
          </Link>
        </div>
      </section>

      <section className="grid-3">
        {FEATURES.map((f) => (
          <article className="card" key={f.title}>
            <h2>{f.title}</h2>
            <p>{f.text}</p>
          </article>
        ))}
      </section>

      <section className="pricing">
        <h2>Tarifs</h2>
        <div className="grid-3">
          <article className="card">
            <h3>Gratuit</h3>
            <p className="price">0 €</p>
            <p>Jusqu&apos;à {FREE_MEMBER_LIMIT} membres. Toutes les fonctions de base.</p>
          </article>
          <article className="card card-accent">
            <h3>Fondateur</h3>
            <p className="price">
              9 €<span> / mois, à vie</span>
            </p>
            <p>Jusqu&apos;à 150 membres. Réservé aux inscrits de la liste d&apos;attente.</p>
          </article>
          <article className="card">
            <h3>Grande communauté</h3>
            <p className="price">
              39 €<span> / mois</span>
            </p>
            <p>Membres illimités, marque blanche, domaine personnalisé.</p>
          </article>
        </div>
      </section>

      <section className="waitlist" id="attente">
        <h2>Liste d&apos;attente</h2>
        <p className="muted">Laisse ton e-mail pour bloquer le tarif fondateur.</p>
        <Flash params={params} />
        <form action={joinWaitlist} className="form">
          <label>
            E-mail
            <input type="email" name="email" required autoComplete="email" placeholder="toi@exemple.fr" />
          </label>
          <label>
            Nom de ta communauté
            <input type="text" name="community" maxLength={100} />
          </label>
          <div className="row">
            <label>
              Plateforme
              <select name="platform" defaultValue={PLATFORMS[0]}>
                {PLATFORMS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label>
              Taille
              <select name="size" defaultValue="Moins de 30">
                <option>Moins de 30</option>
                <option>30 à 150</option>
                <option>Plus de 150</option>
                <option>Pas encore lancée</option>
              </select>
            </label>
          </div>
          <button className="button" type="submit">
            M&apos;inscrire
          </button>
        </form>
      </section>
    </>
  );
}
