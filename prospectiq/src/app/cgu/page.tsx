import { LegalPage } from '@/components/site';
import { PLANS } from '@/lib/plans';

export const metadata = { title: 'Conditions d’utilisation' };

export default function Page() {
  return (
    <LegalPage title="Conditions générales d’utilisation et de vente" updated="6 novembre 2026">
      <h2>1. Objet</h2>
      <p>ProspectIQ est un service en ligne de recherche, d’analyse et de suivi d’entreprises à des fins de prospection commerciale entre professionnels. Il est réservé aux professionnels agissant pour les besoins de leur activité.</p>

      <h2>2. Compte</h2>
      <p>L’utilisateur fournit des informations exactes et garde son mot de passe confidentiel. Il est responsable des actions réalisées depuis son compte et des membres qu’il invite.</p>

      <h2>3. Offres et prix</h2>
      <ul>
        {Object.values(PLANS).map((p) => (
          <li key={p.id}>
            {p.name} : {p.price ? `${p.price} € HT par mois` : 'gratuite'} — {p.prospects.toLocaleString('fr-FR')} prospects analysés et {p.aiMessages.toLocaleString('fr-FR')} messages générés par mois{p.seats > 1 ? `, ${p.seats} utilisateurs` : ''}.
          </li>
        ))}
      </ul>
      <p>Les quotas sont remis à zéro le premier jour de chaque mois civil et ne sont pas reportables. Une entreprise analysée n’est décomptée qu’une fois par mois.</p>

      <h2>4. Paiement, renouvellement, résiliation</h2>
      <p>Les abonnements sont payables mensuellement d’avance par carte via Stripe et renouvelés tacitement. L’utilisateur peut changer d’offre ou résilier à tout moment depuis la page Abonnement : la résiliation prend effet à la fin de la période en cours, sans remboursement de la période entamée. Un changement d’offre en cours de mois est calculé au prorata par Stripe. Si un paiement échoue et n’est pas régularisé après les relances de Stripe, l’abonnement est interrompu et le compte repasse en offre Découverte.</p>

      <h2>5. Nature des données et des analyses</h2>
      <p>Les informations proviennent de sources publiques et peuvent être incomplètes ou datées ; leur source et leur date sont indiquées. Le score est un indicateur d’opportunité calculé à partir des données disponibles, et non une garantie ni une probabilité de conversion. Les textes générés sont des propositions à relire avant tout envoi.</p>

      <h2>6. Usages interdits</h2>
      <ul>
        <li>Revendre ou republier en masse les données obtenues.</li>
        <li>Contacter des personnes ayant exprimé leur opposition, ou envoyer des messages trompeurs (notamment en prétendant une relation inexistante).</li>
        <li>Prospecter des consommateurs par e-mail sans leur consentement préalable.</li>
        <li>Automatiser l’accès au service, contourner les quotas ou les mesures de sécurité.</li>
      </ul>
      <p>Tout manquement peut entraîner la suspension du compte.</p>

      <h2>7. Responsabilité</h2>
      <p>L’utilisateur reste seul responsable de ses campagnes de prospection et du respect de la réglementation applicable (RGPD, Code des postes et des communications électroniques, Code de la consommation). La responsabilité de l’éditeur est limitée aux sommes versées au cours des douze derniers mois.</p>

      <h2>8. Données personnelles</h2>
      <p>
        Voir la <a href="/confidentialite">politique de confidentialité</a>.
      </p>

      <h2>9. Droit applicable</h2>
      <p>Les présentes conditions sont soumises au droit français. À défaut d’accord amiable, les tribunaux compétents du ressort du siège de l’éditeur sont seuls compétents.</p>
    </LegalPage>
  );
}
