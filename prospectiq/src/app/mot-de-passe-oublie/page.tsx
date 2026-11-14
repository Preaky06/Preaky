import { Suspense } from 'react';
import Link from 'next/link';
import { AuthFrame, ForgotForm } from '@/components/auth-forms';

export const metadata = { title: 'Mot de passe oublié' };
export const dynamic = 'force-dynamic';

export default async function Page() {
  return (
    <AuthFrame title="Mot de passe oublié" subtitle="Indiquez votre e-mail : nous vous envoyons un lien pour en choisir un nouveau." footer={<><Link href="/connexion" className="font-semibold text-electric-700 hover:underline">Retour à la connexion</Link></>}>
      <Suspense>
        <ForgotForm />
      </Suspense>
    </AuthFrame>
  );
}
