import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { AuthFrame, LoginForm } from '@/components/auth-forms';

export const metadata = { title: 'Connexion' };
export const dynamic = 'force-dynamic';

export default async function Page() {
  if (await getUser()) redirect('/app');
  return (
    <AuthFrame title="Connexion" subtitle="Content de vous revoir." footer={<>Pas encore de compte ? <Link href="/inscription" className="font-semibold text-electric-700 hover:underline">Créer un compte gratuit</Link></>}>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthFrame>
  );
}
