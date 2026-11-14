import { LegalPage } from '@/components/site';
import { env } from '@/lib/env';

export const metadata = { title: 'Politique de confidentialité' };

export default function Page() {
  const l = env.legal;
  const who = l.company || 'l’éditeur indiqué dans les mentions légales';
  return (
    <LegalPage title="Politique de confidentialité" updated="6 novembre 2026">
      <p>
        Cette politique décrit les données personnelles traitées par Pro Spectre, édité par {who}, responsable de traitement. Elle concerne deux catégories de personnes : les <b>utilisateurs</b> du service, et les <b>personnes figurant dans les données d’entreprises</b> (dirigeants, entrepreneurs individuels, contacts professionnels publiés).
      </p>

      <h2>1. Utilisateurs du service</h2>
      <ul>
        <li><b>Données</b> : nom, adresse e-mail, mot de passe (stocké uniquement sous forme d’empreinte chiffrée), organisation, paramètres, prospects suivis, notes, messages générés, journal de connexion (date, adresse IP, navigateur), données de facturation.</li>
        <li><b>Finalités et bases légales</b> : fourniture du service et facturation (exécution du contrat) ; sécurité, prévention des abus et des fraudes (intérêt légitime) ; obligations comptables (obligation légale).</li>
        <li><b>Durée</b> : jusqu’à la suppression du compte ; sessions : 30 jours ; recherches non sauvegardées : 6 mois ; pièces comptables : 10 ans (obligation légale, conservées par le prestataire de paiement).</li>
        <li><b>Cookies</b> : un seul cookie strictement nécessaire (session de connexion). Aucun cookie publicitaire ni de mesure d’audience.</li>
      </ul>

      <h2>2. Personnes figurant dans les données d’entreprises</h2>
      <ul>
        <li><b>Source</b> : registres publics (répertoire SIRENE, Registre national des entreprises, BODACC) et pages publiques du site web de l’entreprise. Aucune donnée n’est obtenue par contournement de protections ni depuis les réseaux sociaux.</li>
        <li><b>Données</b> : dénomination (qui peut être le nom d’un entrepreneur individuel), adresse de l’établissement, nom et fonction des dirigeants publiés au registre, coordonnées professionnelles affichées publiquement par l’entreprise sur son site.</li>
        <li><b>Finalité</b> : permettre à des professionnels d’identifier des entreprises susceptibles d’être intéressées par leurs services (prospection B2B).</li>
        <li><b>Base légale</b> : intérêt légitime de Pro Spectre et de ses utilisateurs à la prospection commerciale entre professionnels, en lien avec l’activité professionnelle des personnes concernées.</li>
        <li><b>Minimisation</b> : seules les données utiles à la prospection sont conservées ; ni date de naissance, ni adresse personnelle, ni donnée sensible. Les entrepreneurs dont la fiche SIRENE porte la mention d’opposition à la prospection sont exclus automatiquement.</li>
        <li><b>Durée</b> : 12 mois après la dernière consultation, sauf si l’entreprise est suivie dans le CRM d’un utilisateur (jusqu’à son retrait ou la suppression du compte).</li>
      </ul>

      <h2>3. Destinataires et sous-traitants</h2>
      <p>Aucune donnée n’est vendue, louée ou cédée à des tiers. Seuls les prestataires ci-dessous la traitent, pour le compte de l’éditeur ; la liste de ceux réellement activés figure dans le <a href="/confiance#sous-traitants">centre de confiance</a>.</p>
      <ul>
        <li>Hébergement de l’application et de la base de données (voir mentions légales).</li>
        <li>Paiement : Stripe Payments Europe Ltd. (données de facturation ; Pro Spectre n’a jamais accès à votre numéro de carte).</li>
        <li>Envoi d’e-mails transactionnels : prestataire SMTP configuré par l’éditeur.</li>
        <li>Rédaction assistée par IA, si activée : fournisseur d’IA configuré par l’éditeur. Seules des informations sur l’entreprise (activité, constats sur son site, annonces officielles) lui sont transmises, jamais le nom des dirigeants.</li>
        <li>Note et avis Google, si activés : Google LLC (API Places), interrogée avec le nom et l’adresse de l’établissement.</li>
      </ul>
      <p>Certains prestataires peuvent être situés hors de l’Union européenne ; les transferts sont alors encadrés par les clauses contractuelles types de la Commission européenne ou le cadre de protection des données UE-États-Unis.</p>

      <h2>4. Vos droits</h2>
      <p>
        Vous disposez des droits d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité. Les utilisateurs peuvent télécharger leurs données et supprimer leur compte depuis la page Paramètres. Toute personne peut s’opposer au traitement des données la concernant ou de son entreprise via le <a href="/opposition">formulaire d’opposition</a>
        {l.email && (
          <>
            {' '}ou par e-mail à <a href={`mailto:${l.email}`}>{l.email}</a>
          </>
        )}
        . L’opposition entraîne l’effacement des données et l’exclusion durable des résultats. Une réponse est apportée dans un délai d’un mois.
      </p>
      <p>
        Vous pouvez introduire une réclamation auprès de la CNIL (<a href="https://www.cnil.fr/fr/plaintes" rel="noopener">cnil.fr</a>).
      </p>

      <h2>5. Sécurité</h2>
      <p>Mots de passe hachés (scrypt), connexions chiffrées (HTTPS), cookies de session protégés, limitation du nombre de tentatives, journalisation des accès aux sources de données, cloisonnement des données entre organisations.</p>

      <h2>6. Responsabilité des utilisateurs</h2>
      <p>Chaque utilisateur est responsable de l’usage qu’il fait des données pour sa propre prospection : respect du droit d’opposition des personnes contactées, mention de désinscription dans les e-mails, et prise en compte de la liste Bloctel pour tout démarchage téléphonique de consommateurs.</p>
    </LegalPage>
  );
}
