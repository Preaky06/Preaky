import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { AuthFrame, RegisterForm } from '@/components/auth-forms';

export const metadata = { title: 'Créer un compte' };
export const dynamic = 'force-dynamic';

export default async function Page() {
  if (await getUser()) redirect('/app');
  return (
    <AuthFrame title="Créer un compte" subtitle="Gratuit, sans carte bancaire : 20 prospects analysés par mois pour découvrir." footer={<>Déjà inscrit ? <Link href="/connexion" className="font-semibold text-electric-700 hover:underline">Se connecter</Link></>}>
      <Suspense>
        <RegisterForm />
      </Suspense>
    </AuthFrame>
  );
}
