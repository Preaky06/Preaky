import { LegalPage } from '@/components/site';
import { OppositionForm } from './form';

export const metadata = { title: 'Opposition et suppression de données' };

export default function Page() {
  return (
    <LegalPage title="Opposition et suppression de données" updated="6 novembre 2026">
      <p>
        Vous êtes dirigeant, entrepreneur ou salarié d’une entreprise présente dans ProspectIQ et ne souhaitez plus y figurer ? Indiquez le numéro SIREN de l’entreprise et/ou votre adresse e-mail professionnelle. Après vérification, les données sont effacées et l’entreprise ou l’adresse est exclue durablement des résultats.
      </p>
      <p>Les entreprises dont la fiche SIRENE comporte déjà la mention d’opposition à la prospection sont exclues automatiquement : vous n’avez rien à faire dans ce cas. Pour l’ajouter, adressez-vous à l’Insee ou au guichet des formalités des entreprises.</p>
      <OppositionForm />
    </LegalPage>
  );
}
