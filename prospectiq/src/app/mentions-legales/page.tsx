import { LegalPage } from '@/components/site';
import { env } from '@/lib/env';

export const metadata = { title: 'Mentions légales' };

const v = (x: string, label: string) => x || <mark className="rounded bg-amber-100 px-1">[{label} : à compléter]</mark>;

export default function Page() {
  const l = env.legal;
  return (
    <LegalPage title="Mentions légales" updated="6 novembre 2026">
      <h2>Éditeur du service</h2>
      <ul>
        <li>Raison sociale : {v(l.company, 'raison sociale ou nom de l’entrepreneur')}</li>
        <li>Forme juridique et capital : {v(l.form, 'forme juridique')}</li>
        <li>Adresse : {v(l.address, 'adresse du siège')}</li>
        <li>SIREN / RCS : {v(l.siren, 'numéro SIREN')}</li>
        {l.vat && <li>TVA intracommunautaire : {l.vat}</li>}
        <li>Directeur de la publication : {v(l.director, 'nom du responsable')}</li>
        <li>Contact : {l.email ? <a href={`mailto:${l.email}`}>{l.email}</a> : v('', 'adresse e-mail')}</li>
      </ul>
      <h2>Hébergement</h2>
      <ul>
        <li>Application : {l.host}</li>
        {l.dbHost && <li>Base de données : {l.dbHost}</li>}
      </ul>
      <h2>Sources des données d’entreprises</h2>
      <p>
        Les informations sur les entreprises proviennent de données publiques réutilisées sous Licence Ouverte / Etalab 2.0 : répertoire SIRENE de l’Insee et Registre national des entreprises (INPI), via l’API Recherche d’entreprises opérée par la Direction interministérielle du numérique (
        <a href="https://recherche-entreprises.api.gouv.fr" rel="noopener">recherche-entreprises.api.gouv.fr</a>), Bulletin officiel des annonces civiles et commerciales (BODACC, DILA) et Découpage administratif (geo.api.gouv.fr). La source et la date de collecte de chaque information sont indiquées sur les fiches.
      </p>
      <h2>Propriété intellectuelle</h2>
      <p>Les éléments du service (logiciel, textes, interface) sont protégés. Les données publiques citées restent soumises à leur licence d’origine.</p>
      <h2>Signaler un contenu</h2>
      <p>
        Pour signaler une erreur ou demander la suppression de données, utilisez le <a href="/opposition">formulaire dédié</a>.
      </p>
    </LegalPage>
  );
}
